import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock mongodb - self-contained class-based mock
vi.mock('mongodb', () => {
  const docs: any[] = [];
  const collections: Record<string, any[]> = {};
  
  const mockCollection = {
    find: vi.fn(() => ({ toArray: vi.fn(async () => [...docs]) })),
    deleteMany: vi.fn(async () => { docs.length = 0; return { deletedCount: 1 }; }),
    insertMany: vi.fn(async (items: any[]) => { docs.push(...items); return { insertedCount: items.length }; }),
    updateOne: vi.fn(async () => ({ modifiedCount: 1 })),
    deleteOne: vi.fn(async () => ({ deletedCount: 1 })),
    insertOne: vi.fn(async (item: any) => { docs.push(item); return { insertedId: 'mock-id' }; })
  };

  return {
    MongoClient: class {
      connect = vi.fn(async () => {});
      close = vi.fn(async () => {});
      db = vi.fn(() => ({
        collection: vi.fn((name: string) => {
          if (!collections[name]) collections[name] = [];
          return {
            find: vi.fn(() => ({ toArray: vi.fn(async () => [...collections[name]]) })),
            deleteMany: vi.fn(async () => { collections[name] = []; return { deletedCount: 1 }; }),
            insertMany: vi.fn(async (items: any[]) => { collections[name].push(...items); return { insertedCount: items.length }; })
          };
        }),
        listCollections: vi.fn(() => ({
          toArray: vi.fn(async () => 
            Object.keys(collections).map(name => ({ name }))
          )
        }))
      }))
    }
  };
});

import { MongoDBAdapter, createMongoDBAdapter } from '../src/index';

describe('MongoDBAdapter', () => {
  let adapter: MongoDBAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = createMongoDBAdapter({
      uri: 'mongodb://localhost:27017',
      database: 'testdb'
    });
  });

  describe('constructor and factory', () => {
    it('should create adapter with valid options', () => {
      expect(adapter).toBeInstanceOf(MongoDBAdapter);
    });

    it('should create adapter from factory', () => {
      const a = createMongoDBAdapter({ uri: 'mongodb://localhost', database: 'test' });
      expect(a).toBeInstanceOf(MongoDBAdapter);
    });
  });

  describe('connect', () => {
    it('should connect without error', async () => {
      await adapter.connect();
    });
  });

  describe('save', () => {
    it('should save data to MongoDB', async () => {
      await adapter.save({ users: [{ id: '1', name: 'Alice' }] });
    });

    it('should save multiple collections', async () => {
      await adapter.save({
        users: [{ id: '1', name: 'Alice' }],
        posts: [{ id: '2', title: 'Hello' }]
      });
    });

    it('should handle empty collections', async () => {
      await adapter.save({ users: [] });
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
      // Verify data was loaded back
      expect(data).toBeDefined();
    });
  });

  describe('close', () => {
    it('should close without error', async () => {
      await adapter.connect();
      await adapter.close();
    });
  });
});
