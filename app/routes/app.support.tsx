import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { listTickets } from "../models/support.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const tickets = await listTickets(session.shop);
  return {
    tickets: tickets.map((t) => ({
      id: t.id,
      reference: t.reference,
      subject: t.subject,
      orderId: t.orderId,
      message: t.message,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      customerId: t.customerId,
    })),
  };
};

export default function SupportRequests() {
  const { tickets } = useLoaderData<typeof loader>();
  return (
    <s-page heading="Support requests">
      {tickets.length === 0 ? (
        <s-section>
          <s-paragraph>No support requests yet.</s-paragraph>
        </s-section>
      ) : (
        tickets.map((t) => (
          <s-section key={t.id} heading={`${t.reference} · ${t.subject}`}>
            <s-stack gap="small">
              <s-text color="subdued">
                {new Date(t.createdAt).toLocaleString()} · {t.status}
              </s-text>
              <s-text color="subdued">Customer: {t.customerId}</s-text>
              {t.orderId && <s-text color="subdued">Order: {t.orderId}</s-text>}
              <s-paragraph>{t.message}</s-paragraph>
            </s-stack>
          </s-section>
        ))
      )}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
