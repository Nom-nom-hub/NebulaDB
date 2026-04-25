import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PostgreSQLAdapter, createPostgreSQLAdapter } from '../src/index';

vi.mock('pg', () => ({
  Pool: vi.fn(() => ({
    query: vi.fn(),
    connect: vi.fn(),
    end: vi.fn()
  }))
}));

describe('PostgreSQLAdapter', () => {
  let adapter: PostgreSQLAdapter;

  beforeEach(() => {
    adapter = createPostgreSQLAdapter('postgres://localhost/testdb');
  });

  describe('load', () => {
    it('should load tables', async () => {
      (adapter as any).pool = {
        query: vi.fn().mockResolvedValue({
          rows: [{ table_name: 'users' }]
        })
      } as any;

      const data = await adapter.load();
      expect(data).toBeDefined();
    });
  });

  describe('save', () => {
    it('should save documents', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({}),
        release: vi.fn()
      };
      (adapter as any).pool = {
        connect: vi.fn().mockResolvedValue(mockClient),
        end: vi.fn()
      };

      await adapter.save({ users: [{ id: '1', name: 'Alice' }] });
      expect(mockClient.query).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should close pool', async () => {
      const pool = { end: vi.fn().mockResolvedValue(undefined) };
      (adapter as any).pool = pool;

      await adapter.close();
      expect(pool.end).toHaveBeenCalled();
    });
  });
});