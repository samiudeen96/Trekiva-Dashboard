// The public "Track your order" page, served inside the store's theme through
// Shopify's app proxy (storefront address /apps/track).
//
// Two rules for editing this file:
// - It is processed as Liquid, so never write two curly braces in a row, or a
//   brace followed by a percent sign, anywhere in the HTML, CSS or script.
// - Anything that comes from the server is added with textContent, never as
//   HTML, so tracking text can't inject markup. The only innerHTML below is
//   for fixed icon strings that live in this file.

export const TRACK_PAGE_HTML = String.raw`
<style>
  .trk { max-width: 680px; margin: 0 auto; padding: 40px 16px 72px; line-height: 1.5; color: inherit; --ok: #1a7f4b; --bad: #c0392b; --warn: #b7791f; --mute: #6b7280; }
  .trk *, .trk *::before, .trk *::after { box-sizing: border-box; }
  .trk [hidden] { display: none !important; }
  .trk button { font: inherit; cursor: pointer; }
  /* focus is moved here after a lookup for screen readers; it is not a control, so no ring */
  .trk #trk-out:focus { outline: none; }

  /* header */
  .trk-hero { text-align: center; margin: 0 0 28px; }
  .trk-hero-ic { display: inline-flex; width: 56px; height: 56px; border-radius: 50%; align-items: center; justify-content: center; background: rgba(26,127,75,.12); color: var(--ok); margin-bottom: 14px; }
  .trk-hero-ic svg { width: 28px; height: 28px; }
  .trk h1.trk-title { margin: 0 0 8px; font-size: 2rem; font-weight: 700; line-height: 1.2; letter-spacing: -.01em; }
  .trk-sub { margin: 0 auto; max-width: 46ch; opacity: .72; }

  /* form */
  .trk-card { border: 1px solid rgba(0,0,0,.12); border-radius: 16px; padding: 22px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.04); margin-bottom: 18px; }
  .trk-field { display: block; margin-bottom: 16px; }
  .trk-field > span { display: block; font-weight: 600; margin-bottom: 6px; }
  .trk-field small { display: block; margin-top: 5px; opacity: .65; }
  .trk-field input { width: 100%; padding: 13px 14px; border: 1px solid rgba(0,0,0,.28); border-radius: 10px; font: inherit; background: #fff; color: #111; }
  .trk-field input:focus { outline: 3px solid rgba(26,127,75,.35); outline-offset: 1px; border-color: var(--ok); }
  .trk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 13px 24px; border: 1px solid #111; border-radius: 10px; background: #111; color: #fff; font-weight: 600; text-decoration: none; }
  .trk-btn:focus-visible, .trk-copy:focus-visible, .trk-hist summary:focus-visible { outline: 3px solid rgba(26,127,75,.5); outline-offset: 2px; }
  .trk-btn[disabled] { opacity: .6; cursor: default; }
  .trk-btn.alt { background: #fff; color: #111; border-color: rgba(0,0,0,.3); }
  .trk-form .trk-btn { width: 100%; }

  /* after a lookup */
  .trk-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; border: 1px solid rgba(0,0,0,.12); border-radius: 14px; padding: 12px 16px; background: rgba(0,0,0,.025); margin-bottom: 16px; }
  .trk-bar small { display: block; opacity: .65; }
  .trk-bar b { font-size: 1.1rem; }
  .trk-bar .trk-btn { padding: 9px 16px; }

  .trk-msg { margin: 0 0 16px; padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(0,0,0,.14); background: rgba(0,0,0,.04); }
  .trk-msg.bad { border-color: #e8b4ae; background: #fcefed; color: #6b1d1d; }
  .trk-msg.warn { border-color: #e6cf9a; background: #fdf6e3; color: #5c4510; }

  /* one parcel */
  .trk-ship { border-left: 6px solid var(--tone, var(--ok)); }
  .trk-ship.tone-bad { --tone: var(--bad); }
  .trk-ship.tone-warn { --tone: var(--warn); }
  .trk-ship.tone-mute { --tone: var(--mute); }
  .trk-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 10px; font-size: .9rem; margin: 0 0 16px; }
  .trk-pill { padding: 2px 10px; border-radius: 999px; background: rgba(0,0,0,.07); font-weight: 600; }
  .trk-num { opacity: .7; }
  .trk-copy { border: 1px solid rgba(0,0,0,.2); border-radius: 8px; background: #fff; color: #111; padding: 2px 10px; font-size: .85rem; }
  .trk-copy.done { color: var(--ok); border-color: var(--ok); }
  .trk-head { display: flex; align-items: center; gap: 14px; margin: 0 0 20px; }
  .trk-ic { flex: none; display: inline-flex; width: 48px; height: 48px; border-radius: 50%; align-items: center; justify-content: center; background: var(--tone, var(--ok)); color: #fff; }
  .trk-ic svg { width: 24px; height: 24px; }
  .trk-status { margin: 0; font-size: 1.5rem; font-weight: 700; line-height: 1.2; }
  .trk-says { margin: 2px 0 0; opacity: .7; }

  /* steps */
  .trk-steps { display: grid; grid-template-columns: repeat(4, 1fr); margin: 4px 0 24px; padding: 0; list-style: none; }
  .trk-steps li { position: relative; text-align: center; padding-top: 46px; font-size: .86em; line-height: 1.3; color: rgba(0,0,0,.5); }
  .trk-steps .dot { position: absolute; top: 0; left: 50%; width: 34px; height: 34px; margin-left: -17px; border-radius: 50%; background: #fff; border: 2px solid rgba(0,0,0,.2); display: flex; align-items: center; justify-content: center; z-index: 1; color: #fff; }
  .trk-steps .dot svg { width: 18px; height: 18px; display: block; }
  .trk-steps li + li::before { content: ""; position: absolute; top: 15px; left: -50%; width: 100%; height: 4px; border-radius: 2px; background: rgba(0,0,0,.12); }
  .trk-steps li.done::before { background: var(--ok); }
  .trk-steps li.done { color: inherit; }
  .trk-steps li.done .dot { background: var(--ok); border-color: var(--ok); }
  .trk-steps li.now:not(.fin) .dot { box-shadow: 0 0 0 5px rgba(26,127,75,.18); animation: trkPulse 2s ease-out infinite; }
  @keyframes trkPulse { 0% { box-shadow: 0 0 0 0 rgba(26,127,75,.4); } 100% { box-shadow: 0 0 0 11px rgba(26,127,75,0); } }
  @media (prefers-reduced-motion: reduce) { .trk-steps li.now:not(.fin) .dot { animation: none; } .trk-skel i { animation: none; } }
  .trk-steps .lab { display: block; font-weight: 600; }
  .trk-steps li.now .lab { font-weight: 800; }
  .trk-steps .dt { display: block; margin-top: 2px; opacity: .65; font-size: .92em; }

  /* latest update + facts */
  .trk-latest { border-radius: 12px; background: rgba(0,0,0,.04); padding: 14px 16px; margin: 0 0 14px; }
  .trk-latest small { display: block; opacity: .65; }
  .trk-latest b { display: block; font-size: 1.05rem; margin-top: 2px; }
  .trk-latest span { display: block; }
  .trk-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin: 0 0 14px; }
  .trk-fact { border: 1px solid rgba(0,0,0,.12); border-radius: 12px; padding: 12px 14px; background: #fff; color: #111; }
  .trk-fact small { display: block; opacity: .65; }
  .trk-fact b { display: block; font-size: 1.05rem; margin-top: 2px; }

  /* timeline */
  .trk-hist summary { cursor: pointer; font-weight: 600; padding: 10px 0; }
  .trk-tl { list-style: none; margin: 4px 0 0; padding: 0; }
  .trk-tl li { position: relative; padding: 0 0 18px 28px; }
  .trk-tl li::before { content: ""; position: absolute; left: 5px; top: 14px; bottom: -4px; width: 2px; background: rgba(0,0,0,.14); }
  .trk-tl li:last-child::before { display: none; }
  .trk-tl li::after { content: ""; position: absolute; left: 0; top: 5px; width: 12px; height: 12px; border-radius: 50%; background: #fff; border: 2px solid rgba(0,0,0,.3); }
  .trk-tl li:first-child::after { background: var(--tone, var(--ok)); border-color: var(--tone, var(--ok)); }
  .trk-tl b { display: block; }
  .trk-tl small { opacity: .65; display: block; }
  .trk-actions { margin-top: 16px; }

  /* loading */
  .trk-skel { display: grid; gap: 12px; }
  .trk-skel i { display: block; height: 18px; border-radius: 8px; background: linear-gradient(90deg, rgba(0,0,0,.06), rgba(0,0,0,.12), rgba(0,0,0,.06)); background-size: 200% 100%; animation: trkShimmer 1.2s linear infinite; }
  .trk-skel i:nth-child(1) { width: 40%; height: 26px; } .trk-skel i:nth-child(2) { width: 70%; } .trk-skel i:nth-child(3) { width: 100%; height: 56px; }
  @keyframes trkShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

  @media (max-width: 480px) {
    .trk { padding-top: 24px; }
    .trk h1.trk-title { font-size: 1.6rem; }
    .trk-card { padding: 16px; }
    .trk-steps li { font-size: .78em; }
    .trk-status { font-size: 1.3rem; }
  }
</style>

<div class="trk" id="trk">
  <header class="trk-hero">
    <span class="trk-hero-ic" id="trk-hero-ic" aria-hidden="true"></span>
    <h1 class="trk-title">Track your order</h1>
    <p class="trk-sub">Enter your order number and the email or phone number you used at checkout. You don't need to sign in.</p>
  </header>

  <form class="trk-card trk-form" id="trk-form" novalidate>
    <label class="trk-field">
      <span>Order number</span>
      <input id="trk-order" name="order" type="text" autocomplete="off" autocapitalize="characters" placeholder="For example TR-001392" required />
      <small>You'll find it in your order confirmation email.</small>
    </label>
    <label class="trk-field">
      <span>Email or phone number</span>
      <input id="trk-contact" name="contact" type="text" autocomplete="email" placeholder="The email or phone number on the order" required />
    </label>
    <button class="trk-btn" id="trk-go" type="submit">Track order</button>
  </form>

  <div class="trk-bar" id="trk-bar" hidden>
    <div><small>Showing order</small><b id="trk-bar-order"></b></div>
    <button class="trk-btn alt" id="trk-again" type="button">Track another order</button>
  </div>

  <div id="trk-msg" role="status" aria-live="polite"></div>
  <div id="trk-out" tabindex="-1"></div>
</div>

<script>
(function () {
  var form = document.getElementById('trk-form');
  var orderEl = document.getElementById('trk-order');
  var contactEl = document.getElementById('trk-contact');
  var go = document.getElementById('trk-go');
  var bar = document.getElementById('trk-bar');
  var barOrder = document.getElementById('trk-bar-order');
  var again = document.getElementById('trk-again');
  var msg = document.getElementById('trk-msg');
  var out = document.getElementById('trk-out');
  var STORE_KEY = 'trk.pass.v1';

  var STEPS = ['confirmed', 'shipped', 'out_for_delivery', 'delivered'];
  var STEP_LABEL = { confirmed: 'Confirmed', shipped: 'Shipped', out_for_delivery: 'Out for delivery', delivered: 'Delivered' };
  var STAGE_LABEL = {
    confirmed: 'Order confirmed', shipped: 'On its way', out_for_delivery: 'Out for delivery',
    delivered: 'Delivered', exception: 'Delivery issue', returning: 'Returning to sender',
    cancelled: 'Cancelled', unknown: 'Status update'
  };
  var STAGE_TONE = { exception: 'bad', returning: 'warn', cancelled: 'mute', unknown: 'mute' };
  var NOTICE = {
    exception: "There's a problem with this delivery. See the latest update below, or contact us and we'll help.",
    returning: 'This parcel is on its way back to us.',
    cancelled: 'This shipment was cancelled.'
  };

  var SVG_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  var ICON = {
    check: SVG_OPEN + '<path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    confirmed: SVG_OPEN + '<path d="M7 4h10v16H7z M10 9h4 M10 13h4"/></svg>',
    shipped: SVG_OPEN + '<path d="M3 7h11v9H3z M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>',
    out_for_delivery: SVG_OPEN + '<path d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    delivered: SVG_OPEN + '<path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    exception: SVG_OPEN + '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5 M12 16.5v.5"/></svg>',
    returning: SVG_OPEN + '<path d="M9 8L4 13l5 5 M4 13h10a6 6 0 010 12" transform="translate(0 -5)"/></svg>',
    cancelled: SVG_OPEN + '<circle cx="12" cy="12" r="9"/><path d="M8.5 8.5l7 7 M15.5 8.5l-7 7"/></svg>',
    unknown: SVG_OPEN + '<circle cx="12" cy="12" r="9"/><path d="M12 11v6 M12 7.5v.5"/></svg>'
  };
  // These icons are fixed strings in this file, never server data.
  document.getElementById('trk-hero-ic').innerHTML = ICON.shipped;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function when(iso) {
    return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  function etaDay(iso) {
    return new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  function shortDay(iso) {
    return new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });
  }
  // The earliest event the carrier reported for a step, or null. Events are newest first.
  function stepDate(events, step) {
    var found = null;
    for (var k = 0; k < (events || []).length; k++) {
      if (events[k].stage === step && events[k].at) found = events[k].at;
    }
    return found;
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

  /* what the browser remembers for a refresh: the order number and a signed pass, never the email or phone */
  function saveState(order, token) {
    try { window.sessionStorage.setItem(STORE_KEY, JSON.stringify({ order: order, token: token })); } catch (e) { /* storage may be blocked */ }
  }
  function loadState() {
    try { return JSON.parse(window.sessionStorage.getItem(STORE_KEY) || 'null'); } catch (e) { return null; }
  }
  function clearState() {
    try { window.sessionStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
  }
  function setUrl(order) {
    try {
      var url = window.location.pathname + (order ? '?order=' + encodeURIComponent(order) : '');
      window.history.replaceState(null, '', url);
    } catch (e) { /* not allowed here, fine */ }
  }

  function copyButton(text) {
    var b = el('button', 'trk-copy', 'Copy');
    b.type = 'button';
    b.setAttribute('aria-label', 'Copy tracking number');
    b.addEventListener('click', function () {
      function done() { b.textContent = 'Copied'; b.className = 'trk-copy done'; setTimeout(function () { b.textContent = 'Copy'; b.className = 'trk-copy'; }, 1800); }
      try {
        window.navigator.clipboard.writeText(text).then(done, function () {});
      } catch (e) { /* clipboard not available */ }
    });
    return b;
  }

  function stepper(t, at) {
    var ol = el('ol', 'trk-steps');
    var last = STEPS.length - 1;
    for (var i = 0; i < STEPS.length; i++) {
      var finished = i < at || (i === at && at === last);
      var li = el('li', (i <= at ? 'done' : '') + (i === at ? ' now' : '') + (i === at && at === last ? ' fin' : ''));
      var dot = el('span', 'dot');
      dot.innerHTML = finished ? ICON.check : (i === at ? ICON[STEPS[i]] : '');
      li.appendChild(dot);
      li.appendChild(el('span', 'lab', STEP_LABEL[STEPS[i]]));
      if (i <= at) {
        var d = stepDate(t.events, STEPS[i]);
        if (d) li.appendChild(el('span', 'dt', shortDay(d)));
      }
      ol.appendChild(li);
    }
    return ol;
  }

  function shipmentCard(s, index, total) {
    var t = s.tracking;
    var stage = t ? t.stage : 'unknown';
    var tone = STAGE_TONE[stage] || 'ok';
    var card = el('div', 'trk-card trk-ship tone-' + tone);
    var carrier = s.company || (t && t.carrier) || '';

    if (total > 1) card.appendChild(el('p', 'trk-num', 'Shipment ' + index + ' of ' + total));
    var meta = el('div', 'trk-meta');
    if (carrier) meta.appendChild(el('span', 'trk-pill', carrier));
    meta.appendChild(el('span', 'trk-num', 'Tracking number ' + s.number));
    meta.appendChild(copyButton(s.number));
    card.appendChild(meta);

    var head = el('div', 'trk-head');
    var ic = el('span', 'trk-ic');
    ic.innerHTML = ICON[t ? stage : 'unknown'] || ICON.unknown;
    head.appendChild(ic);
    var words = el('div');
    if (t) {
      words.appendChild(el('p', 'trk-status', STAGE_LABEL[stage] || STAGE_LABEL.unknown));
      words.appendChild(el('p', 'trk-says', (carrier || 'The carrier') + ' says: ' + t.label));
    } else {
      words.appendChild(el('p', 'trk-status', "Live tracking isn't available right now"));
      words.appendChild(el('p', 'trk-says', 'Your parcel is with the carrier. Use the button below to see its latest status.'));
    }
    head.appendChild(words);
    card.appendChild(head);

    if (t) {
      var at = STEPS.indexOf(stage);
      if (at >= 0) {
        card.appendChild(stepper(t, at));
      } else if (NOTICE[stage]) {
        card.appendChild(el('div', 'trk-msg ' + (stage === 'exception' ? 'bad' : ''), NOTICE[stage]));
      }

      var latest = t.events && t.events[0];
      if (latest) {
        var box = el('div', 'trk-latest');
        box.appendChild(el('small', null, 'Latest update'));
        box.appendChild(el('b', null, latest.label));
        if (latest.description) box.appendChild(el('span', null, latest.description));
        var where = [];
        if (latest.location) where.push(latest.location);
        if (latest.at) where.push(when(latest.at));
        if (where.length) box.appendChild(el('small', null, where.join(' · ')));
        card.appendChild(box);
      }

      var facts = el('div', 'trk-facts');
      if (t.estimatedDelivery && stage !== 'delivered') facts.appendChild(fact('Estimated delivery', etaDay(t.estimatedDelivery)));
      if (t.lastUpdate) facts.appendChild(fact('Last updated', when(t.lastUpdate)));
      if (facts.childNodes.length) card.appendChild(facts);

      if (s.stale && s.syncedAt) {
        card.appendChild(el('div', 'trk-msg warn', "Live tracking isn't available right now. This is the last update we received, on " + when(s.syncedAt) + '.'));
      }

      if (t.events && t.events.length) {
        var det = el('details', 'trk-hist');
        det.appendChild(el('summary', null, 'Full tracking history (' + t.events.length + ')'));
        var ul = el('ul', 'trk-tl');
        t.events.forEach(function (e) {
          var li = el('li');
          li.appendChild(el('b', null, e.label));
          if (e.description) li.appendChild(el('span', null, e.description));
          var line = [];
          if (e.location) line.push(e.location);
          if (e.at) line.push(when(e.at));
          if (line.length) li.appendChild(el('small', null, line.join(' · ')));
          ul.appendChild(li);
        });
        det.appendChild(ul);
        card.appendChild(det);
      }
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

  function showForm(prefillOrder) {
    form.hidden = false;
    bar.hidden = true;
    out.textContent = '';
    if (prefillOrder !== undefined) orderEl.value = prefillOrder;
  }
  function showResult(data) {
    out.textContent = '';
    form.hidden = true;
    bar.hidden = false;
    barOrder.textContent = data.order || '';
    if (!data.shipments.length) {
      say('We found your order, but it has no tracking number yet. Please check again once it has shipped.', 'warn');
      return;
    }
    say('');
    data.shipments.forEach(function (s, i) { out.appendChild(shipmentCard(s, i + 1, data.shipments.length)); });
    try { out.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function showSkeleton() {
    out.textContent = '';
    var card = el('div', 'trk-card trk-skel');
    card.setAttribute('aria-hidden', 'true');
    card.appendChild(el('i')); card.appendChild(el('i')); card.appendChild(el('i'));
    out.appendChild(card);
  }

  function lookup(body, restoring) {
    go.disabled = true;
    go.textContent = 'Checking...';
    say('');
    showSkeleton();
    fetch('/apps/track/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) { return { status: res.status, data: data }; });
    }).then(function (r) {
      if (r.status === 200 && r.data && r.data.shipments) {
        if (r.data.token) saveState(r.data.order, r.data.token);
        setUrl(r.data.order);
        return showResult(r.data);
      }
      // anything that isn't a result: show the form again, with a message
      var keepOrder = body.order || '';
      if (restoring) clearState();
      showForm(keepOrder);
      if (r.status === 401) return say('Your last search has expired. Please enter your details again.', 'warn');
      if (r.status === 404) return say("We couldn't find an order matching those details. Check the order number and the email or phone number used at checkout.", 'bad');
      if (r.status === 429) return say('Too many attempts. Please wait a few minutes and try again.', 'warn');
      if (r.status === 400) return say('Please enter your order number and the email or phone number on the order.', 'bad');
      say("Tracking isn't available right now. Please try again later.", 'warn');
    }).catch(function () {
      if (restoring) clearState();
      showForm(body.order || '');
      say("Tracking isn't available right now. Please try again later.", 'warn');
    }).then(function () {
      go.disabled = false;
      go.textContent = 'Track order';
    });
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var order = orderEl.value.trim();
    var contact = contactEl.value.trim();
    if (!order || !contact) { say('Please enter your order number and the email or phone number on the order.', 'bad'); return; }
    lookup({ order: order, contact: contact }, false);
  });

  again.addEventListener('click', function () {
    clearState();
    setUrl('');
    say('');
    contactEl.value = '';
    showForm('');
    orderEl.focus();
  });

  /* on load: bring back the last result after a refresh, or prefill the order number */
  var params = null;
  try { params = new URLSearchParams(window.location.search); } catch (e) { params = null; }
  var fromUrl = params ? (params.get('order') || '') : '';
  var saved = loadState();
  if (fromUrl) orderEl.value = fromUrl;
  if (saved && saved.order && saved.token && (!fromUrl || fromUrl.toUpperCase() === String(saved.order).toUpperCase())) {
    lookup({ order: saved.order, token: saved.token }, true);
  }
})();
</script>
`;
