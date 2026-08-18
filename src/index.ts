// Day 3 service entry point — original spec:
//   poll a warehouse API every 5 minutes, cache stock, expose a query
//   endpoint.
//
// Days 1-2's one-shot demo (fetch a few SKUs once, print, exit) has
// been replaced by this long-running service. See git history for the
// Day 1-2 version if it's needed for reference.

import { StockCache } from "./stockCache";
import { startPolling } from "./poller";
import { startServer } from "./server";

function main() {
  const cache = new StockCache();

  const server = startServer(cache);
  const pollHandle = startPolling(cache);

  const shutdown = () => {
    console.log("\n[main] shutting down...");
    clearInterval(pollHandle);
    server.close(() => {
      console.log("[main] server closed.");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
