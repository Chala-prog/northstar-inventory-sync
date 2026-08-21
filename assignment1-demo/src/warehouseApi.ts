// Mock warehouse API — stands in for Northstar's real inventory system.
// Mirrors what an unreliable third-party API tends to do: variable
// latency, and a hard failure for unknown SKUs.

export interface StockReading {
  sku: string;
  level: number;
  checkedAt: Date;
}

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
