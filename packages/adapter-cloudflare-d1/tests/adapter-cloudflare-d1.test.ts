import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CloudflareD1Adapter, createCloudflareD1Adapter } from '../src/index';
import type { Document } from '@nebula-db/core';

/**
 * Mock Cloudflare D1 database for testing
 */
class MockD1Database {
  private tables: Map<string, Map<string, any>> = new Map();

  prepare(sql: string) {
    const self = this;
    return {
      bind(...params: any[]) {
        return this;
      },
      async all() {
        // Parse CREATE TABLE, SELECT, DELETE statements
        if (sql.includes('sqlite_master')) {
          // List tables
          const tableNames = Array.from(self.tables.keys()).map(name => ({
            name
          }));
          return { results: tableNames };
        } else if (sql.includes('SELECT id, data FROM')) {
          // Extract table name from SQL
          const match = sql.match(/FROM "([^"]+)"/);
          const tableName = match ? match[1] : '';

          if (!self.tables.has(tableName)) {
            return { results: [] };
          }

          const docs = Array.from(self.tables.get(tableName)!.values());
          return { results: docs };
        } else if (sql.includes('SELECT *')) {
          // Generic SELECT
          return { results: [] };
        }

        return { results: [] };
      },
      async run() {
        // Parse CREATE TABLE, INSERT, DELETE statements
        if (sql.includes('CREATE TABLE')) {
          const match = sql.match(/CREATE TABLE IF NOT EXISTS "([^"]+)"/);
          if (match) {
            const tableName = match[1];
            if (!self.tables.has(tableName)) {
              self.tables.set(tableName, new Map());
            }
          }
        } else if (sql.includes('DELETE FROM')) {
          const match = sql.match(/DELETE FROM "([^"]+)"/);
          if (match) {
            const tableName = match[1];
            if (self.tables.has(tableName)) {
              self.tables.get(tableName)!.clear();
            }
          }
        } else if (sql.includes('INSERT INTO')) {
          const match = sql.match(/INSERT INTO "([^"]+)"/);
          if (match) {
            const tableName = match[1];
            if (!self.tables.has(tableName)) {
              self.tables.set(tableName, new Map());
            }
            // Get first bind param as id, second as data
            // This is a simplified mock
          }
        }

        return { success: true };
      }
    };
  }

  // Helper to directly set data for testing
  setTableData(tableName: string, data: Map<string, any>): void {
    this.tables.set(tableName, new Map(data));
  }

  // Helper to get table data
  getTableData(tableName: string): Map<string, any> | undefined {
    return this.tables.get(tableName);
  }

  clear(): void {
    this.tables.clear();
  }
}

// Improved mock that handles bind parameters properly
class BetterMockD1Database {
  private tables: Map<string, Map<string, { id: string; data: string }>> = new Map();
  private lastSql = '';
  private lastParams: any[] = [];

  prepare(sql: string) {
    this.lastSql = sql;
    const self = this;

    return {
      bind(...params: any[]) {
        self.lastParams = params;
        return this;
      },
      async all() {
        if (self.lastSql.includes('sqlite_master')) {
          const tableNames = Array.from(self.tables.keys()).map(name => ({
            name
          }));
          return { results: tableNames };
        } else if (self.lastSql.includes('SELECT id, data FROM')) {
          const match = self.lastSql.match(/FROM "([^"]+)"/);
          const tableName = match ? match[1] : '';

          if (!self.tables.has(tableName)) {
            return { results: [] };
          }

          const docs = Array.from(self.tables.get(tableName)!.values());
          return { results: docs };
        }

        return { results: [] };
      },
      async run() {
        if (self.lastSql.includes('CREATE TABLE')) {
          const match = self.lastSql.match(/CREATE TABLE IF NOT EXISTS "([^"]+)"/);
          if (match) {
            const tableName = match[1];
            if (!self.tables.has(tableName)) {
              self.tables.set(tableName, new Map());
            }
          }
        } else if (self.lastSql.includes('DELETE FROM')) {
          const match = self.lastSql.match(/DELETE FROM "([^"]+)"/);
          if (match) {
            const tableName = match[1];
            if (self.tables.has(tableName)) {
              self.tables.get(tableName)!.clear();
            }
          }
        } else if (self.lastSql.includes('INSERT INTO')) {
          const match = self.lastSql.match(/INSERT INTO "([^"]+)"/);
          if (match && self.lastParams.length >= 2) {
            const tableName = match[1];
            const [id, data] = self.lastParams;

            if (!self.tables.has(tableName)) {
              self.tables.set(tableName, new Map());
            }

            self.tables.get(tableName)!.set(id, { id, data });
          }
        }

        return { success: true };
      }
    };
  }

  setTableData(tableName: string, data: Map<string, { id: string; data: string }>): void {
    this.tables.set(tableName, new Map(data));
  }

  getTableData(tableName: string): Map<string, { id: string; data: string }> | undefined {
    return this.tables.get(tableName);
  }

  clear(): void {
    this.tables.clear();
  }
}

