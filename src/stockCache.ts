import { StockReading } from "./warehouseApi";

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
