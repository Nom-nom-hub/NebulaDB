import { Pool, PoolConfig, QueryResult } from 'pg';
import type { Adapter, Document } from '@nebula-db/core';

export class PostgreSQLAdapter implements Adapter {
  private pool: Pool;
  private tableSuffix: string;

  constructor(config: string | PoolConfig = process.env.DATABASE_URL || 'postgres://localhost:5432/nebuladb') {
    const poolConfig: PoolConfig = typeof config === 'string'
      ? { connectionString: config }
      : config;
    
    this.tableSuffix = '';
    this.pool = new Pool(poolConfig);
  }

  private getTableName(collection: string): string {
    const sanitized = collection.replace(/[^a-zA-Z0-9_]/g, '_');
    return `"${sanitized}${this.tableSuffix}"`;
  }

  async load(): Promise<Record<string, Document[]>> {
    const collections: Record<string, Document[]> = {};

    try {
      const result = await this.pool.query(`
        SELECT table_name::text as table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%_documents'
      `);

      for (const row of result.rows) {
        const tableName = row.table_name;
        const collectionName = tableName.replace(/_documents$/, '');

        try {
          const docsResult = await this.pool.query(
            `SELECT id, data FROM ${tableName}`
          );

          collections[collectionName] = docsResult.rows.map((row) => ({
            id: row.id,
            ...row.data
          }));
        } catch {
          continue;
        }
      }
    } catch (error) {
      throw new Error(`Failed to load from PostgreSQL: ${error}`);
    }

    return collections;
  }

  async save(data: Record<string, Document[]>): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (const [collectionName, docs] of Object.entries(data)) {
        const tableName = this.getTableName(collectionName);
        
        await client.query(`
          CREATE TABLE IF NOT EXISTS ${tableName} (
            id TEXT PRIMARY KEY,
            data JSONB NOT NULL
          )
        `);

        await client.query(`DELETE FROM ${tableName}`);

        for (const doc of docs) {
          const { id, ...rest } = doc;
          await client.query(
            `INSERT INTO ${tableName} (id, data) VALUES ($1, $2)`,
            [id, JSON.stringify(rest)]
          );
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to save to PostgreSQL: ${error}`);
    } finally {
      client.release();
    }
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const result: QueryResult<T> = params
      ? await this.pool.query(sql, params)
      : await this.pool.query(sql);
    return result.rows;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export function createPostgreSQLAdapter(config?: string | PoolConfig): PostgreSQLAdapter {
  return new PostgreSQLAdapter(config);
}