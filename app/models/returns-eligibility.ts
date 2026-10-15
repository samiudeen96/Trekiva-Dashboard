// Pure eligibility rules, kept free of database and network access so they
// can be tested directly.

export type OrderLine = {
  id: string;
  title: string;
  quantity: number;
  unfulfilledQuantity: number;
  refundableQuantity: number;
  tags: string[];
};

export type OrderForReturn = {
  cancelledAt: string | null;
  // Date the parcel reached the customer, or the shipment date when the
  // carrier delivery date isn't recorded in Shopify.
  deliveredOrShippedAt: string | null;
  lines: OrderLine[];
};

export type Policy = {
  windowDays: number | null;
  finalSaleTag: string;
};

export type LineEligibility = {
  id: string;
  title: string;
  available: number;
  reason: "final_sale" | "none_left" | null;
};

export type Eligibility =
  | { open: false; reason: "closed" | "cancelled" | "not_shipped" | "window_passed" }
  | { open: true; lines: LineEligibility[] };

const DAY = 24 * 60 * 60 * 1000;

// `requested` maps a line id to the quantity already in pending or approved
// requests, so the same item can't be requested twice.
export function computeEligibility(
  order: OrderForReturn,
  policy: Policy,
  requested: Record<string, number>,
  now: Date,
): Eligibility {
  if (policy.windowDays == null) return { open: false, reason: "closed" };
  if (order.cancelledAt) return { open: false, reason: "cancelled" };
  if (!order.deliveredOrShippedAt) return { open: false, reason: "not_shipped" };
  const deadline =
    new Date(order.deliveredOrShippedAt).getTime() + policy.windowDays * DAY;
  if (now.getTime() > deadline) return { open: false, reason: "window_passed" };

  const finalSale = policy.finalSaleTag.trim().toLowerCase();
  const lines = order.lines.map((line): LineEligibility => {
    if (finalSale && line.tags.some((t) => t.toLowerCase() === finalSale)) {
      return { id: line.id, title: line.title, available: 0, reason: "final_sale" };
    }
    const shipped = line.quantity - line.unfulfilledQuantity;
    const available = Math.max(
      0,
      Math.min(shipped, line.refundableQuantity) - (requested[line.id] ?? 0),
    );
    return {
      id: line.id,
      title: line.title,
      available,
      reason: available === 0 ? "none_left" : null,
    };
  });
  return { open: true, lines };
}
