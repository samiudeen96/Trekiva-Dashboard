import { randomBytes } from "node:crypto";

// No 0/O/1/I so references are easy to read out over the phone.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newReference(prefix: string) {
  let code = "";
  for (const b of randomBytes(6)) code += ALPHABET[b % ALPHABET.length];
  return `${prefix}-${code}`;
}
