# Trekiva Customer Account — Implementation Plan

> Status: Proposed | Platform: existing Shopify Impact storefront + Customer Account UI Extensions | No Headless storefront
> Tracking: Change `[ ]` to `[x]` as tasks are completed. All tasks begin unchecked.

## 0. Scope and constraints

- [ ] Confirm Shopify new Customer Accounts are enabled and the store's customer-account editor is accessible.
- [ ] Confirm app can be developed, installed, deployed, and enabled in Trekiva's Shopify store.
- [ ] Agree that native Shopify Orders, Profile, Addresses, and Login remain accessible; installing an app **does not replace or hide** these core pages.
- [ ] Confirm that custom full-page extensions render **inside Shopify's hosted account shell** and do not allow arbitrary HTML, custom global CSS, a fully custom site header, or direct DOM access.
- [ ] Use the HTML prototype as a **visual/product reference**, not deployable Customer Account UI Extension source. Recreate feasible designs with Shopify Polaris web components, subject to component/placement limits.
- [ ] Decide which native navigation entries may be adjusted in the Checkout and Accounts editor; do not promise that Shopify-owned routes can be removed.
- [ ] Use an API version supported when implementation begins; prefer web-component based UI extensions (2025-10+). Never copy obsolete React UI-extension component examples into a current-version extension.

## 1. Technical approach

**Shopify Impact storefront** (unchanged) → **Shopify hosted customer authentication** (unchanged) → **Shopify-hosted customer account shell** + **Trekiva UI-extension custom pages/blocks** → app backend for wishlist, support tickets, returns and carrier integrations.

- Existing native Shopify login: no separate password system.
- Extension targets: `customer-account.page.render` for ordinary custom pages; `customer-account.order.page.render` for per-order flows; order index/status block or action targets only where supported.
- Use multiple extension entries for distinct full-page targets, respecting Shopify's target coexistence rules.
- UI: Shopify's permitted Polaris web components and account branding. Any bespoke header/sidebar shown in mockups is conceptual and may need to become account navigation or in-page links.
- Backend: app built with Shopify CLI and React Router (for **app admin/backend**, not headless storefront). PostgreSQL + Prisma only for custom application records if required.
- Auth: Shopify handles customer login. Extension-to-backend communication uses supported session tokens verified server-side, shop/customer authorization, and customer-specific data checks; never trust customer IDs in URL or browser payload alone.
- Data: Shopify native customer account interfaces/APIs for allowed profile/order information; external carrier credentials remain server-side.

## 2. Deliverables

- [ ] Brand tokens / components specification, including mobile and accessibility
- [ ] Customer Overview full-page extension
- [ ] Orders enhancement / order history entry point (native Orders remains supported)
- [ ] Order Detail and shipment-tracking view
- [ ] Wishlist full-page extension
- [x] Returns and Exchanges per-order flow
- [ ] Help & Support full-page extension
- [x] Account Settings landing page with links to native Profile and Addresses
- [ ] Loyalty / rewards placeholder, only enabled when real program is available
- [ ] Account navigation configuration and Impact theme account icon destination
- [ ] Admin settings for carriers, support channels, toggles, telemetry (carrier credentials page done; support channels live in editor settings; toggles and telemetry pending)
- [ ] Automated tests, privacy review, staged rollout and rollback

## 3. Page-by-page specifications

### ACCT-01 — Overview / Dashboard (custom full page)
- [ ] Welcome heading and contextual quick actions
- [ ] Summary cards: total orders, open shipments, saved items; calculate from real data or label unavailable
- [ ] Latest 3 orders with reliable payment/fulfillment status
- [ ] Shortcuts to Orders, Wishlist, Profile, Support
- [ ] Empty state for first-time customers
- [ ] Loading/error states and mobile single-column design
- **Shopify integration:** Customer Account API where authorized; link to native order details when appropriate.

### ACCT-02 — My Orders (native first, optional custom complementary page)
- [ ] Keep Shopify native Orders accessible
- [ ] Display list with number, date, items, amount, status
- [ ] Use cursor pagination / lazy-load for high volumes; never assume all orders fit one request
- [ ] Define which filters are possible with data/API actually accessible; use local filters only for loaded results
- [ ] Each row links to native Shopify order page or the supported per-order extension
- [ ] Empty, loading, failure states

