// Day 4 pivot — service entry point.
//
// The vendor is killing the 5-minute polling API in 48 hours. This is
// no longer a poll-driven service: startPolling() is not called. Stock
// updates now arrive via POST /webhooks/stock-update (see server.ts),
// pushed by the warehouse the moment a level changes, instead of us
// asking every 5 minutes.
//
// Day 3's polling call site has been removed here, not commented out
// or left running alongside the webhook path — see poller.ts for the
// deprecation notice, and git history for the pre-pivot version.

import { StockCache } from "./stockCache";
import { startServer } from "./server";

function main() {
  const cache = new StockCache();

  const server = startServer(cache);

  const shutdown = () => {
    console.log("\n[main] shutting down...");
    server.close(() => {
      console.log("[main] server closed.");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
