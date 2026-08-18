import * as crypto from "crypto";

// GET /stock/:sku was previously wide open — anyone who could reach
// the port could read Northstar's live inventory levels. This is a
// minimal API-key check, appropriate for an internal support-tool
// caller. Not meant to replace a real auth system (OAuth, mTLS,
// whatever Northstar's infra standardizes on) in a real deployment.

const READ_API_KEY = process.env.READ_API_KEY ?? "demo-read-key";

export function isValidApiKey(received: string | undefined): boolean {
  if (!received) return false;

  const expected = Buffer.from(READ_API_KEY);
  const receivedBuf = Buffer.from(received);

  if (expected.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expected, receivedBuf);
}
