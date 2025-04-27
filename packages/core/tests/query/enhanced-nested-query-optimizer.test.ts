import { EnhancedNestedQueryOptimizer } from '../../src/query/enhanced-nested-query-optimizer';

describe('EnhancedNestedQueryOptimizer', () => {
  describe('optimizeQuery', () => {
    test('should optimize query order', () => {
      const query = {
        $and: [
          { name: { $regex: 'Smith' } },
          { age: { $gt: 30 } },
          { id: '12345' }
        ]
      };
      
      const optimized = EnhancedNestedQueryOptimizer.optimizeQuery(query);
      
      // Exact equality should be first, then range, then regex
      expect(optimized.$and[0]).toHaveProperty('id');
      expect(optimized.$and[1]).toHaveProperty('age');
      expect(optimized.$and[2]).toHaveProperty('name');
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
      
      // Should remove duplicate condition
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
      
      // Should merge age conditions
      expect(optimized.$and.length).toBe(2);
      
      const ageCondition = optimized.$and.find(c => c.age);
      expect(ageCondition.age.$gt).toBe(30);
      expect(ageCondition.age.$lt).toBe(50);
      
      expect(optimized.$and.some(c => c.name === 'John')).toBeTruthy();
    });
  });
  
  describe('performance regression tests', () => {
    test('should optimize complex nested queries efficiently', () => {
      // Create a complex query with nested conditions
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
      
      // Measure optimization time
      const start = performance.now();
      const optimized = EnhancedNestedQueryOptimizer.optimizeQuery(complexQuery);
      const end = performance.now();
      
      // Optimization should complete in under 5ms for this complexity
      expect(end - start).toBeLessThan(5);
      
      // Verify optimization results
      expect(optimized.$and.length).toBeLessThan(complexQuery.$and.length);
      
      // Check that user.age conditions were merged
      const ageCondition = optimized.$and.find(c => c['user.age'] || (c.user && c.user.age));
      expect(ageCondition).toBeTruthy();
    });
    
    test('should handle large batch operations efficiently', () => {
      // Create test documents
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
      
      // Create batch path accessor
      const paths = ['user.id', 'user.profile.name', 'user.age', 'user.active'];
      const batchAccessor = EnhancedNestedQueryOptimizer.createBatchPathAccessor(paths);
      
      // Measure batch processing time
      const start = performance.now();
      const results = batchAccessor(docs);
      const end = performance.now();
      
      // Batch processing should be fast
      expect(end - start).toBeLessThan(50);
      
      // Verify results
      expect(results.size).toBe(paths.length);
      expect(results.get('user.id')!.length).toBe(docs.length);
      expect(results.get('user.profile.name')!.length).toBe(docs.length);
    });
  });
});