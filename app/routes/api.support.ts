import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { createTicket, validateTicket } from "../models/support.server";

// Identity comes only from the verified session token (see api.wishlist.ts).
export const action = async ({ request }: ActionFunctionArgs) => {
  const { sessionToken, cors } = await authenticate.public.customerAccount(
    request,
  );
  const customerId = sessionToken.sub;
  const dest = sessionToken.dest;
  if (!customerId || !dest) {
    return cors(Response.json({ error: "unauthorized" }, { status: 401 }));
  }
  if (request.method !== "POST") {
    return cors(Response.json({ error: "method" }, { status: 405 }));
  }

  const body = await request.json().catch(() => null);
  const parsed = validateTicket({
    subject: body?.subject,
    orderId: body?.orderId,
    message: body?.message,
    consent: body?.consent,
  });
  if (!parsed.value) {
    return cors(Response.json({ error: parsed.error }, { status: 400 }));
  }

  const result = await createTicket(new URL(dest).host, customerId, parsed.value);
  if (!result.ok) {
    return cors(Response.json({ error: "rate_limited" }, { status: 429 }));
  }
  // The reference is returned only after the ticket row exists.
  return cors(Response.json({ reference: result.reference }, { status: 201 }));
};
