import { unauthenticated } from "../shopify.server";
import { fetchDelhiveryTracking } from "../carriers/delhivery.server";
import { fetchEkartTracking } from "../carriers/ekart.server";
import { fetchXpressbees } from "../carriers/xpressbees.server";
import db from "../db.server";
import type { CarrierTracking } from "../carriers/types";
import { getCarrierCredentials, listCarrierSettings } from "./carrier.server";

const ORDER_QUERY = `#graphql
  query TrackingOrder($id: ID!) {
    order(id: $id) {
      customer { id }
      fulfillments(first: 20) {
        id
        trackingInfo(first: 5) { number company url }
      }
    }
  }
`;

type Shipment = {
  fulfillmentId: string;
  company: string | null;
  number: string;
  // Fallback link, built from the merchant's template or Shopify's own url.
  carrierUrl: string | null;
  tracking: CarrierTracking | null;
  // True when live tracking failed and tracking is the last saved result.
  stale: boolean;
  syncedAt: string | null;
};

const FRESH_MS = 60_000;

// Serves a saved snapshot while it is fresh (or the shipment is delivered, which
// is final), otherwise asks the carrier. If the carrier fails, the last saved
// result is returned marked stale rather than hiding tracking. Keyed by shop,
// carrier and number, and only reached after the order's owner is verified.
export async function trackWithSnapshot(
  shop: string,
  carrier: string,
  awb: string,
  fetcher: () => Promise<CarrierTracking | null>,
) {
  const key = { shop_carrier_awb: { shop, carrier, awb } };
  const row = await db.trackingSnapshot.findUnique({ where: key });
  let saved: CarrierTracking | null = null;
  if (row) {
    try {
      saved = JSON.parse(row.data) as CarrierTracking;
    } catch {
      saved = null;
    }
  }
  if (row && saved && (saved.stage === "delivered" || Date.now() - row.syncedAt.getTime() < FRESH_MS)) {
    return { tracking: saved, stale: false, syncedAt: row.syncedAt.toISOString() };
  }
  const live = await fetcher();
  if (live) {
    const now = new Date();
    const data = JSON.stringify(live);
    await db.trackingSnapshot.upsert({
      where: key,
      create: { shop, carrier, awb, data, syncedAt: now },
      update: { data, syncedAt: now },
    });
    return { tracking: live, stale: false, syncedAt: now.toISOString() };
  }
  if (row && saved) {
    return { tracking: saved, stale: true, syncedAt: row.syncedAt.toISOString() };
  }
  return { tracking: null, stale: false, syncedAt: null };
}

function carrierFor(company: string | null) {
  const name = (company ?? "").toLowerCase();
  if (name.includes("ekart")) return "ekart" as const;
  if (name.includes("delhivery")) return "delhivery" as const;
  if (name.includes("xpressbees") || name.includes("xpress bees")) return "xpressbees" as const;
  return null;
}

// Tracking numbers come from the order's fulfillments in Shopify, never from
// the browser. Returns null when the order isn't this customer's.
export async function getOrderTracking(
  shop: string,
  customerId: string,
  orderId: string,
): Promise<Shipment[] | null> {
  const { admin } = await unauthenticated.admin(shop);
  const res = await admin.graphql(ORDER_QUERY, { variables: { id: orderId } });
  const { data } = await res.json();
  const order = data?.order;
  if (!order || order.customer?.id !== customerId) return null;

  const settings = await listCarrierSettings(shop);
  const template = (id: string) =>
    settings.find((s) => s.carrier === id)?.trackingUrlTemplate || null;

  const shipments: Shipment[] = [];
  for (const f of order.fulfillments as {
    id: string;
    trackingInfo: { number: string | null; company: string | null; url: string | null }[];
  }[]) {
    for (const info of f.trackingInfo) {
      if (!info.number) continue;
      const carrier = carrierFor(info.company);
      const tpl = carrier ? template(carrier) : null;
      shipments.push({
        fulfillmentId: f.id,
        company: info.company,
        number: info.number,
        carrierUrl: tpl ? tpl.replace("{awb}", encodeURIComponent(info.number)) : info.url,
        tracking: null,
        stale: false,
        syncedAt: null,
      });
    }
  }

  // Fetch live tracking in parallel, only for carriers that are switched on.
  const ekartOn = (await getCarrierCredentials(shop, "ekart")) !== null;
  const delhivery = await getCarrierCredentials(shop, "delhivery");
  const xb = await getCarrierCredentials(shop, "xpressbees");
  await Promise.all(
    shipments.map(async (s) => {
      const carrier = carrierFor(s.company);
      let result: Awaited<ReturnType<typeof trackWithSnapshot>> | null = null;
      if (carrier === "ekart" && ekartOn) {
        result = await trackWithSnapshot(shop, "ekart", s.number, () => fetchEkartTracking(s.number));
      } else if (carrier === "delhivery" && delhivery?.apiKey) {
        const { apiKey, useStaging } = delhivery;
        result = await trackWithSnapshot(shop, `delhivery:${useStaging ? "staging" : "live"}`, s.number, () =>
          fetchDelhiveryTracking(s.number, apiKey, useStaging),
        );
      } else if (carrier === "xpressbees" && xb?.accountId && xb.password) {
        const creds = { shop, email: xb.accountId, password: xb.password };
        result = await trackWithSnapshot(shop, "xpressbees", s.number, async () => (await fetchXpressbees(s.number, creds)).tracking);
      }
      if (result) Object.assign(s, result);
    }),
  );
  return shipments;
}
