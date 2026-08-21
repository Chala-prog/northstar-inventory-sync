import { fetchStockLevel } from "./warehouseApi";
import { StockCache } from "./stockCache";

const cache = new StockCache();

async function refreshSku(sku: string): Promise<void> {
  try {
    const reading = await fetchStockLevel(sku);
    cache.set(reading);
    console.log(`[cache] ${sku} -> ${reading.level} units (as of ${reading.checkedAt.toISOString()})`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[error] could not refresh ${sku}: ${message}`);
  }
}

async function main() {
  const skus = ["SKU-100", "SKU-205", "SKU-404", "SKU-317"];

  for (const sku of skus) {
    await refreshSku(sku);
  }

  console.log("\n--- query endpoint simulation ---");
  for (const sku of [...skus, "SKU-999-NOT-CACHED"]) {
    const reading = cache.get(sku);
    if (reading) {
      console.log(`GET /stock/${sku} -> 200 { level: ${reading.level} }`);
    } else {
      console.log(`GET /stock/${sku} -> 404 not in cache`);
    }
  }

  console.log(`\nCache holds ${cache.size()} SKU(s) after this run.`);
}

main();
