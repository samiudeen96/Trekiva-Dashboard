import db from "../db.server";
import { unauthenticated } from "../shopify.server";
import { newReference } from "../utils/reference.server";
import {
  computeEligibility,
  type Eligibility,
  type OrderForReturn,
} from "./returns-eligibility";

export const REASONS = ["size", "damaged", "wrong_item", "other"] as const;
export const TYPES = ["return", "exchange"] as const;
const ORDER_GID = /^gid:\/\/shopify\/Order\/\d+(\?.*)?$/;
const DETAILS_MAX = 1000;

export function isOrderGid(v: unknown): v is string {
  return typeof v === "string" && ORDER_GID.test(v);
}

export async function getReturnSettings(shop: string) {
  const row = await db.returnSetting.findUnique({ where: { shop } });
  return {
    windowDays: row?.windowDays ?? null,
    exchangesEnabled: row?.exchangesEnabled ?? false,
    finalSaleTag: row?.finalSaleTag ?? "final-sale",
  };
}

export async function saveReturnSettings(
  shop: string,
  data: { windowDays: number | null; exchangesEnabled: boolean; finalSaleTag: string },
) {
  await db.returnSetting.upsert({
    where: { shop },
    create: { shop, ...data },
    update: data,
  });
}

const ORDER_QUERY = `#graphql
  query ReturnOrder($id: ID!) {
    order(id: $id) {
      id
      name
      cancelledAt
      customer { id }
      fulfillments(first: 20) { createdAt deliveredAt }
      lineItems(first: 100) {
        nodes {
          id
          title
          quantity
          unfulfilledQuantity
          refundableQuantity
          product { tags }
        }
      }
    }
  }
`;

type LoadedOrder = { name: string; order: OrderForReturn };

// Loads the order from Shopify and confirms it belongs to this customer.
// Returns null for a missing order OR someone else's order, so callers can't
// tell the two apart.
export async function loadOrder(
  shop: string,
  customerId: string,
  orderId: string,
): Promise<LoadedOrder | null> {
  const { admin } = await unauthenticated.admin(shop);
  const res = await admin.graphql(ORDER_QUERY, { variables: { id: orderId } });
  const { data } = await res.json();
  const o = data?.order;
  if (!o || o.customer?.id !== customerId) return null;

  // Earliest delivery if recorded, otherwise earliest shipment date.
  const times = (o.fulfillments as { createdAt: string; deliveredAt: string | null }[]);
  const delivered = times.map((f) => f.deliveredAt).filter(Boolean) as string[];
  const shipped = times.map((f) => f.createdAt);
  const pick = (list: string[]) => list.sort()[0] ?? null;

  return {
    name: o.name,
    order: {
      cancelledAt: o.cancelledAt,
      deliveredOrShippedAt: pick(delivered) ?? pick(shipped),
      lines: o.lineItems.nodes.map(
        (l: {
          id: string;
          title: string;
          quantity: number;
          unfulfilledQuantity: number;
          refundableQuantity: number;
          product: { tags: string[] } | null;
        }) => ({
          id: l.id,
          title: l.title,
          quantity: l.quantity,
          unfulfilledQuantity: l.unfulfilledQuantity,
          refundableQuantity: l.refundableQuantity,
          tags: l.product?.tags ?? [],
        }),
      ),
    },
  };
}

async function requestedQuantities(shop: string, orderId: string) {
  const items = await db.returnItem.findMany({
    where: { request: { shop, orderId, status: { in: ["requested", "approved"] } } },
    select: { lineItemId: true, quantity: true },
  });
  const totals: Record<string, number> = {};
  for (const i of items) totals[i.lineItemId] = (totals[i.lineItemId] ?? 0) + i.quantity;
  return totals;
}