describe('Cloudflare D1 Adapter Tests', () => {
  let adapter: CloudflareD1Adapter;
  let mockDb: BetterMockD1Database;

  beforeEach(() => {
    mockDb = new BetterMockD1Database();
    adapter = createCloudflareD1Adapter(mockDb);
  });

  afterEach(() => {
    mockDb.clear();
  });

  it('should initialize with database instance', () => {
    expect(adapter).toBeDefined();
    expect(adapter.getDatabase()).toBe(mockDb);
  });

  it('should throw error if database is not provided', () => {
    expect(() => new CloudflareD1Adapter(null)).toThrow(
      'Cloudflare D1 database instance is required'
    );
  });

  it('should load empty collections', async () => {
    const loaded = await adapter.load();
    expect(loaded).toEqual({});
  });

  it('should save single collection with documents', async () => {
    const data: Record<string, Document[]> = {
      users: [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Bob', email: 'bob@example.com' }
      ]
    };

    await adapter.save(data);

    // Manually verify by checking mock data
    const tableData = mockDb.getTableData('users');
    expect(tableData).toBeDefined();
    expect(tableData!.size).toBe(2);
  });

  it('should save multiple collections', async () => {
    const data: Record<string, Document[]> = {
      users: [{ id: '1', name: 'Alice' }],
      posts: [{ id: 'p1', title: 'Hello' }],
      comments: [{ id: 'c1', text: 'Great!' }]
    };

    await adapter.save(data);

    expect(mockDb.getTableData('users')).toBeDefined();
    expect(mockDb.getTableData('posts')).toBeDefined();
    expect(mockDb.getTableData('comments')).toBeDefined();
  });

  it('should handle complex nested documents', async () => {
    const data: Record<string, Document[]> = {
      articles: [
        {
          id: '1',
          title: 'Article',
          author: {
            name: 'John',
            email: 'john@example.com'
          },
          tags: ['tech', 'news'],
          metadata: {
            views: 1000,
            published: new Date().toISOString()
          }
        }
      ]
    };

    await adapter.save(data);

    const tableData = mockDb.getTableData('articles');
    expect(tableData).toBeDefined();
    expect(tableData!.size).toBe(1);

    const stored = Array.from(tableData!.values())[0];
    const parsed = JSON.parse(stored.data);
    expect(parsed.author.name).toBe('John');
    expect(parsed.tags).toContain('tech');
  });

  it('should handle documents with special characters', async () => {
    const data: Record<string, Document[]> = {
      documents: [
        {
          id: '1',
          content: 'Quote: "Hello"',
          escaped: "It's working"
        }
      ]
    };

    await adapter.save(data);

    const tableData = mockDb.getTableData('documents');
    const stored = Array.from(tableData!.values())[0];
    const parsed = JSON.parse(stored.data);

    expect(parsed.content).toContain('Quote');
    expect(parsed.escaped).toContain("It's");
  });

  it('should support raw SQL queries', async () => {
    // Set up mock data
    const userData = new Map([
      ['1', { id: '1', data: JSON.stringify({ name: 'Alice', age: 30 }) }],
      ['2', { id: '2', data: JSON.stringify({ name: 'Bob', age: 25 }) }]
    ]);
    mockDb.setTableData('users', userData);

    const results = await adapter.query('SELECT * FROM users WHERE age > ?', [25]);
    expect(results).toBeDefined();
  });

  it('should preserve document IDs correctly', async () => {
    const data: Record<string, Document[]> = {
      items: [
        { id: 'abc-123', name: 'Item 1' },
        { id: 'xyz-789', name: 'Item 2' }
      ]
    };

    await adapter.save(data);

    const tableData = mockDb.getTableData('items');
    const ids = Array.from(tableData!.keys());

    expect(ids).toContain('abc-123');
    expect(ids).toContain('xyz-789');
  });

  it('should clear tables on save', async () => {
    const data1: Record<string, Document[]> = {
      users: [{ id: '1', name: 'Alice' }]
    };

    await adapter.save(data1);
    expect(mockDb.getTableData('users')!.size).toBe(1);

    const data2: Record<string, Document[]> = {
      users: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
        { id: '3', name: 'Charlie' }
      ]
    };

    await adapter.save(data2);
    expect(mockDb.getTableData('users')!.size).toBe(3);
  });

  it('should handle empty collections', async () => {
    const data: Record<string, Document[]> = {
      users: [],
      posts: [],
      tags: []
    };

    await adapter.save(data);

    expect(mockDb.getTableData('users')!.size).toBe(0);
    expect(mockDb.getTableData('posts')!.size).toBe(0);
    expect(mockDb.getTableData('tags')!.size).toBe(0);
  });

  it('should handle collection names with special characters', async () => {
    const data: Record<string, Document[]> = {
      'user_profiles': [{ id: '1', name: 'Alice' }],
      'user-sessions': [{ id: '2', name: 'Session' }]
    };

    await adapter.save(data);

    expect(mockDb.getTableData('user_profiles')).toBeDefined();
    expect(mockDb.getTableData('user-sessions')).toBeDefined();
  });

  it('should handle large JSON documents', async () => {
    const largeObject = {
      id: '1',
      title: 'Large Document',
      data: {
        items: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          value: `Item ${i}`
        }))
      }
    };

    const data: Record<string, Document[]> = {
      documents: [largeObject]
    };

    await adapter.save(data);

    const tableData = mockDb.getTableData('documents');
    const stored = Array.from(tableData!.values())[0];
    const parsed = JSON.parse(stored.data);

    expect(parsed.data.items).toHaveLength(100);
  });

  it('should handle numeric IDs and values', async () => {
    const data: Record<string, Document[]> = {
      records: [
        { id: '1', count: 100, rating: 4.5 },
        { id: '2', count: 200, rating: 3.8 }
      ]
    };

    await adapter.save(data);

    const tableData = mockDb.getTableData('records');
    const values = Array.from(tableData!.values());
    const parsed1 = JSON.parse(values[0].data);

    expect(parsed1.count).toBe(100);
    expect(parsed1.rating).toBe(4.5);
  });
});
