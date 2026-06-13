/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from 'vitest';

// Mock localStorage before importing the adapter
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string): string | null => store[key] || null,
  setItem: (key: string, value: string): void => { store[key] = value; },
  removeItem: (key: string): void => { delete store[key]; },
  get length(): number { return Object.keys(store).length; },
  key: (index: number): string | null => {
    const keys = Object.keys(store);
    return keys[index] || null;
  },
  clear: (): void => {
    Object.keys(store).forEach(key => delete store[key]);
  }
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

import { LocalStorageAdapter, createLocalStorageAdapter } from '../src/index';

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    // Clear localStorage mock
    Object.keys(store).forEach(key => delete store[key]);
    adapter = createLocalStorageAdapter();
  });

  describe('save', () => {
    it('should save data to localStorage', async () => {
      const data = { users: [{ id: '1', name: 'Alice' }] };
      await adapter.save(data);

      const stored = store['nebula-db:users:docs'];
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('Alice');
    });

    it('should overwrite existing data', async () => {
      await adapter.save({ users: [{ id: '1', name: 'Alice' }] });
      await adapter.save({ users: [{ id: '2', name: 'Bob' }] });

      const stored = JSON.parse(store['nebula-db:users:docs']);
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe('Bob');
    });

    it('should remove old keys on save', async () => {
      // Pre-populate localStorage with old data
      store['nebula-db:oldcollection:docs'] = JSON.stringify([{ id: '1' }]);

      await adapter.save({ newcollection: [{ id: '2', name: 'New' }] });

      // Old key should be removed
      expect(store['nebula-db:oldcollection:docs']).toBeUndefined();
      // New key should exist
      expect(store['nebula-db:newcollection:docs']).toBeDefined();
    });

    it('should handle multiple collections', async () => {
      const data = {
        users: [{ id: '1', name: 'Alice' }],
        posts: [{ id: '2', title: 'Hello' }]
      };
      await adapter.save(data);

      expect(store['nebula-db:users:docs']).toBeDefined();
      expect(store['nebula-db:posts:docs']).toBeDefined();
    });
  });

  describe('load', () => {
    it('should return empty object when no data', async () => {
      const data = await adapter.load();
      expect(data).toEqual({});
    });

    it('should load saved data', async () => {
      await adapter.save({ users: [{ id: '1', name: 'Alice' }] });
      const data = await adapter.load();

      expect(data.users).toHaveLength(1);
      expect(data.users[0].name).toBe('Alice');
    });

    it('should load multiple collections', async () => {
      await adapter.save({
        users: [{ id: '1', name: 'Alice' }],
        posts: [{ id: '2', title: 'Post' }]
      });

      const data = await adapter.load();
      expect(data.users).toHaveLength(1);
      expect(data.posts).toHaveLength(1);
    });

    it('should ignore non-prefixed keys', async () => {
      store['other-key'] = JSON.stringify([{ id: '1' }]);
      store['nebula-db:users:docs'] = JSON.stringify([{ id: '2', name: 'Alice' }]);

      const data = await adapter.load();
      expect(data.users).toHaveLength(1);
      expect(data.other).toBeUndefined();
    });

    it('should handle corrupted JSON gracefully', async () => {
      store['nebula-db:users:docs'] = 'not-valid-json{';

      const data = await adapter.load();
      // Should not crash, just skip the bad data
      expect(data.users || []).toEqual([]);
    });

    it('should handle empty collections', async () => {
      store['nebula-db:users:docs'] = JSON.stringify([]);

      const data = await adapter.load();
      expect(data.users).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should clear all nebula data', async () => {
      store['nebula-db:users:docs'] = JSON.stringify([{ id: '1' }]);
      store['nebula-db:posts:docs'] = JSON.stringify([{ id: '2' }]);
      store['other-key'] = 'other-data';

      adapter.clear();

      expect(store['nebula-db:users:docs']).toBeUndefined();
      expect(store['nebula-db:posts:docs']).toBeUndefined();
      // Non-nebula keys should be preserved
      expect(store['other-key']).toBe('other-data');
    });

    it('should not throw when no data', () => {
      expect(() => adapter.clear()).not.toThrow();
    });
  });

  describe('custom prefix', () => {
    it('should use custom prefix', async () => {
      const customAdapter = createLocalStorageAdapter('custom:');

      await customAdapter.save({ users: [{ id: '1', name: 'Test' }] });

      expect(store['custom:users:docs']).toBeDefined();
      expect(store['nebula-db:users:docs']).toBeUndefined();
    });

    it('should load with custom prefix', async () => {
      store['custom:users:docs'] = JSON.stringify([{ id: '1', name: 'Custom' }]);
      store['nebula-db:users:docs'] = JSON.stringify([{ id: '2', name: 'Default' }]);

      const customAdapter = createLocalStorageAdapter('custom:');
      const data = await customAdapter.load();

      expect(data.users).toHaveLength(1);
      expect(data.users[0].name).toBe('Custom');
    });
  });

  describe('data integrity', () => {
    it('should preserve document structure', async () => {
      const originalData = {
        users: [{
          id: '1',
          name: 'Alice',
          address: { street: '123 Main', city: 'Springfield' },
          tags: ['admin', 'user'],
          age: 30,
          active: true
        }]
      };

      await adapter.save(originalData);
      const loaded = await adapter.load();

      expect(loaded.users[0]).toEqual(originalData.users[0]);
    });

    it('should handle special characters', async () => {
      const data = {
        items: [{
          id: '1',
          text: 'unicode: 你好世界 🎉 !@#$%^&*()'
        }]
      };

      await adapter.save(data);
      const loaded = await adapter.load();

      expect(loaded.items[0].text).toBe(data.items[0].text);
    });

    it('should handle large datasets', async () => {
      const users = Array.from({ length: 1000 }, (_, i) => ({
        id: String(i),
        name: `User ${i}`,
        data: 'x'.repeat(100)
      }));

      await adapter.save({ users });
      const loaded = await adapter.load();

      expect(loaded.users).toHaveLength(1000);
      expect(loaded.users[0].name).toBe('User 0');
      expect(loaded.users[999].name).toBe('User 999');
    });
  });
});
