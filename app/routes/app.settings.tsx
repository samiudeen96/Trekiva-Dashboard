import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  isCarrier,
  listCarrierSettings,
  saveCarrierSettings,
  validateTrackingTemplate,
} from "../models/carrier.server";
import { testCarrier, type CarrierTestResult } from "../models/carrier-test.server";

type Result = {
  ok: boolean;
  carrier: string | null;
  error: string | null;
  test: CarrierTestResult | null;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return { carriers: await listCarrierSettings(session.shop) };
};

export const action = async ({ request }: ActionFunctionArgs): Promise<Result> => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const carrier = form.get("carrier");
  const fail = (error: string): Result => ({
    ok: false,
    carrier: isCarrier(carrier) ? carrier : null,
    error,
    test: null,
  });
  if (!isCarrier(carrier)) return fail("Something went wrong. Please refresh the page.");

  const str = (name: string) => String(form.get(name) ?? "").trim();

  if (form.get("intent") === "test") {
    const awb = str("awb");
    if (!awb || awb.length > 64) return fail("Type a tracking number to test.");
    return { ok: true, carrier, error: null, test: await testCarrier(session.shop, carrier, awb) };
  }

  const trackingUrlTemplate = str("trackingUrlTemplate");
  if (!validateTrackingTemplate(trackingUrlTemplate)) {
    return fail(
      "The backup link must start with https:// and contain {awb} where the tracking number goes.",
    );
  }
  await saveCarrierSettings(session.shop, carrier, {
    enabled: form.get("enabled") === "on",
    useStaging: form.get("useStaging") === "on",
    accountId: str("accountId"),
    trackingUrlTemplate,
    apiKey: str("apiKey"),
    password: str("password"),
  });
  return { ok: true, carrier, error: null, test: null };
};

// What each carrier needs, in plain words.
const INTRO: Record<string, string> = {
  ekart: "eKart tracking needs no login. Just switch it on.",
  delhivery: "Needs your Delhivery API token (from your Delhivery account).",
  xpressbees:
    "Needs the email and password you use to sign in to the XpressBees panel. API access must be switched on for your account.",
};

type CarrierRow = ReturnType<typeof useLoaderData<typeof loader>>["carriers"][number];

function readiness(c: CarrierRow) {
  if (c.carrier === "delhivery") return c.hasApiKey;
  if (c.carrier === "xpressbees") return Boolean(c.accountId) && c.hasPassword;
  return true;
}

function status(c: CarrierRow) {
  if (!c.enabled) return { tone: "neutral" as const, label: "Off" };
  if (!readiness(c)) return { tone: "warning" as const, label: "Needs details" };
  return { tone: "success" as const, label: "Live" };
}

export default function Settings() {
  const { carriers } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const busy = useNavigation().state === "submitting";

  return (
    <s-page heading="Carrier settings">
      <s-section>
        <s-stack gap="small">
          <s-heading>How this works</s-heading>
          <s-paragraph>
            Connect your couriers so customers can see live tracking on their
            order page. If a carrier is off, customers still get a link to the
            carrier's own website.
          </s-paragraph>
          <s-ordered-list>
            <s-list-item>Enter the details your carrier gave you.</s-list-item>
            <s-list-item>Switch the carrier on and press Save.</s-list-item>
            <s-list-item>Test with a real tracking number to check it works.</s-list-item>
          </s-ordered-list>
          <s-text color="subdued">
            Passwords and tokens are stored encrypted and are never shown again.
          </s-text>
        </s-stack>
      </s-section>

      {carriers.map((c) => {
        const mine = result?.carrier === c.carrier ? result : null;
        const st = status(c);
        return (
          <s-section key={c.carrier}>
            <s-stack gap="large">
              <s-stack direction="inline" gap="base" alignItems="center">
                <s-heading>{c.name}</s-heading>
                <s-badge tone={st.tone}>{st.label}</s-badge>
              </s-stack>
              <s-text color="subdued">{INTRO[c.carrier]}</s-text>

              {mine?.error && <s-banner tone="critical">{mine.error}</s-banner>}
              {mine?.ok && !mine.test && <s-banner tone="success">Saved.</s-banner>}

              <Form method="post">
                <input type="hidden" name="carrier" value={c.carrier} />
                <s-stack gap="base">
                  <s-checkbox
                    name="enabled"
                    label="Show live tracking to customers"
                    defaultChecked={c.enabled}
                  />

                  {c.carrier === "delhivery" && (
                    <>
                      <s-password-field
                        name="apiKey"
                        label="Delhivery API token"
                        details={
                          c.hasApiKey
                            ? "A token is saved. Leave this blank to keep it."
                            : "Paste your token here."
                        }
                      />
                      <s-checkbox
                        name="useStaging"
                        label="This is a test (staging) token"
                        details="Leave this unticked for real customer orders. Test and live tokens are different."
                        defaultChecked={c.useStaging}
                      />
                    </>
                  )}

                  {c.carrier === "xpressbees" && (
                    <>
                      <s-text-field
                        name="accountId"
                        label="XpressBees email"
                        details="The email you use to sign in to the XpressBees panel."
                        defaultValue={c.accountId}
                      />
                      <s-password-field
                        name="password"
                        label="XpressBees password"
                        details={
                          c.hasPassword
                            ? "A password is saved. Leave this blank to keep it."
                            : "The password for that email."
                        }
                      />
                    </>
                  )}

                  <s-text-field
                    name="trackingUrlTemplate"
                    label="Backup tracking link (optional)"
                    details="Customers see this link if live tracking isn't available. Put {awb} where the tracking number goes, for example https://example.com/track/{awb}"
                    defaultValue={c.trackingUrlTemplate}
                  />
                  <s-stack direction="inline">
                    <s-button type="submit" variant="primary" loading={busy}>
                      Save {c.name}
                    </s-button>
                  </s-stack>
                </s-stack>
              </Form>

              <s-divider />

              <Form method="post">
                <input type="hidden" name="carrier" value={c.carrier} />
                <input type="hidden" name="intent" value="test" />
                <s-stack gap="small">
                  <s-heading>Check it works</s-heading>
                  <s-text color="subdued">
                    Save first. Then type a real tracking number and press Run
                    test. A made-up number should say no tracking was found.
                  </s-text>
                  <s-text-field name="awb" label="Tracking number" />
                  <s-stack direction="inline">
                    <s-button type="submit" loading={busy}>
                      Run test
                    </s-button>
                  </s-stack>
                </s-stack>
              </Form>

              {mine?.test && <TestResult test={mine.test} />}
            </s-stack>
          </s-section>
        );
      })}
    </s-page>
  );
}

function TestResult({ test }: { test: CarrierTestResult }) {
  return (
    <s-banner tone={test.ok ? "success" : "warning"} heading={test.headline}>
      <s-stack gap="small">
        {test.lines.map((line) => (
          <s-text key={line}>{line}</s-text>
        ))}
        {test.snippet && (
          <s-stack gap="small-200">
            <s-text color="subdued">Technical details (for your developer):</s-text>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
              {test.snippet}
            </pre>
          </s-stack>
        )}
      </s-stack>
    </s-banner>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
