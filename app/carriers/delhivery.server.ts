import type { CarrierTracking, TrackingEvent, TrackingStage } from "./types";

const PRODUCTION = "https://track.delhivery.com";
const STAGING = "https://staging-express.delhivery.com";
const TIMEOUT_MS = 8000;

// Mapping follows Delhivery's published lifecycle: use Status together with
// StatusType (UD forward, DL delivered, RT return, PP/PU/CN reverse). A bare UD
// is NOT treated as a failed delivery; the carrier's own wording is always
// shown, so nothing is reworded into a claim the carrier didn't make.
export function delhiveryStage(
  status: string,
  statusType?: string,
  instructions?: string,
): TrackingStage {
  const s = status.trim().toLowerCase();
  const type = (statusType ?? "").toUpperCase();

  if (type === "DL" || s === "delivered") return "delivered";
  if (s === "cancelled" || s === "canceled" || type === "CN") return "cancelled";
  if (s === "rto" || s === "dto" || type === "RT" || type === "PP" || type === "PU" || s === "collected") {
    return "returning";
  }
  if (s === "pending" || s === "manifested" || s === "not picked") return "confirmed";
  // Delhivery uses "Dispatched" for the final leg; only call it out for
  // delivery when the carrier's own remark says so.
  if (s === "dispatched" && /out for delivery/i.test(instructions ?? "")) {
    return "out_for_delivery";
  }
  if (s === "in transit" || s === "dispatched" || s === "scheduled") return "shipped";
  return "unknown";
}

// Delhivery timestamps carry no timezone. They are Indian operations data, so
// they're read as IST (+05:30). Confirm against a real response.
function toIso(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  // A bare date (the expected delivery date) is read as midnight IST.
  const text = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(text);
  const d = new Date(hasZone ? text : `${text}+05:30`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

type Scan = {
  ScanDetail?: {
    Scan?: string;
    ScanType?: string;
    ScanDateTime?: string;
    ScannedLocation?: string;
    Instructions?: string;
  };
};
type DelhiveryResponse = {
  ShipmentData?: {
    Shipment?: {
      Status?: {
        Status?: string;
        StatusType?: string;
        StatusDateTime?: string;
        StatusLocation?: string;
        Instructions?: string;
      };
      ExpectedDeliveryDate?: string;
      Scans?: Scan[];
    };
  }[];
};

export function parseDelhivery(body: DelhiveryResponse): CarrierTracking | null {
  const shipment = body?.ShipmentData?.[0]?.Shipment;
  const status = shipment?.Status;
  if (!status?.Status) return null;

  const events: TrackingEvent[] = (shipment?.Scans ?? [])
    .map((s) => s.ScanDetail)
    .filter((d): d is NonNullable<Scan["ScanDetail"]> => Boolean(d?.Scan))
    .map((d) => ({
      stage: delhiveryStage(d.Scan!, d.ScanType, d.Instructions),
      label: d.Scan!,
      description: d.Instructions ?? "",
      location: d.ScannedLocation ?? "",
      at: toIso(d.ScanDateTime),
    }))
    .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));

  return {
    carrier: "delhivery",
    stage: delhiveryStage(status.Status, status.StatusType, status.Instructions),
    label: status.Status,
    lastUpdate: toIso(status.StatusDateTime),
    estimatedDelivery: toIso(shipment?.ExpectedDeliveryDate),
    events,
  };
}

// Called from the server only; the token never reaches the browser. Returns
// null for unknown waybills, auth failures, rate limits and network errors.
// The customer sees a neutral "unavailable" message, never the raw error.
export async function fetchDelhiveryTracking(
  awb: string,
  token: string,
  staging: boolean,
): Promise<CarrierTracking | null> {
  try {
    const url = new URL("/api/v1/packages/json/", staging ? STAGING : PRODUCTION);
    url.searchParams.set("waybill", awb);
    const res = await fetch(url, {
      headers: { Authorization: `Token ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[delhivery] tracking failed: HTTP ${res.status}`);
      return null;
    }
    return parseDelhivery(await res.json());
  } catch {
    console.warn("[delhivery] tracking request failed");
    return null;
  }
}
