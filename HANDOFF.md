# Trekiva Customer Account: project handoff

You are being asked to review or continue a Shopify app. Read this whole file first. Do not invent API details that are not written here; where something is unknown it is listed under "Open items".

## What this is

A Shopify app that adds custom pages to Trekiva's customer accounts (footwear store, India, INR). Trekiva keeps its existing Shopify Impact theme storefront and Shopify's own customer login. There is no headless storefront. Native Orders, Profile and Addresses pages stay and are linked to, not replaced.

Custom pages are Shopify **Customer Account UI Extensions** (web components, Preact, API version 2026-10), rendered inside Shopify's hosted account shell. They cannot ship arbitrary HTML or CSS. `ui-design.html` is only a visual mockup, not deployable code.

Backend: React Router app (Shopify CLI template, TypeScript) with Prisma. SQLite in development; the plan is PostgreSQL for production.

The product plan with checkboxes is in `plan.md`. This file describes what actually exists.

## Layout

```
app/
  routes/
    api.wishlist.ts   customer API: list / add / remove wishlist items
    api.support.ts    customer API: create support ticket
    api.returns.ts    customer API: return state for an order, create return request
    api.tracking.ts   customer API: tracking for an order's shipments
    app._index.tsx    admin home: counts of waiting tickets/returns, live carriers, setup checklist
    app.support.tsx   admin: support tickets, open/resolved, links to the customer and order in Shopify admin
    app.returns.tsx   admin: return policy settings, approve/reject requests
    app.settings.tsx  admin: carrier credentials (eKart, XpressBees)
  models/             database and business logic (*.server.ts)
    returns-eligibility.ts   pure eligibility rules (no DB / network)
  carriers/           carrier adapters: types.ts, ekart.server.ts
  utils/              crypto.server.ts (AES-256-GCM), reference.server.ts, labels.ts (plain-language labels and admin links shared by admin pages)
extensions/
  customer-account-dashboard/  Overview page (full page)
  wishlist-page/               Wishlist page (full page)
  support-page/                Help & Support page (full page)
  settings-page/               Account Settings (read-only + links to native Profile/Addresses)
  returns-page/                Per-order returns page (customer-account.order.page.render)
  return-action/               Order menu button linking to returns-page
  order-tracking/              Tracking block on the order page
prisma/schema.prisma           WishlistItem, SupportTicket, ReturnSetting, ReturnRequest,
                               ReturnItem, ReturnEvent, CarrierSetting (+ template Session)
```

Each full-page extension must be its own extension (Shopify allows one full-page target per extension).

## How customer requests are secured

Extensions call the app backend with a Shopify session token. Routes call `authenticate.public.customerAccount(request)`. The shop (`dest`, normalised to the bare host) and the customer (`sub`, a Customer GID) come **only** from the verified token, never from the request body or URL. For orders, the backend loads the order through the Admin API and checks `order.customer.id` equals the token's customer; a wrong or missing order gives the same 404. Tracking numbers are read from Shopify fulfillments on the server, never accepted from the browser.

## Feature status

| Area | State |
|---|---|
| Overview | Built: latest orders, status badges, empty/loading/error. Counts are derived only from loaded orders (latest 10). No fake totals. |
| Wishlist | Backend + page built (product level, price/stock refreshed from Storefront API). **Nothing can add items yet**: needs a storefront heart button (theme work). |
| Help & Support | Built. Rate limit 5 tickets/customer/hour. Reference (TRK-XXXXXX) is returned only after the row is saved. Contact email, WhatsApp, FAQ URL and response-time wording are merchant settings in the extension editor and hidden until set. Staff can mark a ticket resolved or reopen it in the admin. No notification to staff yet. |
| Account Settings | Built, read-only, links to native Profile and Addresses. |
| Returns | Built. **Nothing is refunded or created in Shopify by the app; Trekiva's team must approve each request** (admin page) and does the refund/replacement in Shopify. Policy settings (window days, exchanges on/off, final-sale tag) are admin settings; returns stay closed until a window is set. Eligibility is re-checked server-side inside a transaction. Audit trail in ReturnEvent. |
| Tracking | eKart and Delhivery. Delhivery is built from a review PDF whose sample response is *illustrative, not verbatim*, so its parser is unverified against a real response; it uses `GET {track|staging-express}.delhivery.com/api/v1/packages/json/?waybill=` with `Authorization: Token`, server-side only, with a staging toggle in carrier settings. eKart via its open endpoint `GET https://app.elite.ekartlogistics.in/api/v1/track/{id}` (no auth). Statuses mapped to a neutral set. Fallback carrier link if unavailable. |
| Carrier names | The Odoo setup sets the carrier name on Shopify fulfillments (Xpressbees, Delhivery, Ekart); matching here is by name containing xpressbees / delhivery / ekart. |
| Tracking snapshots | `TrackingSnapshot` table: 60s freshness window, delivered shipments never re-fetched, last saved result shown (marked stale) if a carrier is down. Only read after order ownership is verified. |
| Carrier settings | Admin page (with a per-carrier **Test a tracking number** tool) stores per-carrier enable flag, account id, API key, password, tracking link template. Secrets are AES-256-GCM encrypted (`SETTINGS_ENCRYPTION_KEY`) and never sent to the browser. |

