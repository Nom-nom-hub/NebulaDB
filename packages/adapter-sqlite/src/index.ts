import Database from 'better-sqlite3';
import type { Adapter, Document } from '@nebula-db/core';

export class SQLiteAdapter implements Adapter {
  private db: Database.Database;
  private filename: string;

  constructor(filename: string | ':memory:' = ':memory:') {
    this.filename = filename;
    this.db = new Database(filename);
    this.db.pragma('journal_mode = WAL');
  }

  async load(): Promise<Record<string, Document[]>> {
    const collections: Record<string, Document[]> = {};

    try {
      const tables = this.db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      ).all() as Array<{ name: string }>;

      for (const { name } of tables) {
        try {
          const docs = this.db.prepare(
            `SELECT id, data FROM "${name}";`
          ).all() as Array<{ id: string; data: string }>;

          collections[name] = docs.map((row) => ({
            id: row.id,
            ...JSON.parse(row.data)
          }));
        } catch {
          continue;
        }
      }
    } catch (error) {
      throw new Error(`Failed to load from SQLite: ${error}`);
    }

    return collections;
  }

  async save(data: Record<string, Document[]>): Promise<void> {
    try {
      const saveTransaction = this.db.transaction((collections: Record<string, Document[]>) => {
        for (const [collectionName, docs] of Object.entries(collections)) {
          this.db.prepare(
            `CREATE TABLE IF NOT EXISTS "${collectionName}" (id TEXT PRIMARY KEY, data TEXT NOT NULL);`
          ).run();

          this.db.prepare(`DELETE FROM "${collectionName}";`).run();

          const insert = this.db.prepare(
            `INSERT INTO "${collectionName}" (id, data) VALUES (?, ?);`
          );

          for (const doc of docs) {
            const { id, ...rest } = doc;
            insert.run(id, JSON.stringify(rest));
          }
        }
      });

      saveTransaction(data);
    } catch (error) {
      throw new Error(`Failed to save to SQLite: ${error}`);
    }
  }

  getDatabase(): Database.Database {
    return this.db;
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    try {
      const stmt = this.db.prepare(sql);
      return params ? stmt.all(...params) as T[] : stmt.all() as T[];
    } catch (error) {
      throw new Error(`Query failed: ${error}`);
    }
  }

  close(): void {
    this.db.close();
  }
}

export function createSQLiteAdapter(filename?: string): SQLiteAdapter {
  return new SQLiteAdapter(filename);
}