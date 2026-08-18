import { DatabaseSync } from "node:sqlite";
import { StockReading } from "./warehouseApi";

// Durable storage for stock readings. Replaces the in-memory Map from
// earlier in the sprint — that cache lost every reading on restart,
// which is disqualifying for anything Northstar would actually run.
//
// Using Node's built-in node:sqlite (stable-ish since Node 22, requires
// --experimental-sqlite). Chosen specifically to avoid a native-compile
// dependency like better-sqlite3 for this prototype. For a real
// production deploy this would move to whatever Northstar's
// infrastructure already runs (Postgres, most likely) — swapping the
// implementation of this module wouldn't require touching server.ts,
// since callers only see the functions below.

const DB_PATH = process.env.DB_PATH ?? "./stock.db";

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS stock_readings (
    sku TEXT PRIMARY KEY,
    level INTEGER NOT NULL,
    checked_at TEXT NOT NULL
  )
`);

const upsertStmt = db.prepare(`
  INSERT INTO stock_readings (sku, level, checked_at)
  VALUES (?, ?, ?)
  ON CONFLICT(sku) DO UPDATE SET level = excluded.level, checked_at = excluded.checked_at
`);

const selectOneStmt = db.prepare(
  `SELECT sku, level, checked_at FROM stock_readings WHERE sku = ?`
);

const selectAllStmt = db.prepare(
  `SELECT sku, level, checked_at FROM stock_readings`
);

interface StockRow {
  sku: string;
  level: number;
  checked_at: string;
}

function rowToReading(row: StockRow): StockReading {
  return {
    sku: row.sku,
    level: row.level,
    checkedAt: new Date(row.checked_at),
  };
}

export function saveReading(reading: StockReading): void {
  upsertStmt.run(reading.sku, reading.level, reading.checkedAt.toISOString());
}

export function getReading(sku: string): StockReading | undefined {
  const row = selectOneStmt.get(sku) as StockRow | undefined;
  return row ? rowToReading(row) : undefined;
}

export function getAllReadings(): StockReading[] {
  const rows = selectAllStmt.all() as unknown as StockRow[];
  return rows.map(rowToReading);
}

export function closeDb(): void {
  db.close();
}