### ACCT-03 — Order Details (native order page + optional extension)
- [ ] Order details: line items, variants, discounts, shipping, taxes, payment, refunds
- [ ] Show shipment groups separately for partial/multi-location fulfillments
- [x] Expose tracking numbers only when actually available
- [ ] Links to download invoice only where a valid app/service supplies it
- [ ] Define reorder flow, including variants, inventory and availability checking

### ACCT-04 — Shipment Tracking (order-specific extension / linked tracking)
- [ ] Current state: confirmed → packed → shipped → out for delivery → delivered (only when supported by carrier events)
- [ ] Integrate eKart and XpressBees through your logistics backend or trusted provider APIs (eKart and Delhivery done, Delhivery parser unverified against a real response; XpressBees docs not public)
- [x] Normalize carrier status events and timestamps; don't infer event times (eKart)
- [x] Securely map Shopify fulfillment → shipment / AWB → carrier (by carrier name on the fulfillment)
- [x] Support exceptions, failed delivery, return to origin, and split parcels (eKart statuses; one block per tracking number)
- [x] Open carrier tracking link as fallback

### ACCT-05 — Wishlist (custom full page)
- [x] Show saved products with price / stock refreshed from Shopify (product level; variants pending)
- [ ] Add/remove wishlist item; wishlist syncing for authenticated customer
- [ ] Add-to-cart deep link or Storefront API workflow as feasible
- [x] Handle removed or unavailable products and empty states
- [x] Backend persistence and deduplication

### ACCT-06 — Profile (native first)
- [ ] Use Shopify's native Profile for verified name/email/phone updates where available
- [x] Create branded account settings landing page with clear native-profile link
- [x] Never display editable UI implying unsupported profile writes
- [ ] Test customer account security and email-change verification flows

### ACCT-07 — Addresses (native first)
- [ ] Use Shopify's native address management for add/edit/delete/default
- [x] Provide link from custom settings page
- [ ] Test address update and default address flows
- [ ] Avoid copying PII into unnecessary app tables

### ACCT-08 — Returns & Exchanges (order-specific extension)
- [ ] Decide eligibility windows, eligible items, final sale items, exchange inventory checks (window, exchanges and final-sale tag are admin settings; values still to be set by Trekiva; no exchange inventory check)
- [x] Present eligible order lines and reason selection
- [x] Submit a return request to the backend / returns platform only after authenticated authorization
- [ ] Show request status and support escalation
- [x] Prevent duplicate and ineligible requests, preserve audit trail
- [x] Never promise refunds until backend creates/approves them (team approval required; nothing is refunded by the app)

### ACCT-09 — Help & Support (custom full page)
- [x] Contact channels: email, WhatsApp link, FAQs (merchant-configured settings; hidden until set)
- [x] Order-context support form with consent and spam protection (validation + 5 requests/hour per customer)
- [x] Case/reference number and confirmation only after successful API response
- [ ] SLA wording to be defined and approved

### ACCT-10 — Rewards (future/optional)
- [ ] Do not show fictitious points/coupons
- [ ] Define loyalty provider, earning and redemption rules before launch
- [ ] Add feature flag and empty / not available state

## 4. Component and interaction system

- [ ] Branding: neutral monochrome with warm cream accent; accessible contrast
- [ ] Cards: softly rounded containers; extension implementation subject to Shopify component styles
- [ ] Navigation: account header/menu + full-page navigation links; mockup sidebar is not guaranteed in Shopify hosted account pages
- [ ] Status badges with meaningful text, not color alone
- [ ] Responsive breakpoints: phone, tablet, desktop; minimum 44px tappable controls where possible
- [ ] Skeleton loading, inline validation, toasts/notifications supported by Shopify extension APIs
- [ ] Accessible headings, keyboard controls, screen reader labels and focus handling
- [ ] Currency: INR formatted from Shopify money fields; no hard-coded prices in production

## 5. Build sequence — actionable checklist

### M0 — Discovery & feasibility
- [ ] Verify live Shopify plan and customer account setup
- [ ] Prototype one full-page extension using current Shopify CLI and API version
- [ ] Verify extension navigation / activation and exact native-page limits in a dev store
- [ ] Confirm backend hosting, privacy / protected customer data compliance, carrier APIs
- [ ] Approve page list and mockups

