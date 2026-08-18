// Hardening pass — persistence, staleness detection, read-side auth.
//
// The webhook-push architecture from Day 4 was correct in shape but
// not production-viable: the cache was an in-memory Map, meaning every
// restart silently lost all inventory data. This entry point now wires
// in durable storage (db.ts, SQLite) instead of a Map — the service
// survives a restart with its data intact.
//
// StockCache (in-memory) is no longer used by the running service —
// superseded by db.ts, same discipline as the Day 4 pivot: marked
// deprecated, not left running alongside its replacement.

import { startServer } from "./server";
import { closeDb } from "./db";

function main() {
  const server = startServer();

  const shutdown = () => {
    console.log("\n[main] shutting down...");
    server.close(() => {
      closeDb();
      console.log("[main] server closed, db closed.");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