## Verified vs unverified

Verified here: the app and all extensions build (`shopify app build`) and typecheck; eligibility rules, support validation/rate limit, review state machine, credential encryption and the eKart parser were run against test inputs.

**Not verified against a real store** (nothing has run end to end):
- Customer Account API fields used (`customer.orders`, `fulfillments`, `emailAddress`, `phoneNumber`, `defaultAddress.formatted`) and link formats like `shopify:customer-account/orders/{id}`.
- Admin API: `order.customer.id`, `fulfillments { deliveredAt }`, `fulfillments.trackingInfo { number company url }`, line item `unfulfilledQuantity` / `refundableQuantity`.
- `extension:returns-page/` link from the order menu button, and `shopify.order` giving the order id.
- Scopes `read_orders, read_products, read_customers` need Shopify protected-customer-data approval before a public launch.
- Carrier matching depends on the fulfillment's carrier name containing "ekart"; eKart's endpoint takes eKart's tracking id, so if fulfillments carry another number it needs the vendor-waybill endpoint instead.

## Carrier API facts

- **eKart**: OpenAPI spec at `https://storage.googleapis.com/fs-site.goswift.in/public_api_yamls/EKART/spec.yaml`. Token: `POST /integrations/v2/auth/token/{client_id}` with username/password (Bearer, about 24h). Webhook `track_updated` exists. Statuses: Order Placed, Pickup Pending/Scheduled, Out for Pickup, Picked Up, In Transit, Out for Delivery, Delivered, Undelivered, Shipment Delayed, Not Picked, Not Serviceable, Lost, Damaged, RTO (several), Cancelled variants.
- **Delhivery**: status/StatusType mapping follows their published lifecycle (UD forward, DL delivered, RT return, PP/PU/CN reverse); webhooks are documented but not implemented (polling plus a 60s cache is used). Timestamps have no timezone and are read as IST. Request: `GET https://track.delhivery.com/api/v1/packages/json/?waybill=<up to 50, comma separated>&ref_ids=<order id>`, header `Authorization: Token <token>`, staging host `https://staging-express.delhivery.com`, rate limit 750 requests / 5 minutes / IP. Error bodies for an unknown waybill or bad token are not confirmed (the code treats any non-success as unavailable).
- **XpressBees**: built from a description of a working Odoo integration (generated from its code and read-only tests against a real account). Verified: login `POST https://shipment.xpressbees.com/api/users/login` with the panel email and password returns a JWT valid about 3 hours (cached 2.5h, re-login on 401/403); tracking `GET https://shipment.xpressbees.com/api/shipments2/track/{AWB}` with `Authorization: Bearer <token>`; scan fields status code, location, `event_time` (Indian time) and message; codes PP (pickup pending), IT / RAD (in transit), FD (out for delivery), EX (exception), DL (delivered), RT / RT-IT (returning), RT-DL (back with seller). **Not confirmed:** the login reply's token field name (code tries `token`, `access_token`, `data`, `data.token`) and the exact JSON layout of the tracking reply (the parser finds every scan-shaped object anywhere in the reply, so it tolerates grouped or wrapped layouts). XpressBees has no test environment, but tracking calls are read-only. Credentials are the panel email (Account ID field) and password. Use the admin **Test a tracking number** tool to confirm both unknowns. Webhooks exist on XpressBees (panel Settings > Webhooks) but are not implemented.

## Open items

1. Link the app to a real Shopify app and dev store (`npm run config:link`, `npm run dev`). `shopify.app.toml` now has the real URLs (`https://dashboard.trekiva.in`), but its `client_id` came from the scaffold and has not been confirmed as linked to a Dev Dashboard app. The backend is not yet deployed at that domain.
2. `APP_URL` in each extension's `src/config.js` is set to `https://dashboard.trekiva.in`. For `shopify app dev` testing, temporarily use the tunnel URL the CLI prints.
3. Set `SETTINGS_ENCRYPTION_KEY` in `.env` (see `.env.example`).
4. Delhivery: capture one real success response and the real unknown-waybill / bad-token responses to verify the parser; decide whether to add the scan webhook.
5. XpressBees: need docs/credentials from XpressBees.
6. Trekiva to set return window, exchange policy, final-sale tag; no exchange inventory check exists.
7. Wishlist add button on the storefront; variant-level wishlist.
8. Staff notifications for new tickets and return requests.
9. Production: PostgreSQL, hosting, CI, telemetry with redaction, feature flags, tests, accessibility and 320px mobile checks, rollback notes.
10. Rewards page stays off until a real loyalty program exists.

## Ground rules for any change

- Never show data that isn't real (no placeholder counts, points, or prices).
- Never show a reference number or success message before the server has saved the record.
- Never take shop or customer identity from the client.
- Do not promise refunds anywhere in the UI.
- Use current web-component UI extension APIs (2025-10+), not the old React UI extension components.
- Keep secrets server-side; never log tokens or customer data.