### M1 — Shopify app foundation
- [x] `shopify app init` and choose supported app template (React Router, TypeScript, at project root)
- [ ] Configure app install and required scopes/permissions (minimum necessary)
- [x] Generate customer account UI extension(s) (Overview generated; others pending)
- [x] Establish backend auth and app session validation (customer session token on /api/wishlist)
- [ ] Set up production secrets, staging environment, CI, automated deploy
- [ ] Add telemetry with sensitive-data redaction

### M2 — Read-only commerce experience
- [ ] Implement Overview extension with real customer data
- [ ] Integrate latest orders and native Orders link
- [ ] Implement order status and tracking summary
- [ ] Handle pagination, empty, loading, network and access errors
- [ ] Test same-customer access only and multi-shop isolation

### M3 — Account utilities
- [ ] Wishlist backend and full-page extension
- [x] Settings landing page with native profile/address links
- [x] Customer help/support page and requests
- [x] Return request form and eligibility check

### M4 — Shipment integrations
- [ ] Obtain permitted eKart and XpressBees tracking APIs/credentials (all three carriers built; XpressBees login flow verified from a working integration, tracking reply layout still unconfirmed)
- [ ] Implement secure fulfillment/AWB matching
- [ ] Track event timestamps, errors, retries, and late/out-of-order updates
- [ ] Show carrier link fallback if API is unavailable

### M5 — QA & production rollout
- [ ] Test with customer accounts having 0, 1, 100+ orders
- [ ] Test split shipments, refunds, cancellations, returns, COD, prepaid
- [ ] Test mobile UX (320px+), accessibility and translations
- [ ] Review API rate limits, caching, export/privacy retention policies
- [ ] Preview and activate extension in Checkout and Accounts editor
- [ ] Add permitted navigation link to custom dashboard and adjust storefront Account entry point
- [ ] Smoke-test native Orders/Profile/Addresses after deployment
- [ ] Launch behind feature flags and document rollback

## 6. Scalability considerations

- API pagination for order lists; no unbounded reads.
- Server caching only for non-sensitive or appropriately isolated short-lived data; avoid cross-customer leakage.
- Queue carrier polling/webhooks and any bulk operations; implement retry/backoff and idempotency.
- Separate high-volume order-history reads from shipment-event writes; index records by shop ID + customer/fulfillment identifiers.
- Defer PDF/Excel exports to asynchronous generation if ever added; avoid building them into a UI extension runtime.
- Monitor API errors, latency, webhook delays, cache performance and rate limit throttles.

## 7. Acceptance criteria

- [ ] Native checkout and customer login continue working
- [ ] Dashboard opens from a configured account navigation link after customer signs in
- [ ] Custom pages are visibly part of Shopify customer accounts, not an unsupported replacement
- [ ] Order totals and statuses match Shopify source records
- [ ] Another customer's orders/data cannot be accessed by altering IDs
- [ ] Wishlist, returns and support actions have verified server acknowledgments
- [ ] Carrier tracking shows provenance, status and last update where available
- [ ] No secrets/customer tokens in browser logs or persisted in plaintext
- [ ] Mobile, keyboard and screen-reader smoke tests pass
- [ ] Team has rollback, monitoring and support documentation

## 8. Reference documentation

- https://shopify.dev/docs/apps/build/customer-accounts/full-page-extensions
- https://shopify.dev/docs/api/customer-account-ui-extensions/latest
- https://shopify.dev/docs/api/customer-account-ui-extensions/latest/targets/full-page

## 9. Decision log

| Decision | Chosen | Notes |
|---|---|---|
| Replace Shopify storefront? | No | Keep Impact theme |
| Use Headless storefront? | No | Explicitly excluded |
| Replace built-in Shopify Account pages? | No | Not supported by installing UI-extension app |
| Customer login | Shopify native | No custom password database |
| Custom dashboard | Full-page customer account extension | Shopify-hosted shell remains |
| Account profile + addresses | Native Shopify | Branded shortcuts only |
| Order tracking | Extension + carrier backend | Needs carrier API availability |
| Mockup format | Static interactive HTML | Design reference, not production extension code |
