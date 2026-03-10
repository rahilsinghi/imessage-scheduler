import Database from "better-sqlite3";
import type BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { config } from "../config.js";
import * as schema from "./schema.js";

const dataDir = path.dirname(config.databaseUrl);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`[db] Created data directory: ${dataDir}`);
}

const sqlite: BetterSqlite3.Database = new Database(config.databaseUrl);

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    phone_number TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'QUEUED',
    scheduled_at INTEGER NOT NULL,
    scheduled_for INTEGER,
    sent_at INTEGER,
    delivered_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Migration: add scheduled_for column if it doesn't exist (for existing databases)
const columns = sqlite.pragma("table_info(messages)") as Array<{ name: string }>;
const hasScheduledFor = columns.some((col) => col.name === "scheduled_for");
if (!hasScheduledFor) {
  sqlite.exec("ALTER TABLE messages ADD COLUMN scheduled_for INTEGER;");
  console.log("[db] Migrated: added scheduled_for column to messages table");
}

console.log(`[db] Connected to ${config.databaseUrl}`);

export const db = drizzle(sqlite, { schema });
export { sqlite };
