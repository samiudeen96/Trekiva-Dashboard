import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { listCarrierSettings } from "../models/carrier.server";
import { countPendingReturns, getReturnSettings } from "../models/returns.server";
import { countOpenTickets } from "../models/support.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const [carriers, returnSettings, openTickets, pendingReturns] = await Promise.all([
    listCarrierSettings(shop),
    getReturnSettings(shop),
    countOpenTickets(shop),
    countPendingReturns(shop),
  ]);

  const liveCarriers = carriers.filter((c) => {
    if (!c.enabled) return false;
    if (c.carrier === "delhivery") return c.hasApiKey;
    if (c.carrier === "xpressbees") return Boolean(c.accountId) && c.hasPassword;
    return true;
  }).length;

  // Needed to store carrier passwords and tokens safely.
  const keyReady =
    Buffer.from(process.env.SETTINGS_ENCRYPTION_KEY ?? "", "base64").length === 32;

  return {
    openTickets,
    pendingReturns,
    liveCarriers,
    totalCarriers: carriers.length,
    returnsOpen: returnSettings.windowDays !== null,
    windowDays: returnSettings.windowDays,
    keyReady,
  };
};

export default function Index() {
  const d = useLoaderData<typeof loader>();

  return (
    <s-page heading="Trekiva Customer Account">
      <s-section>
        <s-stack gap="small">
          <s-heading>What needs your attention</s-heading>
          <s-text color="subdued">
            Customers use this app on their account pages. Requests they send
            show up here.
          </s-text>
        </s-stack>
      </s-section>

      <s-grid gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))" gap="base">
        <StatCard
          label="Support requests waiting"
          value={d.openTickets}
          hint={d.openTickets === 0 ? "All caught up" : "Customers are waiting for a reply"}
          href="/app/support"
          action="Open support requests"
          attention={d.openTickets > 0}
        />
        <StatCard
          label="Returns waiting for you"
          value={d.pendingReturns}
          hint={d.pendingReturns === 0 ? "All caught up" : "Approve or reject each request"}
          href="/app/returns"
          action="Open returns"
          attention={d.pendingReturns > 0}
        />
        <StatCard
          label="Carriers showing live tracking"
          value={`${d.liveCarriers} of ${d.totalCarriers}`}
          hint={d.liveCarriers === 0 ? "None connected yet" : "Customers see live status"}
          href="/app/settings"
          action="Carrier settings"
          attention={d.liveCarriers === 0}
        />
      </s-grid>

      <s-section heading="Setup checklist">
        <s-stack gap="base">
          <Step
            done={d.keyReady}
            title="Secure storage is ready"
            text={
              d.keyReady
                ? "Carrier passwords and tokens can be saved safely."
                : "The server is missing its encryption key, so carrier passwords can't be saved. Ask your developer to set SETTINGS_ENCRYPTION_KEY."
            }
            critical={!d.keyReady}
          />
          <Step
            done={d.liveCarriers > 0}
            title="Connect a carrier"
            text="Enter your eKart, Delhivery or XpressBees details so customers can see live tracking."
            href="/app/settings"
            action="Open carrier settings"
          />
          <Step
            done={d.returnsOpen}
            title="Set your return policy"
            text={
              d.returnsOpen
                ? `Customers can request returns within ${d.windowDays} days.`
                : "Choose how many days customers have to return an item. Until you do, returns stay closed."
            }
            href="/app/returns"
            action="Open return policy"
          />
          <Step
            done={false}
            neutral
            title="Switch the account pages on in Shopify"
            text="In Shopify, open Settings, then Customer accounts, then Customize. Turn on the Trekiva pages and add them to the account menu. You only do this once after the app is installed."
            href="shopify:admin/settings/customer_accounts"
            action="Open customer account settings"
          />
        </s-stack>
      </s-section>
    </s-page>
  );
}

function StatCard(props: {
  label: string;
  value: number | string;
  hint: string;
  href: string;
  action: string;
  attention: boolean;
}) {
  return (
    <s-box padding="base" border="base" borderRadius="base" background="subdued">
      <s-stack gap="small-200">
        <s-text color="subdued">{props.label}</s-text>
        <s-heading>{String(props.value)}</s-heading>
        <s-stack direction="inline" gap="small-200" alignItems="center">
          <s-badge tone={props.attention ? "caution" : "success"}>{props.hint}</s-badge>
        </s-stack>
        <s-link href={props.href}>{props.action}</s-link>
      </s-stack>
    </s-box>
  );
}

function Step(props: {
  done: boolean;
  title: string;
  text: string;
  href?: string;
  action?: string;
  critical?: boolean;
  neutral?: boolean;
}) {
  const badge = props.neutral
    ? { tone: "info" as const, label: "Do this in Shopify" }
    : props.done
      ? { tone: "success" as const, label: "Done" }
      : props.critical
        ? { tone: "critical" as const, label: "Needs attention" }
        : { tone: "caution" as const, label: "To do" };
  return (
    <s-stack gap="small-200">
      <s-stack direction="inline" gap="small" alignItems="center">
        <s-text type="strong">{props.title}</s-text>
        <s-badge tone={badge.tone}>{badge.label}</s-badge>
      </s-stack>
      <s-text color="subdued">{props.text}</s-text>
      {props.href && !props.done && <s-link href={props.href}>{props.action}</s-link>}
      <s-divider />
    </s-stack>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
