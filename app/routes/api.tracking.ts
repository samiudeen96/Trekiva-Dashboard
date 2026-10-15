import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getOrderTracking, isOrderGid } from "../models/tracking.server";

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
  const shipments = await getOrderTracking(new URL(shopUrl).host, customerId, raw.split("?")[0]);
  if (!shipments) return cors(Response.json({ error: "not_found" }, { status: 404 }));
  return cors(Response.json({ shipments }));
};
