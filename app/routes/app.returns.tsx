import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  getReturnSettings,
  listReturnRequests,
  reviewReturnRequest,
  saveReturnSettings,
} from "../models/returns.server";

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
      customerId: r.customerId,
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
      return { error: "Return window must be a whole number of days from 1 to 365." };
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
  return { error: "Unknown action." };
};

export default function Returns() {
  const { settings, requests } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const error = result && "error" in result ? result.error : null;

  return (
    <s-page heading="Returns and exchanges">
      {error && <s-banner tone="critical">{error}</s-banner>}

      <s-section heading="Policy">
        <Form method="post">
          <input type="hidden" name="intent" value="settings" />
          <s-stack gap="base">
            <s-number-field
              name="windowDays"
              label="Return window (days)"
              details="Counted from delivery, or from the shipment date when delivery isn't recorded in Shopify. Leave blank to keep returns closed."
              defaultValue={settings.windowDays?.toString() ?? ""}
            />
            <s-checkbox
              name="exchangesEnabled"
              label="Allow exchange requests"
              defaultChecked={settings.exchangesEnabled}
            />
            <s-text-field
              name="finalSaleTag"
              label="Final-sale product tag"
              details="Products with this tag can't be returned. Leave blank for none."
              defaultValue={settings.finalSaleTag}
            />
            <s-button type="submit">Save policy</s-button>
          </s-stack>
        </Form>
      </s-section>

      {requests.length === 0 ? (
        <s-section heading="Requests">
          <s-paragraph>No return requests yet.</s-paragraph>
        </s-section>
      ) : (
        requests.map((r) => (
          <s-section key={r.id} heading={`${r.reference} · ${r.orderName} · ${r.type}`}>
            <s-stack gap="small">
              <s-text color="subdued">
                {new Date(r.createdAt).toLocaleString()} · {r.status} · reason: {r.reason}
              </s-text>
              <s-text color="subdued">Customer: {r.customerId}</s-text>
              {r.items.map((i) => (
                <s-text key={i.id}>
                  {i.quantity} × {i.title}
                </s-text>
              ))}
              {r.details && <s-paragraph>{r.details}</s-paragraph>}
              {r.reviewNote && <s-text color="subdued">Note: {r.reviewNote}</s-text>}
              {r.status === "requested" && (
                <Form method="post">
                  <input type="hidden" name="id" value={r.id} />
                  <s-stack gap="small">
                    <s-text-field name="note" label="Note to keep with this decision (optional)" />
                    <s-stack direction="inline" gap="small">
                      <button type="submit" name="intent" value="approved">Approve</button>
                      <button type="submit" name="intent" value="rejected">Reject</button>
                    </s-stack>
                  </s-stack>
                </Form>
              )}
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
