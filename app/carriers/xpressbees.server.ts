import type { CarrierTracking, TrackingEvent, TrackingStage } from "./types";

// Verified against a working integration (login, token lifetime, tracking path
// and status codes). The exact JSON shape of the tracking reply is NOT
// confirmed, so parsing is deliberately tolerant; see collectEvents.
const BASE_URL = "https://shipment.xpressbees.com/api";
const TIMEOUT_MS = 8000;
const SNIPPET_CHARS = 1500;
// Tokens last about 3 hours; refresh a little early.
const TOKEN_TTL_MS = 2.5 * 60 * 60 * 1000;

// Status codes documented for the tracking API.
const CODE_STAGES: Record<string, TrackingStage> = {
  PP: "confirmed", // pickup pending / out for pickup
  IT: "shipped",
  RAD: "shipped", // reached at destination
  FD: "out_for_delivery",
  EX: "exception", // customer unavailable, address problem, ...
  DL: "delivered",
  RT: "returning",
  "RT-IT": "returning",
  "RT-DL": "returning", // parcel is back with the seller
};

// Codes first, then labels seen in public tracking histories. Anything
// unrecognised stays "unknown" and is shown in the carrier's own words.
export function xpressbeesStage(...texts: (string | undefined)[]): TrackingStage {
  for (const text of texts) {
    const raw = (text ?? "").trim();
    if (!raw) continue;
    const byCode = CODE_STAGES[raw.toUpperCase()];
    if (byCode) return byCode;
    const k = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (k.startsWith("rto") || k.includes("returntoorigin") || k.includes("returndelivered")) return "returning";
    if (k === "delivered") return "delivered";
    if (k === "outfordelivery") return "out_for_delivery";
    if (k === "datareceived" || k === "outforpickup") return "confirmed";
    if (["picked", "pickdone", "pickedup", "intransit", "reachedatdestination"].includes(k)) return "shipped";
    if (k === "cancelled" || k === "canceled") return "cancelled";
  }
  return "unknown";
}

