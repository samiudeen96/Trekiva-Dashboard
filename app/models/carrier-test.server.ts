import { fetchDelhiveryTracking } from "../carriers/delhivery.server";
import { fetchEkartTracking } from "../carriers/ekart.server";
import { fetchXpressbees } from "../carriers/xpressbees.server";
import type { CarrierTracking } from "../carriers/types";
import { getCarrierCredentials, type CarrierId } from "./carrier.server";

export type CarrierTestResult = { lines: string[]; snippet: string | null };

function describe(t: CarrierTracking) {
  return [
    `Parsed OK: ${t.label} (shown to customers as "${t.stage}")`,
    `Last update: ${t.lastUpdate ?? "not reported"}`,
    `Events: ${t.events.length}`,
  ];
}

// Admin-only: runs the real adapter for one tracking number so the live
// response, an unknown number and a bad token can each be checked before
// customers see anything. Never returns the token.
export async function testCarrier(
  shop: string,
  carrier: CarrierId,
  awb: string,
): Promise<CarrierTestResult> {
  const creds = await getCarrierCredentials(shop, carrier);
  if (!creds) {
    return { lines: ["Enable this carrier and save it first."], snippet: null };
  }

  if (carrier === "xpressbees") {
    if (!creds.accountId || !creds.password) {
      return { lines: ["Add the XpressBees panel email and password first."], snippet: null };
    }
    const r = await fetchXpressbees(awb, { shop, email: creds.accountId, password: creds.password });
    if (r.problem === "login_failed") {
      return {
        lines: [
          `Login failed (HTTP ${r.httpStatus ?? "no response"}). Check the panel email and password, and that API access is enabled on the XpressBees account.`,
        ],
        snippet: null,
      };
    }
    if (r.problem === "no_token") return { lines: [r.detail], snippet: null };
    const lines = [`Login OK. Tracking HTTP status: ${r.httpStatus ?? "no response (network error or timeout)"}`];
    lines.push(
      ...(r.tracking
        ? describe(r.tracking)
        : ["Could not read tracking from this response. Check the snippet below."]),
    );
    return { lines, snippet: r.snippet || null };
  }

  const tracking =
    carrier === "ekart"
      ? await fetchEkartTracking(awb)
      : creds.apiKey
        ? await fetchDelhiveryTracking(awb, creds.apiKey, creds.useStaging)
        : null;
  return {
    lines: tracking
      ? describe(tracking)
      : ["No tracking returned. Check the number, the token and the environment."],
    snippet: null,
  };
}
