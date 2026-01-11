import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DenoKvAdapter, createDenoKvAdapter } from '../src/index';
import type { Document } from '@nebula-db/core';

/**
 * Mock Deno.kv for testing
 */
class MockDenoKv {
  private store: Map<string, any> = new Map();

  private keyToString(key: (string | number)[]): string {
    return JSON.stringify(key);
  }

  async set(key: (string | number)[], value: any): Promise<void> {
    this.store.set(this.keyToString(key), { key, value });
  }

  async get(key: (string | number)[]): Promise<any> {
    const entry = this.store.get(this.keyToString(key));
    return entry ? { key, value: entry.value } : { key, value: null };
  }

  async delete(key: (string | number)[]): Promise<void> {
    this.store.delete(this.keyToString(key));
  }

  list(options: { prefix?: (string | number)[] }): AsyncIterable<any> {
    const prefix = options.prefix || [];
    const prefixStr = JSON.stringify(prefix);

    const entries = Array.from(this.store.values()).filter(entry => {
      const keyStr = JSON.stringify(entry.key);
      return keyStr.startsWith(prefixStr.slice(0, -1)); // Match prefix
    });

    return {
      async *[Symbol.asyncIterator]() {
        for (const entry of entries) {
          yield entry;
        }
      }
    };
  }

  async close(): Promise<void> {
    this.store.clear();
  }

  clear(): void {
    this.store.clear();
  }
}

