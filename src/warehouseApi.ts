/**
 * Represents a stock reading pushed via webhook.
 * Matches the schema in db.ts (events table).
 */
export interface StockReading {
  sku: string;        // SKU identifier
  level: number;      // Stock level (units available)
  checkedAt: Date;    // Timestamp when the reading was received
}
