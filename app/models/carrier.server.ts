import db from "../db.server";
import { decrypt, encrypt } from "../utils/crypto.server";

export const CARRIERS = [
  { id: "ekart", name: "eKart" },
  { id: "xpressbees", name: "XpressBees" },
  { id: "delhivery", name: "Delhivery" },
] as const;
export type CarrierId = (typeof CARRIERS)[number]["id"];

type Secrets = { apiKey?: string; password?: string };

export function isCarrier(value: unknown): value is CarrierId {
  return CARRIERS.some((c) => c.id === value);
}

// Safe for the browser: reports whether secrets exist, never their values.
export async function listCarrierSettings(shop: string) {
  const rows = await db.carrierSetting.findMany({ where: { shop } });
  return CARRIERS.map((c) => {
    const row = rows.find((r) => r.carrier === c.id);
    const secrets = row?.secretsEnc ? readSecrets(row.secretsEnc) : {};
    return {
      carrier: c.id,
      name: c.name,
      enabled: row?.enabled ?? false,
      useStaging: row?.useStaging ?? false,
      accountId: row?.accountId ?? "",
      trackingUrlTemplate: row?.trackingUrlTemplate ?? "",
      hasApiKey: Boolean(secrets.apiKey),
      hasPassword: Boolean(secrets.password),
    };
  });
}

function readSecrets(enc: string): Secrets {
  try {
    return JSON.parse(decrypt(enc));
  } catch {
    return {};
  }
}

// Server-only: used by the tracking integration, never by a route loader.
export async function getCarrierCredentials(shop: string, carrier: CarrierId) {
  const row = await db.carrierSetting.findUnique({
    where: { shop_carrier: { shop, carrier } },
  });
  if (!row?.enabled) return null;
  return {
    accountId: row.accountId,
    useStaging: row.useStaging,
    ...(row.secretsEnc ? readSecrets(row.secretsEnc) : {}),
  };
}

export function validateTrackingTemplate(value: string) {
  if (!value) return true;
  try {
    return new URL(value.replace("{awb}", "AWB")).protocol === "https:" &&
      value.includes("{awb}");
  } catch {
    return false;
  }
}

export async function saveCarrierSettings(
  shop: string,
  carrier: CarrierId,
  input: {
    enabled: boolean;
    useStaging: boolean;
    accountId: string;
    trackingUrlTemplate: string;
    apiKey: string;
    password: string;
  },
) {
  const existing = await db.carrierSetting.findUnique({
    where: { shop_carrier: { shop, carrier } },
  });
  // A blank secret field means "keep the saved value".
  const current = existing?.secretsEnc ? readSecrets(existing.secretsEnc) : {};
  const secrets: Secrets = {
    apiKey: input.apiKey || current.apiKey,
    password: input.password || current.password,
  };
  const secretsEnc =
    secrets.apiKey || secrets.password ? encrypt(JSON.stringify(secrets)) : null;
  const data = {
    enabled: input.enabled,
    useStaging: input.useStaging,
    accountId: input.accountId || null,
    trackingUrlTemplate: input.trackingUrlTemplate || null,
    secretsEnc,
  };
  await db.carrierSetting.upsert({
    where: { shop_carrier: { shop, carrier } },
    create: { shop, carrier, ...data },
    update: data,
  });
}
