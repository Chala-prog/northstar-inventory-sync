// Mock warehouse API — stands in for Northstar's real inventory system.
// Mirrors what an unreliable third-party API tends to do: variable
// latency, and a hard failure for unknown SKUs.

export interface StockReading {
  sku: string;
  level: number;
  checkedAt: Date;
}

// DEPRECATED (Day 4 pivot) — this mock represented the polling-based
// warehouse API killed by the vendor. Kept for reference only; the
// running service no longer calls it (see poller.ts's deprecation
// notice). Reachable from server.ts, StockCache and StockReading below
// are the only pieces of this file still in the active path.

/** @deprecated Polling API killed Day 4. Not called by the running service. */
export function fetchStockLevel(sku: string): Promise<StockReading> {
  return new Promise<StockReading>((resolve, reject) => {
    setTimeout(() => {
      if (sku === "SKU-404") {
        reject(new Error(`Warehouse API: unknown SKU "${sku}"`));
        return;
      }
      const level = Math.floor(Math.random() * 100);
      resolve({ sku, level, checkedAt: new Date() });
    }, 200);
  });
}
