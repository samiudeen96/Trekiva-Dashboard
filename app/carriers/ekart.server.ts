import type { CarrierTracking, TrackingEvent, TrackingStage } from "./types";

const BASE_URL = "https://app.elite.ekartlogistics.in";
const TIMEOUT_MS = 8000;

// Ekart's documented tracking statuses (swift_status in their OpenAPI spec).
const STAGES: Record<string, TrackingStage> = {
  "Order Placed": "confirmed",
  "Pickup Pending": "confirmed",
  "Pickup Scheduled": "confirmed",
  "Out for Pickup": "confirmed",
  "Picked Up": "shipped",
  "In Transit": "shipped",
  "Out for Delivery": "out_for_delivery",
  Delivered: "delivered",
  Undelivered: "exception",
  "Shipment Delayed": "exception",
  "Not Picked": "exception",
  "Not Serviceable": "exception",
  Lost: "exception",
  Damaged: "exception",
  "RTO Requested": "returning",
  "Seller RTO Requested": "returning",
  "RTO In Transit": "returning",
  "RTO Out for Delivery": "returning",
  "RTO Delivered": "returning",
  "RTO Failed": "returning",
  "RTO Shipment Delayed": "returning",
  Cancelled: "cancelled",
  "Seller Cancelled": "cancelled",
  "Pickup Cancelled": "cancelled",
};

export function ekartStage(status: string): TrackingStage {
  return STAGES[status] ?? "unknown";
}

// Ekart timestamps are epoch numbers; accept seconds or milliseconds.
function toIso(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  const ms = value < 1e11 ? value * 1000 : value;
  return new Date(ms).toISOString();
}

type EkartDetail = { status: string; ctime: number; desc?: string; location?: string };
type EkartResponse = {
  edd?: number;
  track?: {
    status: string;
    ctime: number;
    desc?: string;
    location?: string;
    details?: EkartDetail[];
  };
};

export function parseEkart(body: EkartResponse): CarrierTracking | null {
  const track = body.track;
  if (!track?.status) return null;
  const events: TrackingEvent[] = (track.details ?? [])
    .map((d) => ({
      stage: ekartStage(d.status),
      label: d.status,
      description: d.desc ?? "",
      location: d.location ?? "",
      at: toIso(d.ctime),
    }))
    .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
  return {
    carrier: "ekart",
    stage: ekartStage(track.status),
    label: track.status,
    lastUpdate: toIso(track.ctime),
    estimatedDelivery: toIso(body.edd),
    events,
  };
}

// The tracking endpoint is documented as open, so no credentials are needed.
// Returns null when the carrier can't be reached or doesn't know the id.
export async function fetchEkartTracking(id: string): Promise<CarrierTracking | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/track/${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return parseEkart(await res.json());
  } catch {
    return null;
  }
}
