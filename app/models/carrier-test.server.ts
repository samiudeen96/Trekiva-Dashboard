import { fetchDelhiveryTracking } from "../carriers/delhivery.server";
import { fetchEkartTracking } from "../carriers/ekart.server";
import { fetchXpressbees } from "../carriers/xpressbees.server";
import type { CarrierTracking } from "../carriers/types";
import { STAGE_LABELS, formatDateTime } from "../utils/labels";
import { getCarrierCredentials, type CarrierId } from "./carrier.server";

export type CarrierTestResult = {
  ok: boolean;
  headline: string;
  lines: string[];
  // Raw start of the carrier's reply, shown only under "Technical details".
  snippet: string | null;
};

function success(t: CarrierTracking, snippet: string | null = null): CarrierTestResult {
  return {
    ok: true,
    headline: "It works. Tracking was found for this number.",
    lines: [
      `Status customers will see: ${STAGE_LABELS[t.stage] ?? t.stage} (the carrier says "${t.label}")`,
      t.lastUpdate ? `Last update: ${formatDateTime(t.lastUpdate)}` : "Last update: not reported",
      `History entries: ${t.events.length}`,
    ],
    snippet,
  };
}

const notFound = (name: string): CarrierTestResult => ({
  ok: false,
  headline: `${name} didn't return tracking for this number.`,
  lines: [
    "Check the number is correct and was booked with this carrier.",
    "A made-up number is expected to give this result. Try a real one too.",
  ],
  snippet: null,
});

// Admin-only: runs the real adapter for one tracking number so a real number,
// a made-up number and wrong credentials can each be checked before customers
// see anything. Never returns the password or token.
export async function testCarrier(
  shop: string,
  carrier: CarrierId,
  awb: string,
): Promise<CarrierTestResult> {
  const creds = await getCarrierCredentials(shop, carrier);
  if (!creds) {
    return {
      ok: false,
      headline: "Turn this carrier on and save before testing.",
      lines: [],
      snippet: null,
    };
  }

  if (carrier === "xpressbees") {
    if (!creds.accountId || !creds.password) {
      return {
        ok: false,
        headline: "Add your XpressBees email and password, then save.",
        lines: [],
        snippet: null,
      };
    }
    const r = await fetchXpressbees(awb, { shop, email: creds.accountId, password: creds.password });
    if (r.problem === "login_failed") {
      return {
        ok: false,
        headline: "XpressBees did not accept the email and password.",
        lines: [
          "Check them by signing in to the XpressBees panel.",
          "Ask XpressBees to switch on API access for your account.",
          `Technical detail: login replied with HTTP ${r.httpStatus ?? "no response"}.`,
        ],
        snippet: null,
      };
    }
    if (r.problem === "no_token") {
      return {
        ok: false,
        headline: "Login worked, but we couldn't read XpressBees' reply.",
        lines: ["Send the line below to your developer.", r.detail],
        snippet: null,
      };
    }
    if (r.tracking) return success(r.tracking, r.snippet || null);
    return {
      ok: false,
      headline: "Login worked, but no tracking was found for this number.",
      lines: [
        "If this is a real XpressBees number, send the technical details below to your developer.",
        `Technical detail: tracking replied with HTTP ${r.httpStatus ?? "no response"}.`,
      ],
      snippet: r.snippet || null,
    };
  }

  if (carrier === "ekart") {
    const t = await fetchEkartTracking(awb);
    return t ? success(t) : notFound("eKart");
  }

  if (!creds.apiKey) {
    return {
      ok: false,
      headline: "Add your Delhivery API token, then save.",
      lines: [],
      snippet: null,
    };
  }
  const t = await fetchDelhiveryTracking(awb, creds.apiKey, creds.useStaging);
  if (t) return success(t);
  return {
    ok: false,
    headline: "Delhivery didn't return tracking for this number.",
    lines: [
      "Check the number, and that the token matches the environment (test or live) you selected.",
      "A made-up number is expected to give this result. Try a real one too.",
    ],
    snippet: null,
  };
}
