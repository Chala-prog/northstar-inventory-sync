// DEPRECATED — Day 4 pivot.
//
// The warehouse's 5-minute polling API is being killed by the vendor
// with no extension. This module is NOT invoked anywhere in the running
// service (see index.ts) — it is kept only so the Day 3 polling
// architecture remains visible in the codebase for reference/diffing
// against the webhook-push replacement in server.ts + webhookAuth.ts.
//
// Per the sprint's non-negotiable rules, deprecated code must not run
// side-by-side with its replacement — this file is inert.

import { fetchStockLevel } from "./warehouseApi";
import { StockCache } from "./stockCache";
import { TRACKED_SKUS, getPollIntervalMs } from "./config";

/** @deprecated Superseded by the webhook receiver in server.ts (Day 4 pivot). Not called. */
async function pollOnce(cache: StockCache): Promise<void> {
  const results = await Promise.allSettled(
    TRACKED_SKUS.map((sku) => fetchStockLevel(sku))
  );
  results.forEach((result, i) => {
    if (result.status === "fulfilled") cache.set(result.value);
  });
}

/** @deprecated Superseded by the webhook receiver in server.ts (Day 4 pivot). Not called. */
export function startPolling(cache: StockCache): NodeJS.Timeout {
  const intervalMs = getPollIntervalMs();
  pollOnce(cache);
  return setInterval(() => pollOnce(cache), intervalMs);
}
