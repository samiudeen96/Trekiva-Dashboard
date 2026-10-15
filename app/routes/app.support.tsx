import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { listTickets, setTicketStatus } from "../models/support.server";
import { SUBJECT_LABELS, adminLink, formatDateTime } from "../utils/labels";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const tickets = await listTickets(session.shop);
  return {
    tickets: tickets.map((t) => ({
      id: t.id,
      reference: t.reference,
      subject: t.subject,
      message: t.message,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      customerLink: adminLink("customers", t.customerId),
      orderLink: adminLink("orders", t.orderId),
    })),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get("intent");
  if (intent !== "resolve" && intent !== "reopen") {
    return { error: "Unknown action." };
  }
  const done = await setTicketStatus(
    session.shop,
    String(form.get("id")),
    intent === "resolve" ? "resolved" : "open",
  );
  return done ? { ok: true } : { error: "We couldn't find that request." };
};

type Ticket = ReturnType<typeof useLoaderData<typeof loader>>["tickets"][number];

export default function SupportRequests() {
  const { tickets } = useLoaderData<typeof loader>();
  const open = tickets.filter((t) => t.status === "open");
  const resolved = tickets.filter((t) => t.status !== "open");

  if (tickets.length === 0) {
    return (
      <s-page heading="Support requests">
        <s-section>
          <s-empty-state heading="No support requests yet">
            <s-paragraph>
              When a customer sends a message from the Help &amp; Support page
              in their account, it will appear here.
            </s-paragraph>
          </s-empty-state>
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading="Support requests">
      <s-section>
        <s-paragraph>
          Messages customers send from their account. We don't email you about
          these yet, so check this page regularly. Reply to the customer by
          email or WhatsApp from their Shopify customer page, then mark the
          request resolved.
        </s-paragraph>
      </s-section>

      <s-section heading={`Waiting for a reply (${open.length})`}>
        {open.length === 0 ? (
          <s-text color="subdued">All caught up. Nothing is waiting.</s-text>
        ) : (
          <s-stack gap="base">
            {open.map((t) => (
              <TicketCard key={t.id} ticket={t} />
            ))}
          </s-stack>
        )}
      </s-section>

      {resolved.length > 0 && (
        <s-section heading={`Resolved (${resolved.length})`}>
          <s-stack gap="base">
            {resolved.map((t) => (
              <TicketCard key={t.id} ticket={t} />
            ))}
          </s-stack>
        </s-section>
      )}
    </s-page>
  );
}

function TicketCard({ ticket: t }: { ticket: Ticket }) {
  const fetcher = useFetcher<typeof action>();
  const isOpen = t.status === "open";
  const working = fetcher.state !== "idle";

  return (
    <s-box padding="base" border="base" borderRadius="base" background="subdued">
      <s-stack gap="small">
        <s-stack direction="inline" gap="small" alignItems="center">
          <s-heading>{SUBJECT_LABELS[t.subject] ?? t.subject}</s-heading>
          <s-badge tone={isOpen ? "caution" : "success"}>
            {isOpen ? "Open" : "Resolved"}
          </s-badge>
        </s-stack>
        <s-text color="subdued">
          {t.reference} · {formatDateTime(t.createdAt)}
        </s-text>
        <s-paragraph>{t.message}</s-paragraph>
        <s-stack direction="inline" gap="base">
          {t.customerLink && <s-link href={t.customerLink}>Open customer</s-link>}
          {t.orderLink && <s-link href={t.orderLink}>Open related order</s-link>}
        </s-stack>
        {fetcher.data && "error" in fetcher.data && (
          <s-banner tone="critical">{fetcher.data.error}</s-banner>
        )}
        <s-stack direction="inline">
          <s-button
            variant={isOpen ? "primary" : "secondary"}
            loading={working}
            onClick={() =>
              fetcher.submit(
                { intent: isOpen ? "resolve" : "reopen", id: t.id },
                { method: "post" },
              )
            }
          >
            {isOpen ? "Mark as resolved" : "Reopen"}
          </s-button>
        </s-stack>
      </s-stack>
    </s-box>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
