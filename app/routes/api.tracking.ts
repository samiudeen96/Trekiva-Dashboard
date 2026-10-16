import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  TrackingLookupError,
  getOrderTracking,
  isOrderGid,
} from "../models/tracking.server";

// Identity comes only from the verified session token.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { sessionToken, cors } = await authenticate.public.customerAccount(request);
  const customerId = sessionToken.sub;
  const shopUrl = sessionToken.dest;
  if (!customerId || !shopUrl) {
    return cors(Response.json({ error: "unauthorized" }, { status: 401 }));
  }
  const raw = new URL(request.url).searchParams.get("orderId");
  if (!isOrderGid(raw)) {
    return cors(Response.json({ error: "invalid" }, { status: 400 }));
  }
  // Customer-side ids can carry "?key=..."; the Admin API wants the plain id.
  try {
    const shipments = await getOrderTracking(new URL(shopUrl).host, customerId, raw.split("?")[0]);
    if (!shipments) {
      console.warn("[tracking] order not found, or it belongs to a different customer");
      return cors(Response.json({ error: "not_found" }, { status: 404 }));
    }
    return cors(Response.json({ shipments }));
  } catch (error) {
    // Say why in the server log; the browser only gets a short code.
    if (error instanceof TrackingLookupError) {
      console.error(`[tracking] ${error.code}: ${error.message}`);
      return cors(Response.json({ error: error.code }, { status: 502 }));
    }
    console.error("[tracking] unexpected error:", error instanceof Error ? error.message : error);
    return cors(Response.json({ error: "server_error" }, { status: 500 }));
  }
};
