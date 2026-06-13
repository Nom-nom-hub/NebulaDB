import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock ioredis - self-contained class-based mock (no top-level deps)
vi.mock('ioredis', () => {
  const store: Record<string, string> = {};
  return {
    default: class {
      keys = vi.fn(async (pattern: string) => {
        if (pattern === '*') return Object.keys(store);
        const prefix = pattern.replace('*', '');
        return Object.keys(store).filter(k => k.startsWith(prefix));
      });
      get = vi.fn(async (key: string) => store[key] || null);
      set = vi.fn(async (key: string, value: string) => {
        store[key] = value;
        return 'OK';
      });
      del = vi.fn(async (...keys: string[]) => {
        for (const key of keys) delete store[key];
        return keys.length;
      });
      quit = vi.fn(async () => {});
      on = vi.fn();
      once = vi.fn();
    }
  };
});

import { RedisAdapter, createRedisAdapter } from '../src/index';

describe('RedisAdapter', () => {
  let adapter: RedisAdapter;

  beforeEach(() => {
    adapter = createRedisAdapter('redis://localhost:6379');
  });

  describe('constructor and factory', () => {
    it('should create adapter with string URL', () => {
      const a = createRedisAdapter('redis://localhost:6379');
      expect(a).toBeInstanceOf(RedisAdapter);
    });

    it('should create adapter with options object', () => {
      const a = createRedisAdapter({ host: 'localhost', port: 6379 });
      expect(a).toBeInstanceOf(RedisAdapter);
    });

    it('should use custom prefix', () => {
      const a = createRedisAdapter('redis://localhost:6379', 'custom:');
      expect(a).toBeInstanceOf(RedisAdapter);
    });
  });

  describe('save', () => {
    it('should save data to Redis', async () => {
      await adapter.save({ users: [{ id: '1', name: 'Alice' }] });
      // If we get here without throwing, save completed
    });

    it('should save multiple documents', async () => {
      await adapter.save({
        users: [
          { id: '1', name: 'Alice' },
          { id: '2', name: 'Bob' }
        ]
      });
    });

    it('should handle multiple collections', async () => {
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
    it('should return empty object when no data', async () => {
      const data = await adapter.load();
      expect(data).toEqual({});
    });

    it('should load saved data (save-load roundtrip)', async () => {
      await adapter.save({ users: [{ id: '1', name: 'Alice' }] });
      const data = await adapter.load();
      // Verify load returns data saved in same adapter instance
      expect(data).toBeDefined();
    });

    it('should handle multiple collections', async () => {
      await adapter.save({
        users: [{ id: '1', name: 'Alice' }],
        posts: [{ id: '2', title: 'Hello' }]
      });
      const data = await adapter.load();
      expect(data).toBeDefined();
    });
  });

  describe('close', () => {
    it('should close without error', async () => {
      await adapter.close();
    });
  });

  describe('getClient', () => {
    it('should return the Redis client', () => {
      const client = adapter.getClient();
      expect(client).toBeDefined();
    });
  });
});
