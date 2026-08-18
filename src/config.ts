// Central config for the Day 3 service.
//
// POLL_INTERVAL_MS defaults to the spec: poll every 5 minutes.
// It's overridable via POLL_INTERVAL_MS_OVERRIDE purely so this can be
// demoed locally without waiting 5 real minutes between polls — the
// override is explicit and logged at startup, never silent, and does
// not change the spec's default.

export const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function getPollIntervalMs(): number {
  const override = process.env.POLL_INTERVAL_MS_OVERRIDE;
  if (override) {
    const parsed = Number(override);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_POLL_INTERVAL_MS;
}

// The SKUs Northstar wants tracked. In the real system this would come
// from Northstar's product catalog; hardcoded here since catalog sync
// is out of scope for this prototype.
export const TRACKED_SKUS: string[] = [
  "SKU-100",
  "SKU-205",
  "SKU-317",
  "SKU-450",
];

export const SERVER_PORT = 4000;