export async function getOrderReturnState(
  shop: string,
  customerId: string,
  orderId: string,
) {
  const loaded = await loadOrder(shop, customerId, orderId);
  if (!loaded) return null;
  const settings = await getReturnSettings(shop);
  const eligibility: Eligibility = computeEligibility(
    loaded.order,
    settings,
    await requestedQuantities(shop, orderId),
    new Date(),
  );
  const requests = await db.returnRequest.findMany({
    where: { shop, customerId, orderId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
  return {
    orderName: loaded.name,
    exchangesEnabled: settings.exchangesEnabled,
    eligibility,
    requests: requests.map((r) => ({
      reference: r.reference,
      type: r.type,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      items: r.items.map((i) => ({ title: i.title, quantity: i.quantity })),
    })),
  };
}

export type CreateInput = {
  orderId: string;
  type: unknown;
  reason: unknown;
  details: unknown;
  items: unknown;
};

export type CreateResult =
  | { ok: true; reference: string }
  | { ok: false; error: "invalid" | "not_found" | "ineligible" | "exchange_disabled" };

export async function createReturnRequest(
  shop: string,
  customerId: string,
  input: CreateInput,
): Promise<CreateResult> {
  if (!TYPES.includes(input.type as (typeof TYPES)[number])) return { ok: false, error: "invalid" };
  if (!REASONS.includes(input.reason as (typeof REASONS)[number])) return { ok: false, error: "invalid" };
  const details =
    typeof input.details === "string" ? input.details.trim().slice(0, DETAILS_MAX) : "";
  if (!Array.isArray(input.items) || input.items.length === 0) return { ok: false, error: "invalid" };

  const wanted: Record<string, number> = {};
  for (const it of input.items) {
    const id = it?.lineItemId;
    const qty = it?.quantity;
    if (typeof id !== "string" || !Number.isInteger(qty) || qty < 1) return { ok: false, error: "invalid" };
    wanted[id] = (wanted[id] ?? 0) + qty;
  }

  const loaded = await loadOrder(shop, customerId, input.orderId);
  if (!loaded) return { ok: false, error: "not_found" };
  const settings = await getReturnSettings(shop);
  if (input.type === "exchange" && !settings.exchangesEnabled) {
    return { ok: false, error: "exchange_disabled" };
  }

  // Check and write in one transaction so two quick submissions can't both
  // claim the same remaining quantity.
  return db.$transaction(async (tx) => {
    const existing = await tx.returnItem.findMany({
      where: { request: { shop, orderId: input.orderId, status: { in: ["requested", "approved"] } } },
      select: { lineItemId: true, quantity: true },
    });
    const requested: Record<string, number> = {};
    for (const i of existing) requested[i.lineItemId] = (requested[i.lineItemId] ?? 0) + i.quantity;

    const eligibility = computeEligibility(loaded.order, settings, requested, new Date());
    if (!eligibility.open) return { ok: false as const, error: "ineligible" as const };

    const lines = new Map(eligibility.lines.map((l) => [l.id, l]));
    for (const [id, qty] of Object.entries(wanted)) {
      const line = lines.get(id);
      if (!line || qty > line.available) return { ok: false as const, error: "ineligible" as const };
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const created = await tx.returnRequest.create({
          data: {
            reference: newReference("RET"),
            shop,
            customerId,
            orderId: input.orderId,
            orderName: loaded.name,
            type: input.type as string,
            reason: input.reason as string,
            details: details || null,
            items: {
              create: Object.entries(wanted).map(([lineItemId, quantity]) => ({
                lineItemId,
                quantity,
                title: lines.get(lineItemId)!.title,
              })),
            },
            events: { create: { status: "requested", actor: "customer" } },
          },
          select: { reference: true },
        });
        return { ok: true as const, reference: created.reference };
      } catch (error) {
        if ((error as { code?: string }).code !== "P2002") throw error;
      }
    }
    throw new Error("Could not allocate a return reference");
  });
}

export function listReturnRequests(shop: string) {
  return db.returnRequest.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { items: true, events: { orderBy: { createdAt: "asc" } } },
  });
}

// Only a pending request can be decided, and only once.
export async function reviewReturnRequest(
  shop: string,
  id: string,
  decision: "approved" | "rejected",
  note: string,
) {
  const result = await db.returnRequest.updateMany({
    where: { id, shop, status: "requested" },
    data: { status: decision, reviewNote: note || null, reviewedAt: new Date() },
  });
  if (result.count === 0) return false;
  await db.returnEvent.create({
    data: { requestId: id, status: decision, actor: "team", note: note || null },
  });
  return true;
}