describe('Deno KV Adapter Tests', () => {
  let adapter: DenoKvAdapter;
  let mockKv: MockDenoKv;

  beforeEach(async () => {
    mockKv = new MockDenoKv();

    // Mock global Deno.kv
    (globalThis as any).Deno = {
      kv: async () => mockKv
    };

    adapter = createDenoKvAdapter();
    await adapter.init();
  });

  afterEach(async () => {
    await adapter.close();
    mockKv.clear();
    delete (globalThis as any).Deno;
  });

  it('should save and load empty collections', async () => {
    const data: Record<string, Document[]> = {};
    await adapter.save(data);

    const loaded = await adapter.load();
    expect(loaded).toEqual({});
  });

  it('should save single collection with documents', async () => {
    const data: Record<string, Document[]> = {
      users: [
        { id: '1', name: 'Alice', age: 30 },
        { id: '2', name: 'Bob', age: 25 }
      ]
    };

    await adapter.save(data);
    const loaded = await adapter.load();

    expect(loaded.users).toHaveLength(2);
    expect(loaded.users).toContainEqual({ id: '1', name: 'Alice', age: 30 });
    expect(loaded.users).toContainEqual({ id: '2', name: 'Bob', age: 25 });
  });

  it('should save multiple collections', async () => {
    const data: Record<string, Document[]> = {
      users: [{ id: '1', name: 'Alice' }],
      posts: [{ id: 'p1', title: 'Hello' }],
      tags: [{ id: 't1', name: 'javascript' }]
    };

    await adapter.save(data);
    const loaded = await adapter.load();

    expect(Object.keys(loaded)).toHaveLength(3);
    expect(loaded.users).toHaveLength(1);
    expect(loaded.posts).toHaveLength(1);
    expect(loaded.tags).toHaveLength(1);
  });

  it('should handle documents with complex data types', async () => {
    const data: Record<string, Document[]> = {
      items: [
        {
          id: '1',
          name: 'Item 1',
          metadata: {
            tags: ['tag1', 'tag2'],
            nested: {
              deep: 'value'
            }
          },
          createdAt: new Date().toISOString()
        }
      ]
    };

    await adapter.save(data);
    const loaded = await adapter.load();

    const item = loaded.items[0];
    expect(item.metadata.tags).toEqual(['tag1', 'tag2']);
    expect(item.metadata.nested.deep).toBe('value');
    expect(item.createdAt).toBeTruthy();
  });

  it('should overwrite existing data on save', async () => {
    const data1: Record<string, Document[]> = {
      users: [{ id: '1', name: 'Alice' }]
    };

    await adapter.save(data1);
    let loaded = await adapter.load();
    expect(loaded.users).toHaveLength(1);

    const data2: Record<string, Document[]> = {
      users: [
        { id: '1', name: 'Alice Updated' },
        { id: '2', name: 'Bob' },
        { id: '3', name: 'Charlie' }
      ]
    };

    await adapter.save(data2);
    loaded = await adapter.load();

    expect(loaded.users).toHaveLength(3);
    expect(loaded.users[0].name).toBe('Alice Updated');
  });

  it('should support custom prefix', async () => {
    const customAdapter = createDenoKvAdapter(undefined, 'custom-prefix');
    (globalThis as any).Deno = {
      kv: async () => mockKv
    };

    await customAdapter.init();

    const data: Record<string, Document[]> = {
      users: [{ id: '1', name: 'Alice' }]
    };

    await customAdapter.save(data);
    const loaded = await customAdapter.load();

    expect(loaded.users).toHaveLength(1);

    await customAdapter.close();
  });

  it('should handle empty collections correctly', async () => {
    const data: Record<string, Document[]> = {
      users: [],
      posts: [],
      empty: []
    };

    await adapter.save(data);
    const loaded = await adapter.load();

    // Empty collections will not appear in load() results since they have no documents
    // This is expected behavior for the Deno KV adapter (no way to store empty collections)
    expect(loaded.users).toEqual(undefined);
    expect(loaded.posts).toEqual(undefined);
    expect(loaded.empty).toEqual(undefined);
  });

  it('should handle special characters in collection names', async () => {
    const data: Record<string, Document[]> = {
      'user-profiles': [{ id: '1', name: 'Alice' }],
      'user_sessions': [{ id: '2', name: 'Session' }]
    };

    await adapter.save(data);
    const loaded = await adapter.load();

    expect(loaded['user-profiles']).toHaveLength(1);
    expect(loaded['user_sessions']).toHaveLength(1);
  });

  it('should handle large documents', async () => {
    const largeContent = 'x'.repeat(10000);
    const data: Record<string, Document[]> = {
      documents: [
        {
          id: '1',
          title: 'Large Document',
          content: largeContent,
          metadata: {
            size: largeContent.length
          }
        }
      ]
    };

    await adapter.save(data);
    const loaded = await adapter.load();

    expect(loaded.documents[0].content.length).toBe(10000);
    expect(loaded.documents[0].metadata.size).toBe(10000);
  });

  it('should throw error if Deno.kv is unavailable', async () => {
    delete (globalThis as any).Deno;

    const newAdapter = createDenoKvAdapter();

    await expect(newAdapter.init()).rejects.toThrow(
      'Deno.kv() is not available'
    );
  });

  it('should maintain data across multiple save/load cycles', async () => {
    const data1: Record<string, Document[]> = {
      users: [{ id: '1', name: 'Alice' }]
    };

    await adapter.save(data1);
    let loaded = await adapter.load();
    expect(loaded.users[0].name).toBe('Alice');

    // Simulate real-world scenario: modify and save again
    const data2: Record<string, Document[]> = {
      users: [
        { id: '1', name: 'Alice Updated' },
        { id: '2', name: 'Bob' }
      ]
    };

    await adapter.save(data2);
    loaded = await adapter.load();

    expect(loaded.users).toHaveLength(2);
    expect(loaded.users[0].name).toBe('Alice Updated');
    expect(loaded.users[1].name).toBe('Bob');
  });

  it('should handle numeric and string IDs', async () => {
    const data: Record<string, Document[]> = {
      items: [
        { id: '123', name: 'String ID' },
        { id: 'abc-def-ghi', name: 'UUID Style' },
        { id: '0', name: 'Zero' }
      ]
    };

    await adapter.save(data);
    const loaded = await adapter.load();

    expect(loaded.items).toHaveLength(3);
    expect(loaded.items.map(i => i.id)).toContain('123');
    expect(loaded.items.map(i => i.id)).toContain('abc-def-ghi');
  });
});
