# Trekiva Order Tracking: project handoff

You are being asked to review or continue a Shopify app. Read this whole file first. Do not invent API details that are not written here; where something is unknown it is listed under "Open items".

## What this is

A Shopify app that shows **live shipment tracking on the order page of Trekiva's customer accounts** (footwear store, India, INR). Trekiva keeps its Impact theme storefront and Shopify's own customer login. Native Orders, Profile and Addresses are untouched. It supports **eKart, Delhivery and XpressBees**.

The customer-facing part is one Shopify **Customer Account UI Extension** (web components, Preact, API version 2026-10, target `customer-account.order-status.block.render`). It renders inside Shopify's hosted account shell, so it cannot ship arbitrary HTML or CSS.

Backend: React Router app (Shopify CLI template, TypeScript) with Prisma. SQLite in development; PostgreSQL is planned for production. Public domain: `https://dashboard.trekiva.in` (not deployed yet).

The app used to also include Wishlist, Help & Support, Returns and Account Settings pages. They were removed to keep the app tracking-only. The full version is preserved in the git tag `full-version` (commit `725fa31`).

## Layout

```
app/
  routes/
    api.tracking.ts      customer API: tracking for one order's shipments
    app._index.tsx       admin home: carrier cards + setup checklist
    app.settings.tsx     admin: carrier credentials, per-carrier "Check it works" test
  models/
    tracking.server.ts   loads the order's fulfillments, matches carrier, snapshots
    carrier.server.ts    carrier settings (secrets encrypted)
    carrier-test.server.ts  admin test tool
  carriers/              types.ts (neutral model), ekart / delhivery / xpressbees adapters
  utils/                 crypto.server.ts (AES-256-GCM), labels.ts
extensions/
  order-tracking/        the tracking block shown on the order page
prisma/schema.prisma     Session, CarrierSetting, TrackingSnapshot
```

## How a request is secured and routed

The extension calls the backend with a Shopify session token. `api.tracking.ts` calls `authenticate.public.customerAccount(request)`. The shop (`dest`, normalised to the bare host) and the customer (`sub`, a Customer GID) come **only** from the verified token. The backend loads the order through the Admin API and checks `order.customer.id` equals the token's customer; a missing or someone else's order gives the same 404. Tracking numbers and carrier names are read from the order's **fulfillments** (`trackingInfo { number company url }`) on the server, never accepted from the browser.

Carrier is chosen **per shipment** by the fulfillment's carrier name containing `ekart`, `delhivery` or `xpressbees` (case-insensitive). Live tracking is fetched only if that carrier is switched on and has its details saved. Otherwise the customer sees the tracking number and the carrier link. If a carrier is down, the last saved snapshot is shown and clearly marked out of date.

## Customer experience

Per shipment: status headline with icon, a progress bar (Confirmed, Shipped, Out for delivery, Delivered), estimated delivery and last-updated, a collapsible history, notices for delivery issues / returning / cancelled, the carrier's own wording, a stale-data banner, and a "Track on the carrier's website" button. Orders without tracking numbers show nothing.

## Carrier facts

- **eKart**: official OpenAPI spec at `https://storage.googleapis.com/fs-site.goswift.in/public_api_yamls/EKART/spec.yaml`. Tracking uses the **open** endpoint `GET https://app.elite.ekartlogistics.in/api/v1/track/{id}` (no login). `{id}` is eKart's tracking id; if fulfillments carry another number the vendor-waybill endpoint `/data/v1/elite/track/{wbn}` may be needed. Statuses are a fixed documented list.
- **Delhivery**: built from a review PDF whose sample response is *illustrative, not verbatim*, so the parser is **unverified against a real response**. `GET https://track.delhivery.com/api/v1/packages/json/?waybill=...` (staging host `https://staging-express.delhivery.com`), header `Authorization: Token <token>`, limit 750 requests / 5 min / IP. Status mapping uses Status + StatusType (UD forward, DL delivered, RT return, PP/PU/CN reverse); a bare UD is never called a failed delivery. Timestamps carry no timezone and are read as IST. Staging and production tokens are different; the settings page has a staging checkbox.
- **XpressBees**: built from a description of a working Odoo integration (code plus read-only tests on a real account). Login `POST https://shipment.xpressbees.com/api/users/login` with the panel email and password returns a JWT valid about 3 hours (cached 2.5h, re-login on 401/403). Tracking `GET https://shipment.xpressbees.com/api/shipments2/track/{AWB}` with `Authorization: Bearer <token>`. Codes: PP pickup pending, IT / RAD in transit, FD out for delivery, EX exception, DL delivered, RT / RT-IT returning, RT-DL back with seller. `event_time` is Indian time. **Not confirmed:** the login reply's token field name (code tries `token`, `access_token`, `data`, `data.token`) and the exact JSON layout of the tracking reply (the parser finds every scan-shaped object anywhere in the reply). API access must be enabled on the XpressBees account.

## Verified vs unverified

Verified here: the app and extension build (`shopify app build`) and typecheck; carrier parsers, status mapping, the XpressBees login/token reuse/401 retry flow (with a simulated server), the snapshot behaviour (fresh, stale on outage, delivered never re-fetched), credential encryption, and carrier-settings validation were run against test inputs.

**Not verified against a real store or real carrier responses** (nothing has run end to end):
- Admin API fields: `order.customer.id`, `fulfillments.trackingInfo { number company url }`.
- That the extension can read the order from `shopify.order`, and the web-component icon names and props used in the block.
- The Delhivery and XpressBees real reply layouts and error responses (use the admin test tool).
- Scopes `read_orders, read_customers` need Shopify protected-customer-data approval before a public launch.

## Open items

1. Host the backend at `https://dashboard.trekiva.in`: a host, PostgreSQL (switch `provider` in `schema.prisma` and regenerate the single `init` migration), and environment variables (client id, client secret, app URL, scopes, a **new production** `SETTINGS_ENCRYPTION_KEY`, database URL). Keep the encryption key stable: without it, saving a carrier token or password fails (the settings page says so); if it changes later, saved details become unreadable and the page asks for them to be entered again. Run `prisma migrate deploy` on the server so the `CarrierSetting` and `TrackingSnapshot` tables exist.
2. Link and deploy: `npm run config:link`, `npm run deploy`, install on the store. `include_config_on_deploy` was removed from `shopify.app.toml`, so app URL, redirect URLs and scopes are NOT pushed on deploy unless it is restored or they are set by hand in the Dev Dashboard.
3. In Shopify admin: Settings, Customer accounts, Customize, open **Order status**, add the **Trekiva Order Tracking** block, save.
4. In Carrier settings enter credentials, switch carriers on, and run **Check it works** with a real number and a made-up one. Send real replies for Delhivery and XpressBees to confirm the parsers.
5. Confirm fulfillments carry the carrier name (eKart / Delhivery / XpressBees) and the number each carrier expects. Consider matching on the tracking URL host too.
6. Not built: carrier webhooks (polling plus the 60s snapshot cache is used), staff notifications, delivery-failure (NDR) actions.
7. If the store also uses another tracking app (for example AfterShip), do not show both tracking blocks on the Order status page.
8. Production hardening: CI, telemetry with redaction, accessibility and 320px checks, rollback notes.

## Ground rules for any change

- Never show data that isn't real (no placeholder statuses or dates).
- Never take shop or customer identity from the client.
- Show the carrier's own wording; do not reword it into claims the carrier didn't make.
- Keep secrets server-side; never log tokens, passwords or customer data.
- Use current web-component UI extension APIs (2025-10+), not the old React UI extension components.
