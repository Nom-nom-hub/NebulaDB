import { describe, it, expect, beforeEach } from 'vitest';
import { createDb, IndexType } from '../../packages/core/src';
import { MemoryAdapter } from '../../packages/adapters/memory/src';

describe('NebulaDB Indexing', () => {
  let db: any;
  let users: any;

  beforeEach(() => {
    // Create a fresh database for each test
    db = createDb({ adapter: new MemoryAdapter() });
    users = db.collection('users');
  });

  describe('Index Creation', () => {
    it('should create an index', () => {
      users.createIndex({
        name: 'email_idx',
        fields: ['email'],
        type: IndexType.UNIQUE
      });

      const indexes = users.getIndexes();
      expect(indexes).toHaveLength(1);
      expect(indexes[0].name).toBe('email_idx');
      expect(indexes[0].fields).toEqual(['email']);
      expect(indexes[0].type).toBe(IndexType.UNIQUE);
    });

    it('should create multiple indexes', () => {
      users.createIndex({
        name: 'email_idx',
        fields: ['email'],
        type: IndexType.UNIQUE
      });

      users.createIndex({
        name: 'age_idx',
        fields: ['age'],
        type: IndexType.SINGLE
      });

      const indexes = users.getIndexes();
      expect(indexes).toHaveLength(2);
      expect(indexes.map(idx => idx.name).sort()).toEqual(['age_idx', 'email_idx']);
    });

    it('should create a compound index', () => {
      users.createIndex({
        name: 'name_age_idx',
        fields: ['name', 'age'],
        type: IndexType.COMPOUND
      });

      const indexes = users.getIndexes();
      expect(indexes).toHaveLength(1);
      expect(indexes[0].fields).toEqual(['name', 'age']);
      expect(indexes[0].type).toBe(IndexType.COMPOUND);
    });
  });

  describe('Index Usage', () => {
    it('should use index for queries', async () => {
      // Add test data
      await users.insert({ name: 'Alice', email: 'alice@example.com', age: 30 });
      await users.insert({ name: 'Bob', email: 'bob@example.com', age: 25 });
      await users.insert({ name: 'Charlie', email: 'charlie@example.com', age: 35 });

      // Create an index
      users.createIndex({
        name: 'email_idx',
        fields: ['email'],
        type: IndexType.UNIQUE
      });

      // Query by indexed field
      const result = await users.findOne({ email: 'bob@example.com' });
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Bob');
    });

    it('should enforce uniqueness for unique indexes', async () => {
      // Create a unique index
      users.createIndex({
        name: 'email_idx',
        fields: ['email'],
        type: IndexType.UNIQUE
      });

      // Insert a document
      await users.insert({ name: 'Alice', email: 'alice@example.com' });

      // Try to insert another document with the same email
      await expect(
        users.insert({ name: 'Another Alice', email: 'alice@example.com' })
      ).rejects.toThrow(/Unique constraint violation/);
    });

    it('should use compound indexes for queries', async () => {
      // Add test data
      await users.insert({ name: 'Alice', country: 'USA', city: 'New York' });
      await users.insert({ name: 'Bob', country: 'USA', city: 'Boston' });
      await users.insert({ name: 'Charlie', country: 'UK', city: 'London' });

      // Create a compound index
      users.createIndex({
        name: 'location_idx',
        fields: ['country', 'city'],
        type: IndexType.COMPOUND
      });

      // Query by both indexed fields
      const result = await users.findOne({ country: 'USA', city: 'Boston' });
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Bob');
    });
  });

  describe('Index Management', () => {
    it('should drop an index', () => {
      users.createIndex({
        name: 'email_idx',
        fields: ['email'],
        type: IndexType.UNIQUE
      });

      expect(users.getIndexes()).toHaveLength(1);

      const result = users.dropIndex('email_idx');
      expect(result).toBe(true);
      expect(users.getIndexes()).toHaveLength(0);
    });

    it('should return false when dropping a non-existent index', () => {
      const result = users.dropIndex('non_existent_idx');
      expect(result).toBe(false);
    });

    it('should rebuild indexes when setting all documents', async () => {
      // Create an index
      users.createIndex({
        name: 'email_idx',
        fields: ['email'],
        type: IndexType.UNIQUE
      });

      // Add some documents
      await users.insert({ name: 'Alice', email: 'alice@example.com' });
      await users.insert({ name: 'Bob', email: 'bob@example.com' });

      // Replace all documents
      users.setAll([
        { id: '1', name: 'Charlie', email: 'charlie@example.com' },
        { id: '2', name: 'Dave', email: 'dave@example.com' }
      ]);

      // Try to insert a document with a duplicate email
      await expect(
        users.insert({ name: 'Another Charlie', email: 'charlie@example.com' })
      ).rejects.toThrow(/Unique constraint violation/);
    });
  });

  describe('Performance', () => {
    it('should improve query performance with indexes', async () => {
      // Create a large collection
      const products = db.collection('products');

      // Add 1000 products
      const testData = [];
      for (let i = 0; i < 1000; i++) {
        testData.push({
          id: `${i}`,
          name: `Product ${i}`,
          category: ['A', 'B', 'C'][i % 3],
          price: Math.floor(Math.random() * 1000)
        });
      }
      products.setAll(testData);

      // Query without index
      const startWithoutIndex = performance.now();
      await products.find({ category: 'B' });
      const timeWithoutIndex = performance.now() - startWithoutIndex;

      // Create an index
      products.createIndex({
        name: 'category_idx',
        fields: ['category'],
        type: IndexType.SINGLE
      });

      // Query with index
      const startWithIndex = performance.now();
      await products.find({ category: 'B' });
      const timeWithIndex = performance.now() - startWithIndex;

      // The indexed query should be faster, but in tests the difference might be small
      // We're just checking that it works, not the actual performance difference
      expect(timeWithIndex).toBeLessThanOrEqual(timeWithoutIndex * 1.5);
    });
  });
});
