import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { lookupPublicOrder } from "../models/public-tracking.server";
import { TrackingLookupError } from "../models/tracking.server";

// Storefront address /apps/track/lookup. Visitors aren't signed in, so who may
// see an order is decided by the order number plus the email or phone on it.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.public.appProxy(request);
  if (request.method !== "POST") {
    return Response.json({ error: "method" }, { status: 405 });
  }
  if (!admin || !session) {
    console.error("[public-tracking] no saved Shopify session for this shop. Open the app once in Shopify admin to finish installing it.");
    return Response.json({ error: "unavailable" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  // If Shopify passes the visitor's address along, limit per visitor.
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  try {
    const result = await lookupPublicOrder(
      admin,
      session.shop,
      forwarded || "unknown",
      body?.order,
      body?.contact,
    );
    if (result.ok) return Response.json({ shipments: result.shipments });
    const status = { not_found: 404, invalid: 400, slow_down: 429, unavailable: 503 }[result.reason];
    return Response.json({ error: result.reason }, { status });
  } catch (error) {
    if (error instanceof TrackingLookupError) {
      console.error(`[public-tracking] ${error.code}: ${error.message}`);
    } else {
      console.error("[public-tracking] unexpected error:", error instanceof Error ? error.message : error);
    }
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
};
