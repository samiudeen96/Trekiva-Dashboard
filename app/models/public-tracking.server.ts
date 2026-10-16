import { buildShipments, TrackingLookupError, type FulfillmentNode } from "./tracking.server";
import { allow, count, record } from "../utils/rate-limit.server";
import { signLookup, verifyLookup } from "../utils/lookup-token.server";

// Anything with this shape works, which also lets tests pass a stand-in.
export type AdminClient = {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
};

const QUERY = `#graphql
  query PublicTrackingOrder($query: String!) {
    orders(first: 3, query: $query) {
      nodes {
        name
        email
        phone
        shippingAddress { phone }
        fulfillments(first: 20) {
          id
          trackingInfo(first: 5) { number company url }
        }
      }
    }
  }
`;

const IP_LIMIT = 30; // lookups per visitor address
const IP_WINDOW = 10 * 60 * 1000;
const SHOP_LIMIT = 300; // lookups per shop, across everyone
const ORDER_FAIL_LIMIT = 5; // wrong guesses per order number
const ORDER_FAIL_WINDOW = 15 * 60 * 1000;

export type PublicResult =
  | {
      ok: true;
      orderName: string;
      shipments: Awaited<ReturnType<typeof buildShipments>>;
      // Only when the email or phone was just checked. Lets a refresh bring the
      // result back without asking again.
      token: string | null;
    }
  // Every failure looks the same to the visitor, except slowing down and an
  // expired pass (the page then just shows the form again).
  | { ok: false; reason: "not_found" | "invalid" | "slow_down" | "unavailable" | "expired" };

// "#TR-001392" and "tr-001392" both mean the order shown as TR-001392.
export function normalizeOrderNumber(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const n = input.trim().replace(/^#/, "").toUpperCase();
  return /^[A-Z0-9-]{1,30}$/.test(n) ? n : null;
}

const digits = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");

// The contact is either the email or the phone on the order. Phones compare by
// their last 10 digits so +91, 0 and spaces don't matter.
export function contactMatches(
  contact: unknown,
  order: { email: string | null; phone: string | null; shippingAddress: { phone: string | null } | null },
): boolean {
  if (typeof contact !== "string") return false;
  const c = contact.trim();
  if (c.includes("@")) {
    return Boolean(order.email) && order.email!.trim().toLowerCase() === c.toLowerCase();
  }
  const want = digits(c);
  if (want.length < 10) return false;
  const tail = want.slice(-10);
  return [order.phone, order.shippingAddress?.phone].some((p) => {
    const d = digits(p);
    return d.length >= 10 && d.slice(-10) === tail;
  });
}

export async function lookupPublicOrder(
  admin: AdminClient,
  shop: string,
  clientKey: string,
  orderInput: unknown,
  contactInput: unknown,
  tokenInput?: unknown,
): Promise<PublicResult> {
  const orderNumber = normalizeOrderNumber(orderInput);
  const contact = typeof contactInput === "string" ? contactInput.trim() : "";
  if (!orderNumber) return { ok: false, reason: "invalid" };

  // A valid pass for this order stands in for the email or phone.
  const hasPass = typeof tokenInput === "string" && tokenInput !== "";
  const passOk = hasPass && verifyLookup(tokenInput, shop, orderNumber);
  if (hasPass && !passOk && !contact) return { ok: false, reason: "expired" };
  if (!passOk && (contact.length < 5 || contact.length > 100)) {
    return { ok: false, reason: "invalid" };
  }

  // Limits first, so guessing is slowed down before any lookup happens.
  if (
    !allow(`ip:${shop}:${clientKey}`, IP_LIMIT, IP_WINDOW) ||
    !allow(`shop:${shop}`, SHOP_LIMIT, IP_WINDOW) ||
    count(`fail:${shop}:${orderNumber}`, ORDER_FAIL_WINDOW) >= ORDER_FAIL_LIMIT
  ) {
    return { ok: false, reason: "slow_down" };
  }

  const res = await admin.graphql(QUERY, {
    variables: { query: `name:"${orderNumber}"` },
  });
  const body = (await res.json()) as {
    data?: { orders?: { nodes?: (FulfillmentOrder | null)[] } };
    errors?: { message?: string }[];
  };
  if (body.errors?.length) {
    // Access problems (missing scope or approval) are for the server log only.
    throw new TrackingLookupError("admin_access", body.errors.map((e) => e.message).join("; "));
  }

  const order = (body.data?.orders?.nodes ?? []).find(
    (o): o is FulfillmentOrder => Boolean(o) && o!.name.replace(/^#/, "").toUpperCase() === orderNumber,
  );
  const verified = passOk || (order ? contactMatches(contact, order) : false);
  if (!order || !verified) {
    record(`fail:${shop}:${orderNumber}`, ORDER_FAIL_WINDOW);
    return { ok: false, reason: "not_found" };
  }
  return {
    ok: true,
    orderName: order.name.replace(/^#/, ""),
    shipments: await buildShipments(shop, order.fulfillments),
    // A new pass only when the contact was just proven, so a pass can't be
    // renewed forever from itself.
    token: passOk ? null : signLookup(shop, orderNumber),
  };
}

type FulfillmentOrder = {
  name: string;
  email: string | null;
  phone: string | null;
  shippingAddress: { phone: string | null } | null;
  fulfillments: FulfillmentNode[];
};
