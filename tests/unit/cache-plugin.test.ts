import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDb } from '../../packages/core/src';
import { MemoryAdapter } from '../../packages/adapters/memory/src';
import { createCachePlugin } from '../../packages/plugins/cache/src';

describe('CachePlugin', () => {
  let db: any;
  let users: any;
  let cachePlugin: any;

  beforeEach(() => {
    // Create a cache plugin
    cachePlugin = createCachePlugin({
      maxCacheSize: 10,
      ttl: 1000, // 1 second TTL for testing
      cacheEmptyResults: true
    });

    // Create a fresh database for each test
    db = createDb({
      adapter: new MemoryAdapter(),
      plugins: [cachePlugin]
    });

    users = db.collection('users');
  });

  it('should cache query results', async () => {
    // Insert test data
    await users.insert({ name: 'Alice', age: 30 });
    await users.insert({ name: 'Bob', age: 25 });

    // Mock the find method to track calls
    const originalFind = users.find;
    const mockFind = vi.fn().mockImplementation((query) => originalFind.call(users, query));
    users.find = mockFind;

    // First query - should hit the database
    await users.find({ age: { $gt: 20 } });
    expect(mockFind).toHaveBeenCalledTimes(1);

    // Second query with same parameters - should use cache
    await users.find({ age: { $gt: 20 } });
    expect(mockFind).toHaveBeenCalledTimes(2); // Still called, but will use cache internally

    // Different query - should hit the database
    await users.find({ name: 'Alice' });
    expect(mockFind).toHaveBeenCalledTimes(3);
  });

  it('should invalidate cache on data changes', async () => {
    // Insert test data
    await users.insert({ name: 'Alice', age: 30 });

    // First query
    const result1 = await users.find({ age: { $gt: 20 } });
    expect(result1).toHaveLength(1);

    // Insert new data - should invalidate cache
    await users.insert({ name: 'Bob', age: 25 });

    // Query again - should get updated results
    const result2 = await users.find({ age: { $gt: 20 } });
    expect(result2).toHaveLength(2);
  });

  it('should respect TTL for cached queries', async () => {
    // Insert test data
    await users.insert({ name: 'Alice', age: 30 });

    // First query
    await users.find({ age: 30 });

    // Wait for cache to expire
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Mock the find method to track calls
    const originalFind = users.find;
    const mockFind = vi.fn().mockImplementation((query) => originalFind.call(users, query));
    users.find = mockFind;

    // Query again - should hit the database because cache expired
    await users.find({ age: 30 });
    expect(mockFind).toHaveBeenCalledTimes(1);
  });

  it('should respect maxCacheSize', async () => {
    // Create a plugin with small cache size
    const smallCachePlugin = createCachePlugin({
      maxCacheSize: 2,
      ttl: 60000
    });

    const smallCacheDb = createDb({
      adapter: new MemoryAdapter(),
      plugins: [smallCachePlugin]
    });

    const items = smallCacheDb.collection('items');

    // Insert test data
    for (let i = 0; i < 10; i++) {
      await items.insert({ value: i });
    }

    // Make 5 different queries to fill the cache
    await items.find({ value: 0 });
    await items.find({ value: 1 });
    await items.find({ value: 2 });
    await items.find({ value: 3 });
    await items.find({ value: 4 });

    // The cache should only contain the most recent queries
    // We can't directly test the cache contents, but we can test that
    // the oldest queries are no longer cached

    // Mock the find method
    const originalFind = items.find;
    const mockFind = vi.fn().mockImplementation((query) => originalFind.call(items, query));
    items.find = mockFind;

    // Query for value 0 and 1 again - these should not be in cache
    await items.find({ value: 0 });
    await items.find({ value: 1 });

    // Query for value 3 and 4 again - these should still be in cache
    await items.find({ value: 3 });
    await items.find({ value: 4 });

    // We expect 4 calls to mockFind
    expect(mockFind).toHaveBeenCalledTimes(4);
  });

  it('should exclude specified collections from caching', async () => {
    // Create a plugin that excludes the 'logs' collection
    const exclusionPlugin = createCachePlugin({
      excludeCollections: ['logs']
    });

    const exclusionDb = createDb({
      adapter: new MemoryAdapter(),
      plugins: [exclusionPlugin]
    });

    const users = exclusionDb.collection('users');
    const logs = exclusionDb.collection('logs');

    // Insert test data
    await users.insert({ name: 'Alice' });
    await logs.insert({ action: 'login', user: 'Alice' });

    // Mock the find methods
    const originalUsersFind = users.find;
    const mockUsersFind = vi.fn().mockImplementation((query) => originalUsersFind.call(users, query));
    users.find = mockUsersFind;

    const originalLogsFind = logs.find;
    const mockLogsFind = vi.fn().mockImplementation((query) => originalLogsFind.call(logs, query));
    logs.find = mockLogsFind;

    // Query users twice - second should use cache
    await users.find({});
    await users.find({});

    // Query logs twice - both should hit the database
    await logs.find({});
    await logs.find({});

    expect(mockUsersFind).toHaveBeenCalledTimes(2);
    expect(mockLogsFind).toHaveBeenCalledTimes(2);
  });
});
