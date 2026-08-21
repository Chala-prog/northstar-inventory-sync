import { fetchStockLevel } from "./warehouseApi";
import { StockCache } from "./stockCache";
import { StockReading } from "./warehouseApi";

export interface RefreshManyResult {
  succeeded: StockReading[];
  failed: { sku: string; reason: string }[];
}

export async function refreshMany(
  cache: StockCache,
  skus: string[]
): Promise<RefreshManyResult> {
  // Promise.allSettled instead of Promise.all — one bad SKU must not
  // discard the readings that succeeded alongside it.
  const settled = await Promise.allSettled(skus.map((sku) => fetchStockLevel(sku)));

  const succeeded: StockReading[] = [];
  const failed: { sku: string; reason: string }[] = [];

  settled.forEach((result, i) => {
    if (result.status === "fulfilled") {
      cache.set(result.value);
      succeeded.push(result.value);
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      failed.push({ sku: skus[i], reason });
    }
  });

  return { succeeded, failed };
}
