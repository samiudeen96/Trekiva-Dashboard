import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  createReturnRequest,
  getOrderReturnState,
  isOrderGid,
} from "../models/returns.server";

// Customer-side order ids can carry a "?key=..." suffix the Admin API rejects.
const stripKey = (gid: string) => gid.split("?")[0];

// Identity comes only from the verified session token (see api.wishlist.ts).
async function identify(request: Request) {
  const { sessionToken, cors } = await authenticate.public.customerAccount(request);
  const customerId = sessionToken.sub;
  const shop = sessionToken.dest;
  if (!customerId || !shop) {
    throw cors(Response.json({ error: "unauthorized" }, { status: 401 }));
  }
  // dest is a full URL (https://shop.myshopify.com); sessions are keyed by host.
  return { shop: new URL(shop).host, customerId, cors };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { shop, customerId, cors } = await identify(request);
  const raw = new URL(request.url).searchParams.get("orderId");
  if (!isOrderGid(raw)) {
    return cors(Response.json({ error: "invalid" }, { status: 400 }));
  }
  const state = await getOrderReturnState(shop, customerId, stripKey(raw));
  if (!state) return cors(Response.json({ error: "not_found" }, { status: 404 }));
  return cors(Response.json(state));
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, customerId, cors } = await identify(request);
  if (request.method !== "POST") {
    return cors(Response.json({ error: "method" }, { status: 405 }));
  }
  const body = await request.json().catch(() => null);
  if (!isOrderGid(body?.orderId)) {
    return cors(Response.json({ error: "invalid" }, { status: 400 }));
  }
  const result = await createReturnRequest(shop, customerId, {
    orderId: stripKey(body.orderId),
    type: body.type,
    reason: body.reason,
    details: body.details,
    items: body.items,
  });
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : result.error === "invalid" ? 400 : 409;
    return cors(Response.json({ error: result.error }, { status }));
  }
  // The reference is returned only after the request is saved.
  return cors(Response.json({ reference: result.reference }, { status: 201 }));
};
