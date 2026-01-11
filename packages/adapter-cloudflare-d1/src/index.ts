import type { Adapter, Document } from '@nebula-db/core';

/**
 * Cloudflare D1 Adapter for NebulaDB
 * Uses Cloudflare D1 (SQLite) for persistent storage in Workers and Pages
 * 
 * @example
 * ```typescript
 * import { CloudflareD1Adapter } from '@nebula-db/adapter-cloudflare-d1';
 * import { createDb } from '@nebula-db/core';
 * 
 * export default {
 *   async fetch(req, env) {
 *     const db = createDb({
 *       adapter: new CloudflareD1Adapter(env.DB)
 *     });
 *     
 *     const users = db.collection('users');
 *     await users.insert({ name: 'Alice' });
 *   }
 * };
 * ```
 */
export class CloudflareD1Adapter implements Adapter {
  private db: any;

  /**
   * Creates a new Cloudflare D1 adapter
   * @param database - Cloudflare D1 database instance from env.DB
   */
  constructor(database: any) {
    if (!database) {
      throw new Error('Cloudflare D1 database instance is required');
    }
    this.db = database;
  }

  /**
   * Load all collections and documents from D1
   */
  async load(): Promise<Record<string, Document[]>> {
    const collections: Record<string, Document[]> = {};

    try {
      // Get list of all tables (collections) from D1
      const tablesResult = await this.db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%';"
      ).all();

      const tables = (tablesResult.results as Array<{ name: string }>) || [];

      for (const { name } of tables) {
        try {
          // Load documents from each table
          const docsResult = await this.db.prepare(
            `SELECT id, data FROM "${name}";`
          ).all();

          const docs = (docsResult.results as Array<{ id: string; data: string }>) || [];
          collections[name] = docs.map((row) => ({
            id: row.id,
            ...JSON.parse(row.data)
          }));
        } catch {
          // Table might not exist yet, skip it
          continue;
        }
      }
    } catch (error) {
      throw new Error(`Failed to load from D1: ${error}`);
    }

    return collections;
  }

  /**
   * Save all collections and documents to D1
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    try {
      // Process each collection
      for (const [collectionName, docs] of Object.entries(data)) {
        // Create table if not exists
        await this.db.prepare(
          `CREATE TABLE IF NOT EXISTS "${collectionName}" (id TEXT PRIMARY KEY, data TEXT NOT NULL);`
        ).run();

        // Clear table
        await this.db.prepare(
          `DELETE FROM "${collectionName}";`
        ).run();

        // Insert all documents
        for (const doc of docs) {
          const { id, ...rest } = doc;
          await this.db.prepare(
            `INSERT INTO "${collectionName}" (id, data) VALUES (?, ?);`
          ).bind(id, JSON.stringify(rest)).run();
        }
      }
    } catch (error) {
      throw new Error(`Failed to save to D1: ${error}`);
    }
  }

  /**
   * Get the underlying D1 database instance
   */
  getDatabase(): any {
    return this.db;
  }

  /**
   * Execute a raw SQL query (advanced usage)
   */
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    try {
      const result = await this.db.prepare(sql).bind(...(params || [])).all();
      return (result.results || []) as T[];
    } catch (error) {
      throw new Error(`Query failed: ${error}`);
    }
  }
}

/**
 * Create a Cloudflare D1 adapter instance
 */
export function createCloudflareD1Adapter(database: any): CloudflareD1Adapter {
  return new CloudflareD1Adapter(database);
}
