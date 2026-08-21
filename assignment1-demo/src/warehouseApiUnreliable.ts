import { StockReading } from "./warehouseApi";

// A separate mock from warehouseApi.ts, deliberately: retry/backoff is
// meaningless against an endpoint that either always succeeds or
// always fails. This one simulates realistic flakiness — some SKUs
// fail transiently a few times before succeeding, one fails
// permanently (an unknown SKU is never going to start existing no
// matter how many times you ask).

export class TransientError extends Error {
  readonly retryable = true;
}

export class PermanentError extends Error {
  readonly retryable = false;
}

// Per-SKU attempt counters — module state, simulating a flaky
// connection that recovers after a couple of failures.
const attemptCounts = new Map<string, number>();

export function fetchStockLevelUnreliable(sku: string): Promise<StockReading> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (sku === "SKU-404") {
        // Permanent — the SKU genuinely doesn't exist. Retrying this
        // forever is pure waste; it will never succeed.
        reject(new PermanentError(`Warehouse API: unknown SKU "${sku}"`));
        return;
      }

      if (sku === "SKU-FLAKY") {
        const attempts = (attemptCounts.get(sku) ?? 0) + 1;
        attemptCounts.set(sku, attempts);

        if (attempts <= 2) {
          // Transient — simulates a dropped connection. Should
          // succeed if retried.
          reject(new TransientError(`Warehouse API: connection reset (attempt ${attempts})`));
          return;
        }
      }

      resolve({ sku, level: Math.floor(Math.random() * 100), checkedAt: new Date() });
    }, 100);
  });
}

// Test helper — resets the flaky SKU's attempt counter between test runs.
export function resetFlakyState(): void {
  attemptCounts.clear();
}
