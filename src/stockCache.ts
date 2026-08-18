// DEPRECATED — superseded by db.ts (SQLite, persistent).
// This in-memory Map lost all data on every process restart, which is
// disqualifying for anything backing a live support tool. Kept for
// reference only; not imported by server.ts or index.ts.

import { StockReading } from "./warehouseApi";

/** @deprecated Superseded by db.ts. Not used by the running service. */
export class StockCache {
  private store: Map<string, StockReading> = new Map();

  set(reading: StockReading) {
    this.store.set(reading.sku, reading);
  }

  get(sku: string): StockReading | undefined {
    return this.store.get(sku);
  }

  has(sku: string): boolean {
    return this.store.has(sku);
  }

  size(): number {
    return this.store.size;
  }
}
