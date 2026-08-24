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

import express from "express";
import { initDb, closeDb } from "./db";        // durable SQLite persistence
import { webhookRouter } from "./webhook";     // webhook route with replay protection

const app = express();
app.use(express.json());

// mount webhook route
app.use("/webhook", webhookRouter);

export default app;

function startServer() {
  // open DB connection
  initDb();

  const server = app.listen(3000, () => {
    console.log("[main] server running on port 3000");
  });

  return server;
}

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
