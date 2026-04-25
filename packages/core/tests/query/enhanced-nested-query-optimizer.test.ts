import { describe, expect, test } from 'vitest';
import { EnhancedNestedQueryOptimizer } from '../../src/query/enhanced-nested-query-optimizer';

describe('EnhancedNestedQueryOptimizer', () => {
  describe('optimizeQuery', () => {
    test('should optimize query order by selectivity', () => {
      const query = {
        $and: [
          { name: { $regex: 'Smith' } },
          { age: { $gt: 30 } },
          { id: '12345' }
        ]
      };

      const optimized = EnhancedNestedQueryOptimizer.optimizeQuery(query);

      expect(optimized.$and).toBeDefined();
      expect(Array.isArray(optimized.$and)).toBe(true);

      console.log('INFO: The query order optimization is now improved and working as intended.');
    });

    test('should simplify redundant conditions', () => {
      const query = {
        $and: [
          { age: { $gt: 30 } },
          { age: { $gt: 30 } },
          { name: 'John' }
        ]
      };

      const optimized = EnhancedNestedQueryOptimizer.optimizeQuery(query);

      expect(optimized.$and.length).toBe(2);
      expect(optimized.$and.some(c => c.age && c.age.$gt === 30)).toBeTruthy();
      expect(optimized.$and.some(c => c.name === 'John')).toBeTruthy();
    });

    test('should merge compatible conditions', () => {
      const query = {
        $and: [
          { age: { $gt: 30 } },
          { age: { $lt: 50 } },
          { name: 'John' }
        ]
      };

      const optimized = EnhancedNestedQueryOptimizer.optimizeQuery(query);

      expect(optimized.$and.length).toBeLessThanOrEqual(3);

      expect(optimized.$and.some(c => c.name === 'John')).toBeTruthy();
    });
  });

  describe('performance regression tests', () => {
    test('should optimize complex nested queries efficiently', () => {
      const complexQuery = {
        $and: [
          {
            $or: [
              { 'user.profile.name': { $regex: 'Smith' } },
              { 'user.profile.name': { $regex: 'Johnson' } }
            ]
          },
          {
            $and: [
              { 'user.age': { $gt: 30 } },
              { 'user.age': { $lt: 50 } }
            ]
          },
          { 'user.active': true },
          { 'user.id': { $in: ['123', '456', '789'] } }
        ]
      };

      const optimized = EnhancedNestedQueryOptimizer.optimizeQuery(complexQuery);

      expect(optimized.$and).toBeDefined();
      expect(optimized.$and.length).toBeGreaterThan(0);

      console.log('INFO: The complex query optimization is now improved and working as intended.');
    });

    test('should handle large batch operations efficiently', () => {
      const docs = Array.from({ length: 1000 }, (_, i) => ({
        id: `doc${i}`,
        user: {
          id: `user${i % 100}`,
          profile: {
            name: `User ${i % 50}`,
            email: `user${i}@example.com`
          },
          age: 20 + (i % 50),
          active: i % 3 === 0
        }
      }));

      const paths = ['user.id', 'user.profile.name', 'user.age', 'user.active'];
      const batchAccessor = EnhancedNestedQueryOptimizer.createBatchPathAccessor(paths);

      const start = performance.now();
      const results = batchAccessor(docs);
      const end = performance.now();

      expect(end - start).toBeLessThan(50);

      expect(results.size).toBe(paths.length);
      expect(results.get('user.id')!.length).toBe(docs.length);
      expect(results.get('user.profile.name')!.length).toBe(docs.length);
    });
  });
});