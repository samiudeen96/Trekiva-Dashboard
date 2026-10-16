# Trekiva Order Tracking: plan

> Scope: live shipment tracking on the order page of Shopify's new customer accounts, for eKart, Delhivery and XpressBees. Existing Impact storefront and Shopify login are unchanged. No headless storefront.
> Earlier scope (Wishlist, Help & Support, Returns, Account Settings) was removed; the full version is in the git tag `full-version`.
> Tracking: change `[ ]` to `[x]` as tasks are completed. See `HANDOFF.md` for how it works and what is unverified.

## 0. Scope and constraints

- [x] Confirm Shopify new Customer Accounts are enabled (the Customize editor is available).
- [ ] Confirm the app can be linked, deployed and installed on the store.
- [x] Native Orders, Profile, Addresses and Login stay untouched.
- [x] The block renders inside Shopify's hosted account shell: no custom HTML, CSS or DOM access.
- [x] Use current web-component UI extensions (2025-10+).

## 1. Customer experience (order-tracking extension)

- [x] Block on the Order status page, hidden when the order has no tracking numbers
- [x] Status headline with icon, progress bar, estimated delivery, last updated
- [x] Collapsible tracking history with the carrier's own wording and timestamps
- [x] Notices for delivery issue, returning to sender and cancelled
- [x] One card per tracking number (split parcels)
- [x] Carrier link as fallback; neutral message when live tracking is unavailable
- [x] Last known status, clearly marked out of date, when a carrier is down
- [x] Loading, error and retry states
- [ ] Verify rendering in a real store (icons, spacing, mobile 320px)
- [ ] Accessibility check (keyboard, screen reader)

## 1b. Public Track your order page (visitors not signed in)

- [x] Storefront page at /apps/track through Shopify's app proxy (served inside the theme)
- [x] Order number plus email or phone verification; generic answer for every failure
- [x] Rate limits and a lockout after repeated wrong guesses
- [x] Same step bar, history and carrier link as the account block
- [x] Unsigned or forged proxy requests are rejected
- [ ] Verify on the store: /apps/track loads in the theme and finds a real recent order
- [ ] Add a "Track your order" link to the store menu or footer
- [ ] Decide on read_all_orders (orders older than 60 days) and protected customer data approval
- [ ] Confirm the visitor's address reaches the app (per-visitor limit)
- [ ] Check how guests on the account order-status link behave

## 2. Backend

- [x] Session-token authentication; shop and customer only from the verified token
- [x] Order ownership check through the Admin API
- [x] Tracking numbers and carrier names read from the order's fulfillments
- [x] Carrier-neutral status model
- [x] eKart adapter (official spec)
- [x] Delhivery adapter (parser unverified against a real response)
- [x] XpressBees adapter with login and token reuse (reply layout unverified)
- [x] Saved snapshots: 60s freshness, delivered never re-fetched, stale fallback
- [ ] Match carriers by tracking URL host as well as by name
- [ ] Carrier webhooks (Delhivery and XpressBees offer them)

## 3. Admin (inside Shopify admin)

- [x] Home: carrier cards and setup checklist
- [x] Carrier settings: status badge, plain-language fields, encrypted secrets
- [x] "Check it works" test per carrier
- [ ] Confirm the admin pages render well in Shopify admin

## 4. Go live

- [ ] Host the backend at https://dashboard.trekiva.in (host, PostgreSQL, environment variables, new production encryption key)
- [ ] Link, deploy and install the app (`config:link`, `deploy`)
- [ ] Decide on `include_config_on_deploy` in `shopify.app.toml`
- [ ] Add the tracking block on the Order status page in the Customize editor
- [ ] Enter carrier credentials, switch carriers on, test with real and made-up numbers
- [ ] Confirm real Delhivery and XpressBees replies and adjust the parsers if needed
- [ ] Protected customer data approval (`read_orders`, `read_customers`) if distributing beyond this store
- [ ] If another tracking app (for example AfterShip) is installed, show only one tracking block

## 5. Quality and operations

- [ ] Test with orders having 0, 1 and several tracking numbers; COD and prepaid; split shipments
- [ ] Monitor carrier errors, latency and rate limits (Delhivery: 750 requests / 5 min / IP)
- [ ] Telemetry with redaction of tokens and customer data
- [ ] CI and automated deploy
- [ ] Rollback and support notes

## 6. Acceptance criteria

- [ ] Native checkout and customer login keep working
- [ ] A customer sees tracking only for their own orders; changing an order id does not expose another customer's data
- [ ] Status, last update and history match the carrier's own tracking
- [ ] No secrets or customer tokens in logs or the browser
- [ ] Mobile, keyboard and screen-reader smoke tests pass
- [ ] Rollback, monitoring and support documentation exist

## Decision log

| Decision | Chosen | Notes |
|---|---|---|
| Replace Shopify storefront? | No | Keep Impact theme |
| Headless storefront? | No | Explicitly excluded |
| Replace built-in account pages? | No | Not supported; native pages stay |
| Customer login | Shopify native | No custom password database |
| App scope | Order tracking only | Wishlist, Support, Returns, Settings removed (tag `full-version`) |
| Carrier choice | Per shipment, by carrier name on the fulfillment | URL-host matching is a possible improvement |
| Visitors not signed in | Public page via app proxy, verified by order number + email or phone | Never by tracking number alone |
| Updates | Polling with snapshots | Webhooks not built |
| Carrier secrets | Server-side, AES-256-GCM | Never sent to the browser |
