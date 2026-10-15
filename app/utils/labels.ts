// Plain-language labels and helpers shared by the admin pages.
// No server-only imports, so these are safe to use in components.

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
