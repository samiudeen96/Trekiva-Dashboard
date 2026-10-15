import db from "../db.server";

const PRODUCT_GID = /^gid:\/\/shopify\/Product\/\d+$/;
export const MAX_WISHLIST_ITEMS = 200;

export function isProductGid(value: unknown): value is string {
  return typeof value === "string" && PRODUCT_GID.test(value);
}

export async function listWishlist(shop: string, customerId: string) {
  const items = await db.wishlistItem.findMany({
    where: { shop, customerId },
    orderBy: { createdAt: "desc" },
    take: MAX_WISHLIST_ITEMS,
    select: { productId: true, createdAt: true },
  });
  return items;
}

// Idempotent: saving the same product twice keeps a single row.
export async function addToWishlist(
  shop: string,
  customerId: string,
  productId: string,
) {
  const count = await db.wishlistItem.count({ where: { shop, customerId } });
  if (count >= MAX_WISHLIST_ITEMS) return { ok: false as const, reason: "full" };
  await db.wishlistItem.upsert({
    where: { shop_customerId_productId: { shop, customerId, productId } },
    create: { shop, customerId, productId },
    update: {},
  });
  return { ok: true as const };
}

export async function removeFromWishlist(
  shop: string,
  customerId: string,
  productId: string,
) {
  await db.wishlistItem.deleteMany({ where: { shop, customerId, productId } });
}
