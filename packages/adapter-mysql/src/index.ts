import mysql, { Pool, RowDataPacket } from 'mysql2/promise';
import { Adapter, Document } from '@nebula-db/core';

export interface MySQLOptions {
  host?: string;
  port?: number;
  user: string;
  password?: string;
  database: string;
}

export class MySQLAdapter implements Adapter {
  private pool: Pool;
  private options: MySQLOptions;

  constructor(options: MySQLOptions) {
    this.options = options;
    this.pool = mysql.createPool({
      host: options.host || 'localhost',
      port: options.port || 3306,
      user: options.user,
      password: options.password,
      database: options.database,
      waitForConnections: true,
      connectionLimit: 10
    });
  }

  async load(): Promise<Record<string, Document[]>> {
    const collections: Record<string, Document[]> = {};

    const [tables] = await this.pool.query<RowDataPacket[]>(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = ? AND table_type = 'BASE TABLE'`,
      [this.options.database]
    );

    for (const row of tables) {
      const tableName = row.TABLE_NAME as string;
      if (tableName.startsWith('nebula_')) continue;

      try {
        const [rows] = await this.pool.query<RowDataPacket[]>(
          `SELECT * FROM \`${tableName}\``
        );

        collections[tableName] = rows.map((row) => {
          const { _id, id, ...rest } = row as any;
          return {
            id: _id || id || row.id,
            ...rest
          };
        });
      } catch {
        continue;
      }
    }

    return collections;
  }

  async save(data: Record<string, Document[]>): Promise<void> {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      for (const [collectionName, docs] of Object.entries(data)) {
        const tableName = `\`${collectionName}\``;

        await connection.execute(
          `CREATE TABLE IF NOT EXISTS ${tableName} (
            id VARCHAR(255) PRIMARY KEY,
            data JSON
          )`
        );

        await connection.execute(`DELETE FROM ${tableName}`);

        for (const doc of docs) {
          const { id, ...rest } = doc;
          await connection.execute(
            `INSERT INTO ${tableName} (id, data) VALUES (?, ?)`,
            [id, JSON.stringify(rest)]
          );
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(sql, params);
    return rows as T[];
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export function createMySQLAdapter(options: MySQLOptions): MySQLAdapter {
  return new MySQLAdapter(options);
}