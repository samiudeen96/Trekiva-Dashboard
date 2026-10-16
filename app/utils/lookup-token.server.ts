import { createHmac, timingSafeEqual } from "node:crypto";

// A short-lived pass that proves "this visitor already gave the right email or
// phone for this order", so a refresh can show the result again without asking
// for, or storing, the email or phone. It names one shop and one order, expires,
// and can't be changed without the server's secret.

const TTL_MS = 2 * 60 * 60 * 1000;

function key(): Buffer {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) throw new Error("SHOPIFY_API_SECRET is not set");
  // A separate key for this purpose, derived from the app secret.
  return createHmac("sha256", secret).update("trekiva-public-tracking-pass-v1").digest();
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");

export function signLookup(shop: string, order: string, now = Date.now()): string {
  const payload = b64(JSON.stringify({ s: shop, o: order, e: now + TTL_MS }));
  const sig = b64(createHmac("sha256", key()).update(payload).digest());
  return `${payload}.${sig}`;
}

// True only for an untampered, unexpired pass for exactly this shop and order.
export function verifyLookup(
  token: unknown,
  shop: string,
  order: string,
  now = Date.now(),
): boolean {
  if (typeof token !== "string" || token.length > 400) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const want = createHmac("sha256", key()).update(payload).digest();
  let got: Buffer;
  try {
    got = Buffer.from(sig, "base64url");
  } catch {
    return false;
  }
  if (got.length !== want.length || !timingSafeEqual(got, want)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      s?: string;
      o?: string;
      e?: number;
    };
    return data.s === shop && data.o === order && typeof data.e === "number" && data.e > now;
  } catch {
    return false;
  }
}