// event_time is Indian time. It may arrive as a Unix timestamp (older format)
// or a datetime string without a timezone; strings are read as IST (+05:30).
function toIso(value: unknown): string | null {
  const n = typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim()) ? Number(value) : value;
  if (typeof n === "number") {
    if (!Number.isFinite(n) || n <= 0) return null;
    return new Date(n < 1e11 ? n * 1000 : n).toISOString();
  }
  if (typeof n !== "string" || !n.trim()) return null;
  const text = n.trim().replace(" ", "T");
  const d = new Date(/([zZ]|[+-]\d{2}:?\d{2})$/.test(text) ? text : `${text}+05:30`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

type XbEvent = {
  status_code?: string;
  status?: string;
  ship_status?: string;
  message?: string;
  event_time?: string | number;
  location?: string;
};

// The documented scan fields are status code, location, time and message. The
// response may group scans by status or wrap them, so find every object that
// looks like a scan instead of relying on one layout.
function collectEvents(node: unknown, out: XbEvent[], depth = 0) {
  if (depth > 6 || node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectEvents(item, out, depth + 1);
    return;
  }
  const e = node as XbEvent;
  if (e.event_time != null && (e.status_code || e.status || e.ship_status)) {
    out.push(e);
    return;
  }
  for (const value of Object.values(node)) collectEvents(value, out, depth + 1);
}

export function parseXpressbees(body: unknown): CarrierTracking | null {
  const top = body as { response?: unknown; status?: unknown } | null;
  if (!top || typeof top !== "object" || top.response === false || top.status === false) {
    return null;
  }
  const raw: XbEvent[] = [];
  collectEvents(body, raw);
  const events: TrackingEvent[] = raw
    .map((e) => ({
      stage: xpressbeesStage(e.status_code, e.status, e.ship_status),
      label: e.status || e.ship_status || e.status_code || "",
      description: e.message ?? "",
      location: e.location ?? "",
      at: toIso(e.event_time),
    }))
    .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
  const current = events[0];
  if (!current) return null;
  return {
    carrier: "xpressbees",
    stage: current.stage,
    label: current.label,
    lastUpdate: current.at,
    estimatedDelivery: null,
    events,
  };
}

export type XpressbeesCredentials = { shop: string; email: string; password: string };

export type XpressbeesResult = {
  httpStatus: number | null;
  // First part of the raw tracking body, only used by the admin test tool.
  snippet: string;
  tracking: CarrierTracking | null;
  // Set when the problem is the login rather than the tracking number.
  problem: "login_failed" | "no_token" | null;
  detail: string;
};

const tokens = new Map<string, { token: string; expires: number }>();

function pickToken(body: unknown): string | null {
  const b = body as Record<string, unknown> | null;
  const data = b?.data as Record<string, unknown> | string | undefined;
  const candidates = [b?.token, b?.access_token, typeof data === "string" ? data : undefined,
    typeof data === "object" ? data?.token : undefined, typeof data === "object" ? data?.access_token : undefined];
  return (candidates.find((c) => typeof c === "string" && c) as string | undefined) ?? null;
}

async function login(c: XpressbeesCredentials) {
  const res = await fetch(`${BASE_URL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: c.email, password: c.password }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return { httpStatus: res.status, token: null, keys: [] as string[] };
  const body = await res.json().catch(() => null);
  const token = pickToken(body);
  // Only key names are kept for diagnostics, never values.
  const keys = body && typeof body === "object" ? Object.keys(body) : [];
  return { httpStatus: res.status, token, keys };
}

async function getToken(c: XpressbeesCredentials, force: boolean) {
  const key = `${c.shop}:${c.email}`;
  const hit = tokens.get(key);
  if (!force && hit && hit.expires > Date.now()) return { token: hit.token, failure: null };
  const r = await login(c);
  if (!r.token) {
    tokens.delete(key);
    return { token: null, failure: r };
  }
  tokens.set(key, { token: r.token, expires: Date.now() + TOKEN_TTL_MS });
  return { token: r.token, failure: null };
}

// Server-only: the password and token never reach the browser. Logs in (and
// logs in again on a 401 or 403), then reads the shipment's tracking.
export async function fetchXpressbees(awb: string, c: XpressbeesCredentials): Promise<XpressbeesResult> {
  const empty = { snippet: "", tracking: null, problem: null, detail: "" };
  try {
    for (const force of [false, true]) {
      const { token, failure } = await getToken(c, force);
      if (!token) {
        console.warn(`[xpressbees] login failed: HTTP ${failure?.httpStatus}`);
        return failure && failure.httpStatus !== null && failure.httpStatus < 400
          ? { ...empty, httpStatus: failure.httpStatus, problem: "no_token", detail: `Login replied but no token was found. Reply fields: ${failure.keys.join(", ") || "none"}` }
          : { ...empty, httpStatus: failure?.httpStatus ?? null, problem: "login_failed", detail: "" };
      }
      const res = await fetch(`${BASE_URL}/shipments2/track/${encodeURIComponent(awb)}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if ((res.status === 401 || res.status === 403) && !force) continue;
      const text = await res.text();
      if (!res.ok) {
        console.warn(`[xpressbees] tracking failed: HTTP ${res.status}`);
        return { ...empty, httpStatus: res.status, snippet: text.slice(0, SNIPPET_CHARS) };
      }
      let tracking: CarrierTracking | null = null;
      try {
        tracking = parseXpressbees(JSON.parse(text));
      } catch {
        tracking = null;
      }
      return { ...empty, httpStatus: res.status, snippet: text.slice(0, SNIPPET_CHARS), tracking };
    }
    return { ...empty, httpStatus: null };
  } catch {
    console.warn("[xpressbees] request failed");
    return { ...empty, httpStatus: null };
  }
}
