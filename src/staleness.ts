import { getAllReadings } from "./db";

// P0 backlog item: polling had a built-in staleness ceiling (5 min).
// Webhook push has none — if the vendor's sender goes silent for a
// SKU, we'd otherwise serve a confidently-wrong "last known" value
// forever with nothing noticing. This surfaces that condition instead
// of hiding it.

const STALE_THRESHOLD_MS = Number(process.env.STALE_THRESHOLD_MS ?? 15 * 60 * 1000); // 15 min default

export interface StalenessReport {
  staleSkus: string[];
  freshSkus: string[];
  thresholdMs: number;
}

export function checkStaleness(): StalenessReport {
  const now = Date.now();
  const readings = getAllReadings();

  const staleSkus: string[] = [];
  const freshSkus: string[] = [];

  for (const reading of readings) {
    const ageMs = now - reading.checkedAt.getTime();
    if (ageMs > STALE_THRESHOLD_MS) {
      staleSkus.push(reading.sku);
    } else {
      freshSkus.push(reading.sku);
    }
  }

  return { staleSkus, freshSkus, thresholdMs: STALE_THRESHOLD_MS };
}
