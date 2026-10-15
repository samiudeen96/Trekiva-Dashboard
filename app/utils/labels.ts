// Plain-language labels and small helpers shared by the admin pages.
// No server-only imports, so these are safe to use in components.

export const SUBJECT_LABELS: Record<string, string> = {
  order: "Order enquiry",
  shipping: "Shipping",
  return: "Return or exchange",
  product: "Product question",
  other: "Something else",
};

export const REASON_LABELS: Record<string, string> = {
  size: "Size or fit issue",
  damaged: "Damaged item",
  wrong_item: "Wrong item received",
  other: "Something else",
};

export const TYPE_LABELS: Record<string, string> = {
  return: "Return",
  exchange: "Exchange",
};

export const STAGE_LABELS: Record<string, string> = {
  confirmed: "Order confirmed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  exception: "Delivery issue",
  returning: "Returning to sender",
  cancelled: "Cancelled",
  unknown: "Status update",
};

// Fixed locale and timezone so the server and the browser print the same
// text (a mismatch would cause hydration warnings).
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// "gid://shopify/Order/123?key=abc" -> "123"
export function gidNumber(gid: string | null | undefined): string | null {
  const m = gid?.match(/\/(\d+)(\?.*)?$/);
  return m ? m[1] : null;
}

// Link that opens the record inside Shopify admin.
export function adminLink(kind: "orders" | "customers", gid: string | null | undefined) {
  const id = gidNumber(gid);
  return id ? `shopify:admin/${kind}/${id}` : null;
}
