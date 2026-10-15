// Carrier-neutral tracking shape. Each carrier adapter maps its own statuses
// into this, so the customer page never depends on one carrier's vocabulary.

export type TrackingStage =
  | "confirmed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "exception"
  | "returning"
  | "cancelled"
  | "unknown";

export type TrackingEvent = {
  stage: TrackingStage;
  // The carrier's own wording, shown as-is.
  label: string;
  description: string;
  location: string;
  // ISO time exactly as reported by the carrier, or null when not reported.
  at: string | null;
};

export type CarrierTracking = {
  carrier: string;
  stage: TrackingStage;
  label: string;
  lastUpdate: string | null;
  estimatedDelivery: string | null;
  // Newest first.
  events: TrackingEvent[];
};
