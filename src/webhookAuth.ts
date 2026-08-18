import * as crypto from "crypto";

// Demo secret — in production this comes from Northstar's webhook
// vendor config, injected via env var. Documented default here so the
// prototype and the test harness agree without extra setup.
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "demo-shared-secret";

export function computeSignature(rawBody: string): string {
  return crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
}

export function verifySignature(rawBody: string, receivedSig: string | undefined): boolean {
  if (!receivedSig) return false;

  const expected = computeSignature(rawBody);

  // Timing-safe comparison — a plain === here would leak timing info
  // about how many leading bytes matched, which defeats the point of
  // signing the payload in the first place.
  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(receivedSig, "hex");

  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}
