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
  if (!isCarrier(carrier)) return fail("Unknown carrier.");

  const str = (name: string) => String(form.get(name) ?? "").trim();

  if (form.get("intent") === "test") {
    const awb = str("awb");
    if (!awb || awb.length > 64) return fail("Enter a tracking number to test.");
    return { ok: true, carrier, error: null, test: await testCarrier(session.shop, carrier, awb) };
  }

  const trackingUrlTemplate = str("trackingUrlTemplate");
  if (!validateTrackingTemplate(trackingUrlTemplate)) {
    return fail("The tracking link must be an https URL containing {awb}.");
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

export default function Settings() {
  const { carriers } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const busy = useNavigation().state === "submitting";

  return (
    <s-page heading="Carrier settings">
      {carriers.map((c) => {
        const mine = result?.carrier === c.carrier ? result : null;
        return (
          <s-section key={c.carrier} heading={c.name}>
            <s-stack gap="large">
              {mine?.error && <s-banner tone="critical">{mine.error}</s-banner>}
              {mine?.ok && !mine.test && <s-banner tone="success">Saved.</s-banner>}
              <Form method="post">
                <input type="hidden" name="carrier" value={c.carrier} />
                <s-stack gap="base">
                  <s-checkbox name="enabled" label="Enable live tracking" defaultChecked={c.enabled} />
                  {c.carrier === "delhivery" && (
                    <s-checkbox
                      name="useStaging"
                      label="Use Delhivery staging (test) environment"
                      details="Staging and production tokens are different. Leave off for live tracking."
                      defaultChecked={c.useStaging}
                    />
                  )}
                  {c.carrier === "ekart" && (
                    <s-text color="subdued">
                      eKart tracking needs no login. Just enable it.
                    </s-text>
                  )}
                  {c.carrier === "delhivery" && (
                    <s-password-field
                      name="apiKey"
                      label="API token"
                      details={c.hasApiKey ? "Saved. Leave blank to keep it." : "Not set."}
                    />
                  )}
                  {c.carrier === "xpressbees" && (
                    <>
                      <s-text-field
                        name="accountId"
                        label="XpressBees panel email"
                        details="The email you sign in to the XpressBees panel with. API access must be enabled on the account."
                        defaultValue={c.accountId}
                      />
                      <s-password-field
                        name="password"
                        label="XpressBees panel password"
                        details={c.hasPassword ? "Saved. Leave blank to keep it." : "Not set."}
                      />
                    </>
                  )}
                  <s-text-field
                    name="trackingUrlTemplate"
                    label="Customer tracking link"
                    details="Fallback link shown to customers. Use {awb} where the tracking number goes."
                    defaultValue={c.trackingUrlTemplate}
                  />
                  <s-button type="submit" loading={busy}>Save {c.name}</s-button>
                </s-stack>
              </Form>

              <Form method="post">
                <input type="hidden" name="carrier" value={c.carrier} />
                <input type="hidden" name="intent" value="test" />
                <s-stack gap="small">
                  <s-text-field
                    name="awb"
                    label="Test a tracking number"
                    details="Try a real number, then a made-up one, to check results and errors before customers see them. Save first."
                  />
                  <s-button type="submit" variant="secondary" loading={busy}>Run test</s-button>
                </s-stack>
              </Form>

              {mine?.test && (
                <s-banner tone="info">
                  <s-stack gap="small">
                    {mine.test.lines.map((l) => (
                      <s-text key={l}>{l}</s-text>
                    ))}
                    {mine.test.snippet && <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{mine.test.snippet}</pre>}
                  </s-stack>
                </s-banner>
              )}
            </s-stack>
          </s-section>
        );
      })}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
