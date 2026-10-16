// The public "Track your order" page, served inside the store's theme through
// Shopify's app proxy (storefront address /apps/track).
//
// Two rules for editing this file:
// - It is processed as Liquid, so never write two curly braces in a row, or a
//   brace followed by a percent sign, anywhere in the HTML, CSS or script.
//   Also avoid dollar-brace, which would be read as a template placeholder here.
// - Anything that comes from the server is added with textContent, never as
//   HTML, so tracking text can't inject markup. The only innerHTML below is
//   for fixed icon strings that live in this file.

export const TRACK_PAGE_HTML = String.raw`
<style>
  /* One calm surface: space and hairlines instead of boxes. */
  .trk { max-width: 620px; margin: 0 auto; padding: 56px 20px 96px; line-height: 1.55; color: inherit;
    --ink: #111; --muted: rgba(17,17,17,.62); --line: rgba(17,17,17,.09); --fill: rgba(17,17,17,.05);
    /* --ok is the accent (ink): progress line, steps, pill, icon. --done is the colour of the Delivered moment (deep teal). Change them here to re-colour the page. */
    --ok: #111111; --done: #0f766e; --bad: #c0392b; --warn: #b7791f; --mute: #6b7280; --tone: var(--ok); }
  .trk *, .trk *::before, .trk *::after { box-sizing: border-box; }
  .trk [hidden] { display: none !important; }
  .trk button { font: inherit; cursor: pointer; }
  .trk #trk-out:focus { outline: none; }
  .trk .num { font-variant-numeric: tabular-nums; }

  /* header */
  .trk-hero { text-align: center; margin: 0 0 36px; }
  .trk-hero-ic { display: inline-block; color: var(--ok); margin-bottom: 10px; }
  .trk-hero-ic svg { width: 34px; height: 34px; display: block; }
  .trk h1.trk-title { margin: 0 0 10px; font-size: 2.25rem; font-weight: 700; line-height: 1.12; letter-spacing: -.02em; }
  .trk-sub { margin: 0 auto; max-width: 42ch; color: var(--muted); }

  /* form: filled fields, no outlines */
  .trk-form { margin: 0 0 8px; }
  .trk-field { display: block; margin-bottom: 18px; }
  .trk-field > span { display: block; font-size: .8rem; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
  .trk-field small { display: block; margin-top: 7px; color: var(--muted); font-size: .85rem; }
  .trk-field input { width: 100%; height: 54px; padding: 0 18px; border: 0; border-radius: 14px; background: var(--fill); color: var(--ink); font: inherit; font-size: 1rem; transition: background .2s ease, box-shadow .2s ease; }
  .trk-field input::placeholder { color: rgba(17,17,17,.4); }
  .trk-field input:hover { background: rgba(17,17,17,.07); }
  .trk-field input:focus { outline: none; background: #fff; box-shadow: 0 0 0 2px var(--ink); }
  .trk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 54px; padding: 0 28px; border: 0; border-radius: 999px; background: var(--ink); color: #fff; font-weight: 600; font-size: 1rem; text-decoration: none; transition: transform .15s ease, box-shadow .2s ease, background .2s ease; }
  .trk-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(0,0,0,.18); }
  .trk-btn:active { transform: translateY(0) scale(.99); box-shadow: none; }
  .trk-btn:focus-visible, .trk-link:focus-visible, .trk-toggle:focus-visible, .trk-copy:focus-visible, .trk-again:focus-visible { outline: none; box-shadow: 0 0 0 2px color-mix(in srgb, var(--ok) 60%, transparent); }
  .trk-btn[disabled] { opacity: .6; cursor: default; transform: none; box-shadow: none; }
  .trk-form .trk-btn { width: 100%; margin-top: 4px; }

  /* messages: a tint, never a border */
  .trk-msg { margin: 0 0 22px; padding: 14px 18px; border-radius: 14px; background: var(--fill); }
  .trk-msg.bad { background: #fbeceb; color: #7a1f17; }
  .trk-msg.warn { background: #fdf3df; color: #6b4a0e; }

  /* top row after a lookup */
  .trk-bar { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin: 0 0 28px; }
  .trk-bar small { color: var(--muted); margin-right: 8px; }
  .trk-bar b { font-size: 1rem; }
  .trk-again { border: 0; background: none; color: var(--ink); font-weight: 600; text-decoration: underline; text-underline-offset: 4px; padding: 6px 8px; margin: -6px -8px; border-radius: 8px; }
  .trk-again:hover { text-decoration-thickness: 2px; }

  /* one parcel */
  .trk-sheet { animation: trkIn .45s cubic-bezier(.2,.7,.2,1) both; }
  .trk-sheet + .trk-sheet { margin-top: 48px; padding-top: 48px; border-top: 1px solid var(--line); }
  .trk-sheet.tone-done { --ok: var(--done); --tone: var(--done); }
  .trk-sheet.tone-bad { --tone: var(--bad); }
  .trk-sheet.tone-warn { --tone: var(--warn); }
  .trk-sheet.tone-mute { --tone: var(--mute); }
  @keyframes trkIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  .trk-part { margin: 0 0 14px; font-size: .85rem; color: var(--muted); }
  .trk-pill { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px 6px 12px; border-radius: 999px; font-size: .88rem; font-weight: 600; color: var(--tone); background: var(--fill); background: color-mix(in srgb, var(--tone) 12%, transparent); }
  .trk-pill i { width: 8px; height: 8px; border-radius: 50%; background: var(--tone); }
  .trk-pill.live i { animation: trkBlink 1.8s ease-in-out infinite; }
  @keyframes trkBlink { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
  .trk h2.trk-headline { margin: 16px 0 6px; font-size: 2rem; font-weight: 700; line-height: 1.15; letter-spacing: -.02em; }
  .trk .trk-sheet.tone-bad h2.trk-headline { color: var(--bad); }
  .trk-lede { margin: 0 0 34px; color: var(--muted); }

  /* steps: one thin line that draws itself */
  .trk-steps { display: grid; grid-template-columns: repeat(4, 1fr); margin: 0 0 36px; padding: 0; list-style: none; }
  .trk-steps li { position: relative; text-align: center; padding-top: 42px; font-size: .86rem; line-height: 1.3; color: var(--muted); }
  .trk-steps .dot { position: absolute; top: 0; left: 50%; width: 28px; height: 28px; margin-left: -14px; border-radius: 50%; background: #fff; box-shadow: inset 0 0 0 2px rgba(17,17,17,.18); display: flex; align-items: center; justify-content: center; z-index: 1; color: #fff; transition: background .3s ease; }
  .trk-steps .dot svg { width: 15px; height: 15px; display: block; }
  .trk-steps li + li::before, .trk-steps li + li::after { content: ""; position: absolute; top: 13px; left: -50%; width: 100%; height: 3px; border-radius: 3px; }
  .trk-steps li + li::before { background: var(--line); }
  .trk-steps li + li::after { background: var(--ok); transform: scaleX(0); transform-origin: left; }
  .trk-steps li.done::after { animation: trkDraw .7s cubic-bezier(.3,.7,.2,1) both; animation-delay: calc(var(--i, 0) * .22s + .25s); }
  @keyframes trkDraw { to { transform: scaleX(1); } }
  .trk-steps li.done { color: var(--ink); }
  .trk-steps li.done .dot { background: var(--ok); box-shadow: none; }
  .trk-steps li.now:not(.fin) .dot { box-shadow: 0 0 0 6px color-mix(in srgb, var(--ok) 16%, transparent); animation: trkPulse 2.2s ease-out infinite; }
  @keyframes trkPulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--ok) 35%, transparent); } 100% { box-shadow: 0 0 0 13px color-mix(in srgb, var(--ok) 0%, transparent); } }
  .trk-steps .lab { display: block; font-weight: 600; }
  .trk-steps li.now .lab { font-weight: 800; }
  .trk-steps .dt { display: block; margin-top: 2px; color: var(--muted); font-weight: 400; }

  /* details as quiet rows, separated by hairlines */
  .trk-rows { margin: 0; }
  .trk-row { display: grid; grid-template-columns: 130px 1fr; gap: 16px; padding: 16px 0; border-top: 1px solid var(--line); }
  .trk-row:last-child { border-bottom: 1px solid var(--line); }
  .trk-row dt { color: var(--muted); font-size: .9rem; }
  .trk-row dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
  .trk-row dd b { display: block; }
  .trk-row dd small { display: block; color: var(--muted); margin-top: 2px; }
  .trk-copy { margin-left: 10px; border: 0; background: var(--fill); color: var(--ink); border-radius: 999px; padding: 3px 12px; font-size: .8rem; font-weight: 600; transition: background .2s ease; }
  .trk-copy:hover { background: rgba(17,17,17,.1); }
  .trk-copy.done { color: var(--ok); background: color-mix(in srgb, var(--ok) 12%, transparent); }

  /* history */
  .trk-toggle { display: inline-flex; align-items: center; gap: 8px; margin: 14px 0 0 -12px; padding: 10px 12px; border: 0; background: none; color: var(--ink); font-weight: 600; border-radius: 8px; }
  .trk-toggle svg { width: 16px; height: 16px; transition: transform .25s ease; }
  .trk-toggle[aria-expanded="true"] svg { transform: rotate(180deg); }
  .trk-tl { list-style: none; margin: 14px 0 0; padding: 0; animation: trkIn .3s ease both; }
  .trk-tl li { position: relative; padding: 0 0 22px 30px; }
  .trk-tl li::before { content: ""; position: absolute; left: 5px; top: 16px; bottom: -2px; width: 2px; background: var(--line); }
  .trk-tl li:last-child::before { display: none; }
  .trk-tl li::after { content: ""; position: absolute; left: 0; top: 6px; width: 12px; height: 12px; border-radius: 50%; background: #fff; box-shadow: inset 0 0 0 2px rgba(17,17,17,.25); }
  .trk-tl li:first-child::after { background: var(--tone); box-shadow: none; }
  .trk-tl b { display: block; }
  .trk-tl span { display: block; color: var(--muted); }
  .trk-tl small { display: block; color: var(--muted); opacity: .85; margin-top: 2px; }
  .trk-link { display: inline-flex; align-items: center; gap: 6px; margin: 14px 0 0 -8px; padding: 8px; color: var(--ink); font-weight: 600; text-decoration: underline; text-underline-offset: 4px; border-radius: 6px; }
  .trk-link:hover { text-decoration-thickness: 2px; }

  /* loading */
  .trk-skel { display: grid; gap: 14px; padding-top: 8px; }
  .trk-skel i { display: block; height: 16px; border-radius: 8px; background: linear-gradient(90deg, rgba(17,17,17,.05), rgba(17,17,17,.11), rgba(17,17,17,.05)); background-size: 200% 100%; animation: trkShimmer 1.3s linear infinite; }
  .trk-skel i:nth-child(1) { width: 28%; height: 28px; border-radius: 999px; } .trk-skel i:nth-child(2) { width: 70%; height: 34px; } .trk-skel i:nth-child(3) { width: 45%; } .trk-skel i:nth-child(4) { height: 70px; }
  @keyframes trkShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

  @media (prefers-reduced-motion: reduce) {
    .trk-sheet, .trk-tl { animation: none; }
    .trk-steps li.done::after { animation: none; transform: scaleX(1); }
    .trk-steps li.now:not(.fin) .dot, .trk-pill.live i, .trk-skel i { animation: none; }
    .trk-btn, .trk-toggle svg, .trk-field input { transition: none; }
  }
  @media (max-width: 480px) {
    .trk { padding: 32px 18px 72px; }
    .trk h1.trk-title { font-size: 1.85rem; }
    .trk h2.trk-headline { font-size: 1.65rem; }
    .trk-steps li { font-size: .78rem; }
    .trk-row { grid-template-columns: 1fr; gap: 2px; padding: 14px 0; }
  }
</style>

<div class="trk" id="trk">
  <header class="trk-hero">
    <span class="trk-hero-ic" id="trk-hero-ic" aria-hidden="true"></span>
    <h1 class="trk-title">Track your order</h1>
    <p class="trk-sub">Enter your order number and the email or phone number you used at checkout. You don't need to sign in.</p>
  </header>

  <form class="trk-form" id="trk-form" novalidate>
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
    <div><small>Order</small><b class="num" id="trk-bar-order"></b></div>
    <button class="trk-again" id="trk-again" type="button">Track another order</button>
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
  var hero = document.querySelector('.trk-hero');
  var STORE_KEY = 'trk.pass.v1';

  var STEPS = ['confirmed', 'shipped', 'out_for_delivery', 'delivered'];
  var STEP_LABEL = { confirmed: 'Confirmed', shipped: 'Shipped', out_for_delivery: 'Out for delivery', delivered: 'Delivered' };
  var STAGE_LABEL = {
    confirmed: 'Order confirmed', shipped: 'On its way', out_for_delivery: 'Out for delivery',
    delivered: 'Delivered', exception: 'Delivery issue', returning: 'Returning to sender',
    cancelled: 'Cancelled', unknown: 'Status update'
  };
  var STAGE_TONE = { delivered: 'done', exception: 'bad', returning: 'warn', cancelled: 'mute', unknown: 'mute' };
  var LIVE = { confirmed: 1, shipped: 1, out_for_delivery: 1 };
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
    chevron: SVG_OPEN + '<path d="M6 9l6 6 6-6"/></svg>',
    out: SVG_OPEN + '<path d="M14 4h6v6 M20 4l-9 9 M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/></svg>'
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
  function weekdayDay(iso) {
    return new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' });
  }
  function longDay(iso) {
    return new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' });
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
      li.style.setProperty('--i', String(i));
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

  // The carrier's status ("In Transit") can repeat on every line. The detail it gives
  // ("Vehicle Departed") is what tells the customer something, so it leads, and the
  // status stays visible on the line below. Nothing is dropped or reworded.
  function eventTitle(e) {
    return (e.description && e.description !== e.label) ? e.description : e.label;
  }
  function eventSub(e) {
    var parts = [];
    if (e.description && e.description !== e.label) parts.push(e.label);
    if (e.location) parts.push(e.location);
    if (e.at) parts.push(when(e.at));
    return parts.join(' \u00b7 ');
  }

  function row(label, buildValue) {
    var r = el('div', 'trk-row');
    r.appendChild(el('dt', null, label));
    var dd = el('dd');
    buildValue(dd);
    r.appendChild(dd);
    return r;
  }

  // The big line answers the customer's real question first: when will it arrive?
  function headlineFor(t, stage) {
    if (stage === 'delivered') {
      var delivered = null;
      for (var k = 0; k < (t.events || []).length; k++) { if (t.events[k].stage === 'delivered' && t.events[k].at) { delivered = t.events[k].at; break; } }
      var when1 = delivered || t.lastUpdate;
      return { h: 'Delivered', lede: when1 ? 'Delivered on ' + longDay(when1) + '.' : '' };
    }
    if (NOTICE[stage]) return { h: STAGE_LABEL[stage], lede: NOTICE[stage] };
    // Only promise a date for statuses we understand as on track.
    if (LIVE[stage] && t.estimatedDelivery) return { h: 'Arriving ' + weekdayDay(t.estimatedDelivery), lede: '' };
    return { h: STAGE_LABEL[stage] || STAGE_LABEL.unknown, lede: '' };
  }

  function shipmentSheet(s, index, total) {
    var t = s.tracking;
    var stage = t ? t.stage : 'unknown';
    var sheet = el('section', 'trk-sheet tone-' + (STAGE_TONE[stage] || 'ok'));
    var carrier = s.company || (t && t.carrier) || '';

    if (total > 1) sheet.appendChild(el('p', 'trk-part', 'Shipment ' + index + ' of ' + total));

    if (!t) {
      var pill0 = el('span', 'trk-pill');
      pill0.appendChild(el('i'));
      pill0.appendChild(document.createTextNode('Tracking unavailable'));
      sheet.appendChild(pill0);
      sheet.appendChild(el('h2', 'trk-headline', "Live tracking isn't available right now"));
      sheet.appendChild(el('p', 'trk-lede', 'Your parcel is with the carrier. Use the link below to see its latest status.'));
    } else {
      var pill = el('span', 'trk-pill' + (LIVE[stage] ? ' live' : ''));
      pill.appendChild(el('i'));
      pill.appendChild(document.createTextNode(STAGE_LABEL[stage] || STAGE_LABEL.unknown));
      sheet.appendChild(pill);
      var hl = headlineFor(t, stage);
      sheet.appendChild(el('h2', 'trk-headline', hl.h));
      sheet.appendChild(el('p', 'trk-lede', hl.lede || ((carrier || 'The carrier') + ' says: ' + t.label + '.')));

      var at = STEPS.indexOf(stage);
      if (at >= 0) sheet.appendChild(stepper(t, at));
    }

    var rows = el('dl', 'trk-rows');
    if (t) {
      var latest = t.events && t.events[0];
      if (latest) {
        rows.appendChild(row('Latest update', function (dd) {
          dd.appendChild(el('b', null, eventTitle(latest)));
          var sub = eventSub(latest);
          if (sub) dd.appendChild(el('small', null, sub));
        }));
      } else if (t.lastUpdate) {
        rows.appendChild(row('Last updated', function (dd) { dd.appendChild(document.createTextNode(when(t.lastUpdate))); }));
      }
    }
    if (carrier) rows.appendChild(row('Carrier', function (dd) { dd.appendChild(document.createTextNode(carrier)); }));
    rows.appendChild(row('Tracking number', function (dd) {
      dd.appendChild(el('span', 'num', s.number));
      dd.appendChild(copyButton(s.number));
    }));
    sheet.appendChild(rows);

    if (t && s.stale && s.syncedAt) {
      var stale = el('div', 'trk-msg warn', "Live tracking isn't available right now. This is the last update we received, on " + when(s.syncedAt) + '.');
      stale.style.marginTop = '20px';
      sheet.appendChild(stale);
    }

    if (t && t.events && t.events.length > 1) {
      var toggle = el('button', 'trk-toggle');
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.appendChild(document.createTextNode('View all updates (' + t.events.length + ')'));
      var chev = el('span');
      chev.innerHTML = ICON.chevron;
      toggle.appendChild(chev);
      var ul = el('ul', 'trk-tl');
      ul.hidden = true;
      t.events.forEach(function (e) {
        var li = el('li');
        li.appendChild(el('b', null, eventTitle(e)));
        var sub = eventSub(e);
        if (sub) li.appendChild(el('small', null, sub));
        ul.appendChild(li);
      });
      toggle.addEventListener('click', function () {
        var open = ul.hidden;
        ul.hidden = !open;
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.firstChild.textContent = (open ? 'Hide updates (' : 'View all updates (') + t.events.length + ')';
      });
      sheet.appendChild(toggle);
      sheet.appendChild(ul);
    }

    if (s.carrierUrl && /^https:\/\//i.test(s.carrierUrl)) {
      var wrap = el('div');
      var a = el('a', 'trk-link');
      a.appendChild(document.createTextNode("Track on the carrier's website"));
      var ext = el('span');
      ext.innerHTML = ICON.out;
      ext.style.display = 'inline-flex';
      ext.firstChild.style.width = '15px';
      ext.firstChild.style.height = '15px';
      a.appendChild(ext);
      a.href = s.carrierUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      wrap.appendChild(a);
      sheet.appendChild(wrap);
    }
    return sheet;
  }

  function showForm(prefillOrder) {
    form.hidden = false;
    hero.hidden = false;
    bar.hidden = true;
    out.textContent = '';
    if (prefillOrder !== undefined) orderEl.value = prefillOrder;
  }
  function showResult(data) {
    out.textContent = '';
    form.hidden = true;
    hero.hidden = true;
    bar.hidden = false;
    barOrder.textContent = data.order || '';
    if (!data.shipments.length) {
      say('We found your order, but it has no tracking number yet. Please check again once it has shipped.', 'warn');
      return;
    }
    say('');
    data.shipments.forEach(function (s, i) { out.appendChild(shipmentSheet(s, i + 1, data.shipments.length)); });
    try { out.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function showSkeleton() {
    out.textContent = '';
    var box = el('div', 'trk-skel');
    box.setAttribute('aria-hidden', 'true');
    box.appendChild(el('i')); box.appendChild(el('i')); box.appendChild(el('i')); box.appendChild(el('i'));
    out.appendChild(box);
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
