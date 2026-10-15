import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { listCarrierSettings } from "../models/carrier.server";

type CarrierRow = Awaited<ReturnType<typeof listCarrierSettings>>[number];

function isReady(c: CarrierRow) {
  if (c.carrier === "delhivery") return c.hasApiKey;
  if (c.carrier === "xpressbees") return Boolean(c.accountId) && c.hasPassword;
  return true; // eKart tracking needs no login
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const carriers = await listCarrierSettings(session.shop);

  // Needed to store carrier passwords and tokens safely.
  const keyReady =
    Buffer.from(process.env.SETTINGS_ENCRYPTION_KEY ?? "", "base64").length === 32;

  return {
    keyReady,
    carriers: carriers.map((c) => ({
      carrier: c.carrier,
      name: c.name,
      state: !c.enabled ? "off" : isReady(c) ? "live" : "needs_details",
    })),
  };
};

const CARRIER_BLURB: Record<string, string> = {
  ekart: "No login needed.",
  delhivery: "Needs your API token.",
  xpressbees: "Needs your panel email and password.",
};

const STATE_BADGE = {
  live: { tone: "success", label: "Live" },
  needs_details: { tone: "warning", label: "Needs details" },
  off: { tone: "neutral", label: "Off" },
} as const;

export default function Index() {
  const { carriers, keyReady } = useLoaderData<typeof loader>();
  const live = carriers.filter((c) => c.state === "live").length;

  return (
    <s-page heading="Order tracking">
      <s-section>
        <s-stack gap="small">
          <s-heading>Live tracking on your customers' order pages</s-heading>
          <s-paragraph>
            When a customer opens an order, they see where each parcel is, the
            last update, the expected delivery date and the full history. It
            works with eKart, Delhivery and XpressBees.
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section heading="Your carriers">
        <s-stack gap="base">
          <s-text color="subdued">
            {live === 0
              ? "No carrier is showing live tracking yet. Connect one to get started."
              : `${live} of ${carriers.length} carriers are showing live tracking.`}
          </s-text>
          <s-grid gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))" gap="base">
            {carriers.map((c) => {
              const badge = STATE_BADGE[c.state as keyof typeof STATE_BADGE];
              return (
                <s-box
                  key={c.carrier}
                  padding="base"
                  border="base"
                  borderRadius="base"
                  background="subdued"
                >
                  <s-stack gap="small">
                    <s-stack direction="inline" gap="small" alignItems="center">
                      <s-heading>{c.name}</s-heading>
                      <s-badge tone={badge.tone}>{badge.label}</s-badge>
                    </s-stack>
                    <s-text color="subdued">{CARRIER_BLURB[c.carrier]}</s-text>
                    <s-link href="/app/settings">
                      {c.state === "live" ? "Manage" : "Set up"}
                    </s-link>
                  </s-stack>
                </s-box>
              );
            })}
          </s-grid>
        </s-stack>
      </s-section>

      <s-section heading="Setup checklist">
        <s-stack gap="base">
          <Step
            state={keyReady ? "done" : "critical"}
            title="Secure storage is ready"
            text={
              keyReady
                ? "Carrier passwords and tokens can be saved safely."
                : "The server is missing its encryption key, so carrier passwords can't be saved. Ask your developer to set SETTINGS_ENCRYPTION_KEY."
            }
          />
          <Step
            state={live > 0 ? "done" : "todo"}
            title="Connect a carrier"
            text="Enter the details your carrier gave you, switch it on, and press Save."
            href="/app/settings"
            action="Open carrier settings"
          />
          <Step
            state="todo"
            title="Test with a real tracking number"
            text="On the carrier settings page, use Check it works with a real number. You should see the status and last update."
            href="/app/settings"
            action="Run a test"
          />
          <Step
            state="shopify"
            title="Show tracking on the order page"
            text="In Shopify, go to Settings, then Customer accounts, then Customize. Open the Order status page and add the Trekiva Order Tracking block. Save. You only do this once."
            href="shopify:admin/settings/customer_accounts"
            action="Open customer account settings"
          />
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Good to know">
        <s-stack gap="small">
          <s-text>
            <s-text type="strong">Carrier names matter.</s-text> Tracking is matched by
            the carrier name on the fulfillment, so it should contain eKart, Delhivery or
            XpressBees.
          </s-text>
          <s-text>
            <s-text type="strong">If a carrier is down</s-text>, customers see the last
            update we received, clearly marked, plus the carrier's own link.
          </s-text>
        </s-stack>
      </s-section>
    </s-page>
  );
}

function Step(props: {
  state: "done" | "todo" | "critical" | "shopify";
  title: string;
  text: string;
  href?: string;
  action?: string;
}) {
  const badge = {
    done: { tone: "success", label: "Done" },
    todo: { tone: "caution", label: "To do" },
    critical: { tone: "critical", label: "Needs attention" },
    shopify: { tone: "info", label: "Do this in Shopify" },
  }[props.state] as { tone: "success" | "caution" | "critical" | "info"; label: string };

  return (
    <s-stack gap="small-200">
      <s-stack direction="inline" gap="small" alignItems="center">
        <s-text type="strong">{props.title}</s-text>
        <s-badge tone={badge.tone}>{badge.label}</s-badge>
      </s-stack>
      <s-text color="subdued">{props.text}</s-text>
      {props.href && props.state !== "done" && (
        <s-link href={props.href}>{props.action}</s-link>
      )}
      <s-divider />
    </s-stack>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
