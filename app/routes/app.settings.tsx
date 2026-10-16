import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  isCarrier,
  listCarrierSettings,
  saveCarrierSettings,
  validateTrackingTemplate,
} from "../models/carrier.server";
import { testCarrier, type CarrierTestResult } from "../models/carrier-test.server";
import { EncryptionKeyError } from "../utils/crypto.server";

type Result = {
  ok: boolean;
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
  const fail = (error: string): Result => ({ ok: false, error, test: null });
  if (!isCarrier(carrier)) return fail("Something went wrong. Please refresh the page.");

  const str = (name: string) => String(form.get(name) ?? "").trim();

  if (form.get("intent") === "test") {
    const awb = str("awb");
    if (!awb || awb.length > 64) return fail("Type a tracking number to test.");
    return { ok: true, error: null, test: await testCarrier(session.shop, carrier, awb) };
  }

  const trackingUrlTemplate = str("trackingUrlTemplate");
  if (!validateTrackingTemplate(trackingUrlTemplate)) {
    return fail(
      "The backup link must start with https:// and contain {awb} where the tracking number goes.",
    );
  }
  try {
    await saveCarrierSettings(session.shop, carrier, {
      enabled: form.get("enabled") === "on",
      useStaging: form.get("useStaging") === "on",
      accountId: str("accountId"),
      trackingUrlTemplate,
      apiKey: str("apiKey"),
      password: str("password"),
    });
  } catch (error) {
    if (error instanceof EncryptionKeyError) {
      console.error(`[carrier-settings] ${error.message}`);
      return fail(
        "Nothing was saved. The server is missing its encryption key (SETTINGS_ENCRYPTION_KEY), so passwords and tokens can't be stored. Ask your developer to add it, then try again.",
      );
    }
    console.error("[carrier-settings] save failed:", error instanceof Error ? error.message : error);
    return fail("Nothing was saved. Something went wrong on the server. Please try again, or ask your developer to check the server log.");
  }
  return { ok: true, error: null, test: null };
};

// What each carrier needs, in plain words.
const INTRO: Record<string, string> = {
  ekart: "eKart tracking needs no login. Just switch it on.",
  delhivery: "Needs your Delhivery API token (from your Delhivery account).",
  xpressbees:
    "Needs the email and password you use to sign in to the XpressBees panel. API access must be switched on for your account.",
};

const MASK = "••••••••••••";

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
            Passwords and tokens are stored encrypted. After saving, they show as
            dots and are never displayed again. Leave them blank to keep what's saved.
          </s-text>
        </s-stack>
      </s-section>

      {carriers.map((c) => (
        <CarrierCard key={c.carrier} c={c} />
      ))}
    </s-page>
  );
}

function CarrierCard({ c }: { c: CarrierRow }) {
  const fetcher = useFetcher<typeof action>();
  const [enabled, setEnabled] = useState(c.enabled);
  const [useStaging, setUseStaging] = useState(c.useStaging);
  const [accountId, setAccountId] = useState(c.accountId);
  const [link, setLink] = useState(c.trackingUrlTemplate);
  const [apiKey, setApiKey] = useState("");
  const [password, setPassword] = useState("");
  const [awb, setAwb] = useState("");

  const busy = fetcher.state !== "idle";
  const result = fetcher.data;
  const justSaved = Boolean(result?.ok && !result.test);
  const st = status(c);

  // Once saved, clear what was typed. The saved secret now shows as dots.
  useEffect(() => {
    if (justSaved) {
      setApiKey("");
      setPassword("");
    }
  }, [justSaved]);

  // Sends exactly what is on screen, so nothing depends on the browser
  // collecting the fields of a form for us.
  const save = () =>
    fetcher.submit(
      {
        carrier: c.carrier,
        intent: "save",
        enabled: enabled ? "on" : "",
        useStaging: useStaging ? "on" : "",
        accountId,
        trackingUrlTemplate: link,
        apiKey,
        password,
      },
      { method: "post" },
    );

  const runTest = () =>
    fetcher.submit({ carrier: c.carrier, intent: "test", awb }, { method: "post" });

  return (
    <s-section>
      <s-stack gap="large">
        <s-stack direction="inline" gap="base" alignItems="center">
          <s-heading>{c.name}</s-heading>
          <s-badge tone={st.tone}>{st.label}</s-badge>
        </s-stack>
        <s-text color="subdued">{INTRO[c.carrier]}</s-text>

        {c.secretsUnreadable && (
          <s-banner tone="warning" heading="Saved details can't be read">
            <s-text>
              Details were saved before, but the server can no longer unlock them.
              This usually means the server's encryption key changed. Enter the
              details again and press Save.
            </s-text>
          </s-banner>
        )}
        {result?.error && <s-banner tone="critical">{result.error}</s-banner>}
        {justSaved && <s-banner tone="success">Saved.</s-banner>}

        <s-stack gap="base">
          <s-checkbox
            label="Show live tracking to customers"
            checked={enabled}
            onChange={(e) => setEnabled(e.currentTarget.checked)}
          />

          {c.carrier === "delhivery" && (
            <>
              <s-password-field
                label="Delhivery API token"
                placeholder={c.hasApiKey ? MASK : ""}
                details={
                  c.hasApiKey
                    ? "A token is saved. Leave this blank to keep it, or type a new one to replace it."
                    : "Paste your token here."
                }
                value={apiKey}
                onInput={(e) => setApiKey(e.currentTarget.value)}
              />
              <s-checkbox
                label="This is a test (staging) token"
                details="Leave this unticked for real customer orders. Test and live tokens are different."
                checked={useStaging}
                onChange={(e) => setUseStaging(e.currentTarget.checked)}
              />
            </>
          )}

          {c.carrier === "xpressbees" && (
            <>
              <s-text-field
                label="XpressBees email"
                details="The email you use to sign in to the XpressBees panel."
                value={accountId}
                onInput={(e) => setAccountId(e.currentTarget.value)}
              />
              <s-password-field
                label="XpressBees password"
                placeholder={c.hasPassword ? MASK : ""}
                details={
                  c.hasPassword
                    ? "A password is saved. Leave this blank to keep it, or type a new one to replace it."
                    : "The password for that email."
                }
                value={password}
                onInput={(e) => setPassword(e.currentTarget.value)}
              />
            </>
          )}

          <s-text-field
            label="Backup tracking link (optional)"
            details="Customers see this link if live tracking isn't available. Put {awb} where the tracking number goes, for example https://example.com/track/{awb}"
            value={link}
            onInput={(e) => setLink(e.currentTarget.value)}
          />
          <s-stack direction="inline">
            <s-button variant="primary" loading={busy} onClick={save}>
              Save {c.name}
            </s-button>
          </s-stack>
        </s-stack>

        <s-divider />

        <s-stack gap="small">
          <s-heading>Check it works</s-heading>
          <s-text color="subdued">
            Save first. Then type a real tracking number and press Run test. A
            made-up number should say no tracking was found.
          </s-text>
          <s-text-field
            label="Tracking number"
            value={awb}
            onInput={(e) => setAwb(e.currentTarget.value)}
          />
          <s-stack direction="inline">
            <s-button loading={busy} onClick={runTest}>
              Run test
            </s-button>
          </s-stack>
        </s-stack>

        {result?.test && <TestResult test={result.test} />}
      </s-stack>
    </s-section>
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
