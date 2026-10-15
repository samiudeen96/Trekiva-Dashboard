import { useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, useActionData, useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  getReturnSettings,
  listReturnRequests,
  reviewReturnRequest,
  saveReturnSettings,
} from "../models/returns.server";
import {
  REASON_LABELS,
  TYPE_LABELS,
  adminLink,
  formatDateTime,
} from "../utils/labels";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [settings, requests] = await Promise.all([
    getReturnSettings(session.shop),
    listReturnRequests(session.shop),
  ]);
  return {
    settings,
    requests: requests.map((r) => ({
      id: r.id,
      reference: r.reference,
      orderName: r.orderName,
      orderLink: adminLink("orders", r.orderId),
      customerLink: adminLink("customers", r.customerId),
      type: r.type,
      reason: r.reason,
      details: r.details,
      status: r.status,
      reviewNote: r.reviewNote,
      createdAt: r.createdAt.toISOString(),
      items: r.items.map((i) => ({ id: i.id, title: i.title, quantity: i.quantity })),
    })),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "settings") {
    const raw = String(form.get("windowDays") ?? "").trim();
    const days = raw === "" ? null : Number(raw);
    if (days !== null && (!Number.isInteger(days) || days < 1 || days > 365)) {
      return { error: "Enter a whole number of days between 1 and 365, or leave it blank to keep returns closed." };
    }
    await saveReturnSettings(session.shop, {
      windowDays: days,
      exchangesEnabled: form.get("exchangesEnabled") === "on",
      finalSaleTag: String(form.get("finalSaleTag") ?? "").trim(),
    });
    return { saved: true };
  }

  if (intent === "approved" || intent === "rejected") {
    const done = await reviewReturnRequest(
      session.shop,
      String(form.get("id")),
      intent,
      String(form.get("note") ?? "").trim().slice(0, 500),
    );
    return done ? { saved: true } : { error: "That request was already decided." };
  }
  return { error: "Something went wrong. Please refresh the page." };
};

type Request = ReturnType<typeof useLoaderData<typeof loader>>["requests"][number];

export default function Returns() {
  const { settings, requests } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const error = result && "error" in result ? result.error : null;
  const saved = result && "saved" in result;
  const waiting = requests.filter((r) => r.status === "requested");
  const decided = requests.filter((r) => r.status !== "requested");
  const isOpen = settings.windowDays !== null;

  return (
    <s-page heading="Returns and exchanges">
      {error && <s-banner tone="critical">{error}</s-banner>}
      {saved && <s-banner tone="success">Saved.</s-banner>}

      <s-section>
        <s-stack gap="large">
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-heading>Return policy</s-heading>
            <s-badge tone={isOpen ? "success" : "caution"}>
              {isOpen ? `Open for ${settings.windowDays} days` : "Closed"}
            </s-badge>
          </s-stack>
          <s-text color="subdued">
            {isOpen
              ? "Customers can request a return from their order page. Each request waits here for your decision."
              : "Customers can't request returns until you set a number of days below."}
          </s-text>
          <Form method="post">
            <input type="hidden" name="intent" value="settings" />
            <s-stack gap="base">
              <s-number-field
                name="windowDays"
                label="How many days can a customer return an item?"
                details="Counted from delivery, or from the shipping date if the delivery date isn't known. Leave blank to keep returns closed."
                defaultValue={settings.windowDays?.toString() ?? ""}
              />
              <s-checkbox
                name="exchangesEnabled"
                label="Also allow exchange requests"
                details="You decide each exchange yourself. The app doesn't check stock."
                defaultChecked={settings.exchangesEnabled}
              />
              <s-text-field
                name="finalSaleTag"
                label="Product tag for items that can't be returned"
                details="Any product with this tag in Shopify is marked as final sale. Leave blank if you have none."
                defaultValue={settings.finalSaleTag}
              />
              <s-stack direction="inline">
                <s-button type="submit" variant="primary">
                  Save policy
                </s-button>
              </s-stack>
            </s-stack>
          </Form>
        </s-stack>
      </s-section>

      {requests.length === 0 ? (
        <s-section>
          <s-empty-state heading="No return requests yet">
            <s-paragraph>
              Requests from customers will appear here for you to approve or
              reject.
            </s-paragraph>
          </s-empty-state>
        </s-section>
      ) : (
        <>
          <s-section heading={`Waiting for your decision (${waiting.length})`}>
            {waiting.length === 0 ? (
              <s-text color="subdued">All caught up. Nothing is waiting.</s-text>
            ) : (
              <s-stack gap="base">
                {waiting.map((r) => (
                  <RequestCard key={r.id} request={r} />
                ))}
              </s-stack>
            )}
          </s-section>

          {decided.length > 0 && (
            <s-section heading={`Already decided (${decided.length})`}>
              <s-stack gap="base">
                {decided.map((r) => (
                  <RequestCard key={r.id} request={r} />
                ))}
              </s-stack>
            </s-section>
          )}
        </>
      )}
    </s-page>
  );
}

function RequestCard({ request: r }: { request: Request }) {
  const fetcher = useFetcher<typeof action>();
  const [note, setNote] = useState("");
  const working = fetcher.state !== "idle";
  const pending = r.status === "requested";

  const decide = (intent: "approved" | "rejected") =>
    fetcher.submit({ intent, id: r.id, note }, { method: "post" });

  return (
    <s-box padding="base" border="base" borderRadius="base" background="subdued">
      <s-stack gap="small">
        <s-stack direction="inline" gap="small" alignItems="center">
          <s-heading>
            {TYPE_LABELS[r.type] ?? r.type} · {r.orderName}
          </s-heading>
          {r.status === "approved" && <s-badge tone="success">Approved</s-badge>}
          {r.status === "rejected" && <s-badge tone="critical">Rejected</s-badge>}
          {pending && <s-badge tone="caution">Waiting</s-badge>}
        </s-stack>
        <s-text color="subdued">
          {r.reference} · {formatDateTime(r.createdAt)}
        </s-text>

        <s-stack gap="small-200">
          <s-text type="strong">What the customer wants to send back</s-text>
          {r.items.map((i) => (
            <s-text key={i.id}>
              {i.quantity} × {i.title}
            </s-text>
          ))}
        </s-stack>
        <s-text>Reason: {REASON_LABELS[r.reason] ?? r.reason}</s-text>
        {r.details && <s-paragraph>"{r.details}"</s-paragraph>}

        <s-stack direction="inline" gap="base">
          {r.orderLink && <s-link href={r.orderLink}>Open order</s-link>}
          {r.customerLink && <s-link href={r.customerLink}>Open customer</s-link>}
        </s-stack>

        {!pending && r.reviewNote && (
          <s-text color="subdued">Your note: {r.reviewNote}</s-text>
        )}

        {fetcher.data && "error" in fetcher.data && (
          <s-banner tone="critical">{fetcher.data.error}</s-banner>
        )}

        {pending && (
          <s-stack gap="small">
            <s-text-field
              label="Note (optional)"
              details="For your own records."
              value={note}
              onInput={(e) => setNote(e.currentTarget.value)}
            />
            <s-stack direction="inline" gap="small">
              <s-button variant="primary" loading={working} onClick={() => decide("approved")}>
                Approve
              </s-button>
              <s-button tone="critical" loading={working} onClick={() => decide("rejected")}>
                Reject
              </s-button>
            </s-stack>
            <s-text color="subdued">
              Approving does not refund anything. After you approve, issue the
              refund or replacement yourself in Shopify. The customer will see
              "Approved" or "Not approved" on their order page.
            </s-text>
          </s-stack>
        )}
      </s-stack>
    </s-box>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
