import db from "../db.server";
import { newReference } from "../utils/reference.server";

export const SUBJECTS = [
  "order",
  "shipping",
  "return",
  "product",
  "other",
] as const;
export type Subject = (typeof SUBJECTS)[number];

export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 2000;
const MAX_TICKETS_PER_HOUR = 5;
const ORDER_GID = /^gid:\/\/shopify\/Order\/\d+(\?.*)?$/;
export type TicketInput = {
  subject: unknown;
  orderId: unknown;
  message: unknown;
  consent: unknown;
};

export function validateTicket(input: TicketInput) {
  const { subject, orderId, message, consent } = input;
  if (!SUBJECTS.includes(subject as Subject)) return { error: "subject" };
  if (consent !== true) return { error: "consent" };
  if (typeof message !== "string") return { error: "message" };
  const text = message.trim();
  if (text.length < MESSAGE_MIN || text.length > MESSAGE_MAX) {
    return { error: "message" };
  }
  if (orderId != null && orderId !== "") {
    if (typeof orderId !== "string" || !ORDER_GID.test(orderId)) {
      return { error: "order" };
    }
  }
  return {
    value: {
      subject: subject as Subject,
      orderId: typeof orderId === "string" && orderId ? orderId : null,
      message: text,
    },
  };
}

export async function createTicket(
  shop: string,
  customerId: string,
  data: { subject: Subject; orderId: string | null; message: string },
) {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db.supportTicket.count({
    where: { shop, customerId, createdAt: { gte: since } },
  });
  if (recent >= MAX_TICKETS_PER_HOUR) return { ok: false as const };

  // The reference column is unique, so a collision just retries.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const ticket = await db.supportTicket.create({
        data: { ...data, shop, customerId, consent: true, reference: newReference("TRK") },
        select: { reference: true },
      });
      return { ok: true as const, reference: ticket.reference };
    } catch (error) {
      if ((error as { code?: string }).code !== "P2002") throw error;
    }
  }
  throw new Error("Could not allocate a ticket reference");
}

export function listTickets(shop: string) {
  return db.supportTicket.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export function countOpenTickets(shop: string) {
  return db.supportTicket.count({ where: { shop, status: "open" } });
}

// Only "open" and "resolved" exist; changing a ticket never touches the customer.
export async function setTicketStatus(
  shop: string,
  id: string,
  status: "open" | "resolved",
) {
  const result = await db.supportTicket.updateMany({
    where: { id, shop },
    data: { status },
  });
  return result.count > 0;
}
