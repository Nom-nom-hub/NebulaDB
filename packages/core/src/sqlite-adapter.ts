import { Adapter, Document } from './types';
import DatabaseConstructor from 'better-sqlite3';

/**
 * SQLite adapter for persistent storage using better-sqlite3
 * Each collection is a table, each document is a row (id as primary key, data as JSON)
 */
export class SQLiteAdapter implements Adapter {
  private db: InstanceType<typeof DatabaseConstructor>;

  constructor(dbPath: string) {
    this.db = new DatabaseConstructor(dbPath);
  }

  /**
   * Load all collections and documents from SQLite
   */
  async load(): Promise<Record<string, Document[]>> {
    const collections: Record<string, Document[]> = {};
    // Get all table names (collections)
    const tables = this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`).all() as Array<{ name: string }>;
    for (const { name } of tables) {
      const rows = this.db.prepare(`SELECT id, data FROM "${name}";`).all() as Array<{ id: string; data: string }>;
      collections[name] = rows.map((row: { id: string; data: string }) => ({ id: row.id, ...JSON.parse(row.data) }));
    }
    return collections;
  }

  /**
   * Save all collections and documents to SQLite
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    const tx = this.db.transaction(() => {
      for (const [collection, docs] of Object.entries(data)) {
        // Create table if not exists
        this.db.prepare(`CREATE TABLE IF NOT EXISTS "${collection}" (id TEXT PRIMARY KEY, data TEXT NOT NULL);`).run();
        // Clear table
        this.db.prepare(`DELETE FROM "${collection}";`).run();
        // Insert documents
        const insert = this.db.prepare(`INSERT INTO "${collection}" (id, data) VALUES (?, ?);`);
        for (const doc of docs) {
          const { id, ...rest } = doc;
          insert.run(id, JSON.stringify(rest));
        }
      }
    });
    tx();
  }

  /**
   * Close the SQLite connection
   */
  close(): void {
    this.db.close();
  }
} 