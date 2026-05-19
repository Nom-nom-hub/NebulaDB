import { createDb } from "@nebula-db/core";
import { FilesystemAdapter } from "@nebula-db/adapter-filesystem";
import path from "path";
import os from "os";
import fs from "fs";

/** Default persistence directory */
const DEFAULT_DIR = path.join(os.homedir(), ".swarm-jsonl-ingest", "db");

/**
 * Resolve the DB path without initializing.
 */
export function getDbPath(dataDir?: string): string {
  return dataDir || DEFAULT_DIR;
}

/**
 * Initialize NebulaDB with a filesystem-backed store.
 * Data persists at ~/.swarm-jsonl-ingest/db/ between sessions.
 */
export function initDb(dataDir?: string) {
  const dbPath = getDbPath(dataDir);
  const adapter = new FilesystemAdapter(dbPath);
  const db = createDb({ adapter });

  // Create collections
  const entries = db.collection("entries");
  const runs = db.collection("runs");

  return { db, entries, runs, adapter };
}

/**
 * Delete all persisted data, resetting the database to empty.
 */
export function resetDb(dataDir?: string): void {
  const dbPath = getDbPath(dataDir);
  try {
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath, { recursive: true, force: true });
      console.log(`  🗑  Cleared persistence directory: ${dbPath}`);
    } else {
      console.log(`  ℹ  No data directory found at ${dbPath}`);
    }
  } catch (err) {
    console.error(`  ❌ Failed to clear persistence directory: ${(err as Error).message}`);
    process.exit(1);
  }
}
