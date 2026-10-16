// The public "Track your order" page, served inside the store's theme through
// Shopify's app proxy (storefront address /apps/track).
//
// Two rules for editing this file:
// - It is processed as Liquid, so never write two curly braces in a row, or a
//   brace followed by a percent sign, anywhere in the HTML, CSS or script.
// - Anything that comes from the server is added with textContent, never as
//   HTML, so tracking text can't inject markup.

export const TRACK_PAGE_HTML = String.raw`
<style>
  .trk { max-width: 720px; margin: 0 auto; padding: 32px 16px 64px; line-height: 1.5; }
  .trk * { box-sizing: border-box; }
  .trk h1 { margin: 0 0 8px; }
  .trk-sub { margin: 0 0 24px; opacity: .75; }
  .trk-card { border: 1px solid rgba(0,0,0,.14); border-radius: 14px; padding: 20px; background: rgba(0,0,0,.025); margin-bottom: 16px; }
  .trk-field { display: block; margin-bottom: 14px; }
  .trk-field span { display: block; font-weight: 600; margin-bottom: 6px; }
  .trk-field small { display: block; margin-top: 4px; opacity: .7; }
  .trk-field input { width: 100%; padding: 12px 14px; border: 1px solid rgba(0,0,0,.3); border-radius: 10px; font: inherit; background: #fff; color: #111; }
  .trk-btn { display: inline-block; padding: 12px 22px; border: 0; border-radius: 10px; background: #111; color: #fff; font: inherit; font-weight: 600; cursor: pointer; text-decoration: none; }
  .trk-btn[disabled] { opacity: .6; cursor: default; }
  .trk-btn.alt { background: transparent; color: inherit; border: 1px solid rgba(0,0,0,.3); }
  .trk-msg { margin: 16px 0; padding: 14px 16px; border-radius: 10px; border: 1px solid rgba(0,0,0,.14); background: rgba(0,0,0,.04); }
  .trk-msg.bad { border-color: #e0a0a0; background: #fbeeee; color: #6b1d1d; }
  .trk-msg.warn { border-color: #e6cf9a; background: #fdf6e3; color: #5c4510; }
  .trk-meta { opacity: .7; font-size: .9em; margin-bottom: 10px; }
  .trk-status { font-size: 1.4em; font-weight: 700; margin: 0 0 4px; }
  .trk-says { opacity: .7; margin: 0 0 18px; }
  .trk-steps { display: flex; margin: 0 0 20px; padding: 0; list-style: none; }
  .trk-steps li { flex: 1; text-align: center; font-size: .85em; opacity: .55; position: relative; padding-top: 22px; }
  .trk-steps li::before { content: ""; position: absolute; top: 5px; left: 50%; width: 12px; height: 12px; margin-left: -6px; border-radius: 50%; background: rgba(0,0,0,.25); z-index: 1; }
  .trk-steps li::after { content: ""; position: absolute; top: 10px; left: -50%; width: 100%; height: 2px; background: rgba(0,0,0,.2); }
  .trk-steps li:first-child::after { display: none; }
  .trk-steps li.done { opacity: 1; }
  .trk-steps li.done::before, .trk-steps li.done::after { background: #1a7f4b; }
  .trk-steps li.now { font-weight: 700; }
  .trk-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 16px; }
  .trk-fact { border: 1px solid rgba(0,0,0,.14); border-radius: 10px; padding: 10px 14px; background: #fff; color: #111; }
  .trk-fact b { display: block; }
  .trk-fact small { opacity: .65; }
  .trk-hist summary { cursor: pointer; font-weight: 600; margin-bottom: 10px; }
  .trk-ev { display: flex; gap: 12px; padding: 10px 0; border-top: 1px solid rgba(0,0,0,.1); }
  .trk-ev i { flex: none; width: 10px; height: 10px; margin-top: 7px; border-radius: 50%; background: rgba(0,0,0,.35); }
  .trk-ev b { display: block; }
  .trk-ev small { opacity: .7; }
  .trk-actions { margin-top: 14px; }
</style>

<div class="trk" id="trk">
  <h1>Track your order</h1>
  <p class="trk-sub">Enter your order number and the email or phone number you used at checkout. You don't need to sign in.</p>

  <form class="trk-card" id="trk-form" novalidate>
    <label class="trk-field">
      <span>Order number</span>
      <input id="trk-order" name="order" type="text" autocomplete="off" placeholder="For example TR-001392" required />
      <small>You'll find it in your order confirmation email.</small>
    </label>
    <label class="trk-field">
      <span>Email or phone number</span>
      <input id="trk-contact" name="contact" type="text" autocomplete="email" placeholder="The email or phone number on the order" required />
    </label>
    <button class="trk-btn" id="trk-go" type="submit">Track order</button>
  </form>

  <div id="trk-msg" role="status" aria-live="polite"></div>
  <div id="trk-out"></div>
</div>

<script>
(function () {
  var form = document.getElementById('trk-form');
  var orderEl = document.getElementById('trk-order');
  var contactEl = document.getElementById('trk-contact');
  var go = document.getElementById('trk-go');
  var msg = document.getElementById('trk-msg');
  var out = document.getElementById('trk-out');

  var STEPS = ['confirmed', 'shipped', 'out_for_delivery', 'delivered'];
  var STEP_LABEL = { confirmed: 'Confirmed', shipped: 'Shipped', out_for_delivery: 'Out for delivery', delivered: 'Delivered' };
  var STAGE_LABEL = {
    confirmed: 'Order confirmed', shipped: 'On its way', out_for_delivery: 'Out for delivery',
    delivered: 'Delivered', exception: 'Delivery issue', returning: 'Returning to sender',
    cancelled: 'Cancelled', unknown: 'Status update'
  };
  var NOTICE = {
    exception: "There's a problem with this delivery. See the latest update below, or contact us and we'll help.",
    returning: 'This parcel is on its way back to us.',
    cancelled: 'This shipment was cancelled.'
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function when(iso) {
    return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  function day(iso) {
    return new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
  }
  function say(text, kind) {
    msg.textContent = '';
    if (!text) return;
    msg.appendChild(el('div', 'trk-msg' + (kind ? ' ' + kind : ''), text));
  }
  function fact(label, value) {
    var f = el('div', 'trk-fact');
    f.appendChild(el('small', null, label));
    f.appendChild(el('b', null, value));
    return f;
  }

  function shipmentCard(s, index, total) {
    var card = el('div', 'trk-card');
    var t = s.tracking;
    var carrier = s.company || (t && t.carrier) || '';
    var head = [];
    if (total > 1) head.push('Shipment ' + index + ' of ' + total);
    if (carrier) head.push(carrier);
    head.push('Tracking number ' + s.number);
    card.appendChild(el('div', 'trk-meta', head.join(' · ')));

    if (t) {
      card.appendChild(el('p', 'trk-status', STAGE_LABEL[t.stage] || STAGE_LABEL.unknown));
      card.appendChild(el('p', 'trk-says', (carrier || 'The carrier') + ' says: ' + t.label));

      var at = STEPS.indexOf(t.stage);
      if (at >= 0) {
        var ol = el('ol', 'trk-steps');
        for (var i = 0; i < STEPS.length; i++) {
          var li = el('li', (i <= at ? 'done' : '') + (i === at ? ' now' : ''), STEP_LABEL[STEPS[i]]);
          ol.appendChild(li);
        }
        card.appendChild(ol);
      } else if (NOTICE[t.stage]) {
        card.appendChild(el('div', 'trk-msg ' + (t.stage === 'exception' ? 'bad' : ''), NOTICE[t.stage]));
      }

      var facts = el('div', 'trk-facts');
      if (t.estimatedDelivery && t.stage !== 'delivered') facts.appendChild(fact('Estimated delivery', day(t.estimatedDelivery)));
      if (t.lastUpdate) facts.appendChild(fact('Last updated', when(t.lastUpdate)));
      if (facts.childNodes.length) card.appendChild(facts);

      if (s.stale && s.syncedAt) {
        card.appendChild(el('div', 'trk-msg warn', "Live tracking isn't available right now. This is the last update we received, on " + when(s.syncedAt) + '.'));
      }

      if (t.events && t.events.length) {
        var det = el('details', 'trk-hist');
        det.appendChild(el('summary', null, 'Tracking history (' + t.events.length + ')'));
        t.events.forEach(function (e) {
          var row = el('div', 'trk-ev');
          row.appendChild(el('i'));
          var body = el('div');
          body.appendChild(el('b', null, e.label));
          if (e.description) body.appendChild(el('div', null, e.description));
          var line = [];
          if (e.location) line.push(e.location);
          if (e.at) line.push(when(e.at));
          if (line.length) body.appendChild(el('small', null, line.join(' · ')));
          row.appendChild(body);
          det.appendChild(row);
        });
        card.appendChild(det);
      }
    } else {
      card.appendChild(el('p', 'trk-status', "Live tracking isn't available right now"));
      card.appendChild(el('p', 'trk-says', 'Your parcel is with the carrier. Use the link below to see its latest status.'));
    }

    if (s.carrierUrl && /^https:\/\//i.test(s.carrierUrl)) {
      var wrap = el('div', 'trk-actions');
      var a = el('a', 'trk-btn alt', "Track on the carrier's website");
      a.href = s.carrierUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      wrap.appendChild(a);
      card.appendChild(wrap);
    }
    return card;
  }

  function show(shipments) {
    out.textContent = '';
    if (!shipments.length) {
      say("We found your order, but it has no tracking number yet. Please check again once it has shipped.", 'warn');
      return;
    }
    say('');
    shipments.forEach(function (s, i) { out.appendChild(shipmentCard(s, i + 1, shipments.length)); });
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    out.textContent = '';
    var order = orderEl.value.trim();
    var contact = contactEl.value.trim();
    if (!order || !contact) { say('Please enter your order number and the email or phone number on the order.', 'bad'); return; }
    go.disabled = true;
    go.textContent = 'Checking...';
    say('');
    fetch('/apps/track/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ order: order, contact: contact })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) { return { status: res.status, data: data }; });
    }).then(function (r) {
      if (r.status === 200 && r.data && r.data.shipments) return show(r.data.shipments);
      if (r.status === 404) return say("We couldn't find an order matching those details. Check the order number and the email or phone number used at checkout.", 'bad');
      if (r.status === 429) return say('Too many attempts. Please wait a few minutes and try again.', 'warn');
      if (r.status === 400) return say('Please enter your order number and the email or phone number on the order.', 'bad');
      say("Tracking isn't available right now. Please try again later.", 'warn');
    }).catch(function () {
      say("Tracking isn't available right now. Please try again later.", 'warn');
    }).then(function () {
      go.disabled = false;
      go.textContent = 'Track order';
    });
  });
})();
</script>
`;
