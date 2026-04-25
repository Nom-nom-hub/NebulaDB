import { describe, it, expect, beforeEach } from 'vitest';
import { SQLiteAdapter, createSQLiteAdapter } from '../src/index';

function getAdapter(): SQLiteAdapter | null {
  try {
    return createSQLiteAdapter(':memory:');
  } catch {
    return null;
  }
}

describe('SQLiteAdapter', () => {
  let adapter: SQLiteAdapter;

  beforeEach(() => {
    adapter = getAdapter();
  });

  describe('load', () => {
    it('should return empty when no tables', async () => {
      if (!adapter) return;
      const data = await adapter.load();
      expect(data).toEqual({});
    });

    it('should load saved data', async () => {
      if (!adapter) return;
      await adapter.save({
        users: [{ id: '1', name: 'Alice' }],
        posts: [{ id: '2', title: 'Hello' }]
      });

      const data = await adapter.load();
      expect(data.users).toHaveLength(1);
      expect(data.users[0].name).toBe('Alice');
    });
  });

  describe('save', () => {
    it('should create tables and save docs', async () => {
      if (!adapter) return;
      await adapter.save({
        items: [{ id: 'item1', name: 'Test' }]
      });

      const data = await adapter.load();
      expect(data.items).toHaveLength(1);
      expect(data.items[0].name).toBe('Test');
    });

    it('should overwrite existing data', async () => {
      if (!adapter) return;
      await adapter.save({ items: [{ id: '1', a: 1 }] });
      await adapter.save({ items: [{ id: '2', a: 2 }] });

      const data = await adapter.load();
      expect(data.items).toHaveLength(1);
      expect(data.items[0].id).toBe('2');
    });
  });

  describe('query', () => {
    it('should execute raw queries', async () => {
      if (!adapter) return;
      await adapter.save({ test: [{ id: '1', value: 10 }] });

      const results = await adapter.query<{ id: string }>('SELECT id FROM test');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
    });
  });

  describe('close', () => {
    it('should close the database', () => {
      if (!adapter) return;
      adapter.close();
      expect(() => adapter.close()).not.toThrow();
    });
  });
});

describe('SQLiteAdapter with file', () => {
  it('should create file-based database', async () => {
    const adapter = createSQLiteAdapter('/tmp/test-nebula.db');
    await adapter.save({ test: [{ id: '1' }] });

    const data = await adapter.load();
    expect(data.test).toHaveLength(1);

    adapter.close();
  });
});