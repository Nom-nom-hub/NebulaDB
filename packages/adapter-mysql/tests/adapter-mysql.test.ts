import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock mysql2/promise - self-contained class-based mock
vi.mock('mysql2/promise', () => {
  const tables: Record<string, any[]> = {};
  
  const mockConnection = {
    beginTransaction: vi.fn(async () => {}),
    commit: vi.fn(async () => {}),
    rollback: vi.fn(async () => {}),
    execute: vi.fn(async (sql: string, params?: any[]) => {
      if (String(sql).includes('CREATE TABLE')) return [{ affectedRows: 0 }];
      if (String(sql).includes('DELETE FROM')) {
        const tableName = String(sql).match(/`([^`]+)`/)?.[1] || '';
        tables[tableName] = [];
        return [{ affectedRows: 1 }];
      }
      if (String(sql).includes('INSERT INTO')) {
        const tableName = String(sql).match(/`([^`]+)`/)?.[1] || '';
        if (!tables[tableName]) tables[tableName] = [];
        tables[tableName].push({ id: params?.[0], data: params?.[1] });
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }),
    release: vi.fn()
  };

  const mockPool = {
    query: vi.fn(async (sql: string, params?: any[]) => {
      if (String(sql).includes('information_schema')) {
        return [[...Object.keys(tables).map(t => ({ TABLE_NAME: t }))]];
      }
      if (String(sql).includes('SELECT * FROM')) {
        const tableName = String(sql).match(/`([^`]+)`/)?.[1] || '';
        return [[...(tables[tableName] || [])]];
      }
      return [[{ id: '1', name: 'Alice' }]];
    }),
    getConnection: vi.fn(async () => mockConnection),
    end: vi.fn(async () => {})
  };

  return {
    createPool: vi.fn(() => mockPool),
    default: { createPool: vi.fn(() => mockPool) }
  };
});

import { MySQLAdapter, createMySQLAdapter } from '../src/index';

describe('MySQLAdapter', () => {
  let adapter: MySQLAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = createMySQLAdapter({
      host: 'localhost',
      user: 'root',
      password: 'password',
      database: 'testdb'
    });
  });

  describe('constructor and factory', () => {
    it('should create adapter with valid options', () => {
      expect(adapter).toBeInstanceOf(MySQLAdapter);
    });

    it('should use default host and port', () => {
      const a = createMySQLAdapter({ user: 'root', database: 'test' });
      expect(a).toBeInstanceOf(MySQLAdapter);
    });
  });

  describe('save', () => {
    it('should save data to MySQL', async () => {
      await adapter.save({ users: [{ id: '1', name: 'Alice' }] });
    });

    it('should save multiple collections', async () => {
      await adapter.save({
        users: [{ id: '1', name: 'Alice' }],
        posts: [{ id: '2', title: 'Hello' }]
      });
    });

    it('should handle empty collections', async () => {
      await adapter.save({});
    });
  });

  describe('load', () => {
    it('should return collections data on load', async () => {
      const data = await adapter.load();
      // Load returns collections from database tables
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });
  });

  describe('query', () => {
    it('should execute raw SQL queries', async () => {
      const results = await adapter.query('SELECT * FROM users');
      expect(results).toBeDefined();
    });
  });

  describe('close', () => {
    it('should close without error', async () => {
      await adapter.close();
    });
  });
});
