import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";

let db: Database | null = null;

/**
 * Initialize SQLite database connection and schema.
 */
export async function initDb() {
  if (db) return db; // already initialized

  db = await open({
    filename: "inventory.db", // persistent file storage
    driver: sqlite3.Database,
  });

  // Create events table if not exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT UNIQUE,
      stock_update TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("[db] initialized and schema ensured.");
  return db;
}

/**
 * Get the active database connection.
 */
export function getDb(): Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return db;
}

/**
 * Close the database connection.
 */
export async function closeDb() {
  if (db) {
    await db.close();
    db = null;
    console.log("[db] connection closed.");
  }
}
