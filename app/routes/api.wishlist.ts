import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  addToWishlist,
  isProductGid,
  listWishlist,
  removeFromWishlist,
} from "../models/wishlist.server";

// Identity comes only from the verified session token: `dest` is the shop
// and `sub` is the customer GID. Nothing identifying is read from the request.
async function identify(request: Request) {
  const { sessionToken, cors } = await authenticate.public.customerAccount(
    request,
  );
  const customerId = sessionToken.sub;
  const dest = sessionToken.dest;
  if (!customerId || !dest) {
    throw cors(Response.json({ error: "Unauthorized" }, { status: 401 }));
  }
  // dest is a full URL; the admin side keys everything by the bare host.
  return { shop: new URL(dest).host, customerId, cors };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { shop, customerId, cors } = await identify(request);
  return cors(Response.json({ items: await listWishlist(shop, customerId) }));
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, customerId, cors } = await identify(request);
  const body = await request.json().catch(() => null);
  const productId = body?.productId;
  if (!isProductGid(productId)) {
    return cors(Response.json({ error: "Invalid product" }, { status: 400 }));
  }

  if (request.method === "POST") {
    const result = await addToWishlist(shop, customerId, productId);
    if (!result.ok) {
      return cors(Response.json({ error: "Wishlist is full" }, { status: 409 }));
    }
    return cors(Response.json({ ok: true }));
  }
  if (request.method === "DELETE") {
    await removeFromWishlist(shop, customerId, productId);
    return cors(Response.json({ ok: true }));
  }
  return cors(Response.json({ error: "Method not allowed" }, { status: 405 }));
};
