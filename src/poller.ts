import { fetchStockLevel } from "./warehouseApi";
import { StockCache } from "./stockCache";
import { TRACKED_SKUS, getPollIntervalMs } from "./config";

async function pollOnce(cache: StockCache): Promise<void> {
  const startedAt = Date.now();
  let succeeded = 0;
  let failed = 0;

  // Poll SKUs concurrently — one slow/unavailable SKU shouldn't stall
  // the rest of the catalog for a full cycle.
  const results = await Promise.allSettled(
    TRACKED_SKUS.map((sku) => fetchStockLevel(sku))
  );

  results.forEach((result, i) => {
    const sku = TRACKED_SKUS[i];
    if (result.status === "fulfilled") {
      cache.set(result.value);
      succeeded++;
    } else {
      failed++;
      const reason =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
      console.error(`[poll] failed to refresh ${sku}: ${reason}`);
    }
  });

  const durationMs = Date.now() - startedAt;
  console.log(
    `[poll] cycle complete: ${succeeded} ok, ${failed} failed, ${durationMs}ms`
  );
}

export function startPolling(cache: StockCache): NodeJS.Timeout {
  const intervalMs = getPollIntervalMs();
  console.log(
    `[poll] starting — every ${intervalMs}ms, tracking ${TRACKED_SKUS.length} SKU(s)`
  );

  // Poll immediately on startup so the cache isn't empty while waiting
  // for the first interval to elapse, then continue on schedule.
  pollOnce(cache);
  return setInterval(() => {
    pollOnce(cache);
  }, intervalMs);
}
