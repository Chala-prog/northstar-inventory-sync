import { fetchStockLevel } from "./warehouseApi";
import { StockCache } from "./stockCache";

// A real task, sized specifically so it CANNOT finish inside the box
// declared in the journal for this session. The cutoff for this run
// is enforced externally (the OS `timeout` command, see journal
// Session 6) — not by this script noticing the clock and stopping
// itself. If self-discipline were the mechanism, this would just be
// Session 4/5 again.

const SKUS_TO_WARM = [
  "SKU-001", "SKU-002", "SKU-003", "SKU-004", "SKU-005",
  "SKU-006", "SKU-007", "SKU-008", "SKU-009", "SKU-010",
  "SKU-011", "SKU-012", "SKU-013", "SKU-014", "SKU-015",
  "SKU-016", "SKU-017", "SKU-018", "SKU-019", "SKU-020",
];

async function warmCache() {
  const cache = new StockCache();
  console.log(`[warm] starting sweep of ${SKUS_TO_WARM.length} SKUs, sequentially`);

  for (const sku of SKUS_TO_WARM) {
    const reading = await fetchStockLevel(sku);
    cache.set(reading);
    console.log(`[warm] ${sku} -> ${reading.level} units (cache size now ${cache.size()})`);
  }

  console.log(`[warm] sweep complete — ${cache.size()} SKUs cached`);
}

warmCache();
