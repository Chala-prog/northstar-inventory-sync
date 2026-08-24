import { getDb } from "./db";
import { TRACKED_SKUS } from "./config";

interface StalenessReport {
  staleSkus: string[];
  thresholdMs: number;
}

/**
 * Check for SKUs whose last reading is older than the threshold.
 */
export async function checkStaleness(thresholdMs = 5 * 60 * 1000): Promise<StalenessReport> {
  const db = getDb();

  // Get the most recent reading per SKU
  const rows = await db.all(`
    SELECT event_id AS sku, MAX(created_at) AS last_seen
    FROM events
    GROUP BY event_id
  `);

  const now = Date.now();
  const staleSkus: string[] = [];

  for (const sku of TRACKED_SKUS) {
    const row = rows.find((r) => r.sku === sku);
    if (!row) {
      // No reading yet → considered stale
      staleSkus.push(sku);
      continue;
    }
    const lastSeen = new Date(row.last_seen).getTime();
    if (now - lastSeen > thresholdMs) {
      staleSkus.push(sku);
    }
  }

  return { staleSkus, thresholdMs };
}
