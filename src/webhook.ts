import { Router } from "express";
import { getDb } from "./db";

export const webhookRouter = Router();

/**
 * Replay-protected webhook route.
 * Accepts stock updates and persists them in SQLite.
 */
webhookRouter.post("/", async (req, res) => {
  const { event_id, stock_update } = req.body;

  if (!event_id) {
    return res.status(400).send({ error: "Missing event_id" });
  }

  const db = getDb();
  const exists = await db.get("SELECT 1 FROM events WHERE event_id = ?", [event_id]);

  if (exists) {
    return res.status(200).send({ status: "duplicate ignored" });
  }

  await db.run(
    "INSERT INTO events (event_id, stock_update, created_at) VALUES (?, ?, ?)",
    [event_id, stock_update, new Date().toISOString()]
  );

  res.status(200).send({ status: "processed" });
});
