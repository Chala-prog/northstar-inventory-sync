// src/warehouseApi.ts
export interface StockReading {
  sku: string;
  level: number;
  checkedAt: Date;
}

/**
 * Simulated API call to fetch stock level for a SKU.
 * Replace with real integration later.
 */
export async function fetchStockLevel(sku: string): Promise<StockReading> {
  // Example: pretend we got a reading from an external API
  return {
    sku,
    level: Math.floor(Math.random() * 100), // random stock level
    checkedAt: new Date(),
  };
}
