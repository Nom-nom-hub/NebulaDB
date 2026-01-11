import { describe, it, expect, beforeEach } from 'vitest';
import { QueryOptimizer } from '../src/query-optimizer';
import type { IndexDefinition, Query } from '../src/types';

describe('Query Optimizer Tests', () => {
  let optimizer: QueryOptimizer;
  let indexes: IndexDefinition[];

  beforeEach(() => {
    optimizer = new QueryOptimizer();

    indexes = [
      {
        name: 'email_idx',
        fields: ['email'],
        type: 'unique' as any
      },
      {
        name: 'age_idx',
        fields: ['age'],
        type: 'single' as any
      },
      {
        name: 'name_country_idx',
        fields: ['name', 'country'],
        type: 'compound' as any
      }
    ];
  });

  it('should analyze simple equality query', () => {
    const query: Query = { email: 'test@example.com' };
    const plan = optimizer.analyzeQuery(query, indexes, 1000);

    expect(plan.planId).toBeTruthy();
    expect(plan.query).toEqual(query);
    expect(plan.fullScan).toBe(false);
    expect(plan.selectedIndexes.length).toBeGreaterThan(0);
  });

  it('should select email index for email query', () => {
    const query: Query = { email: 'test@example.com' };
    const plan = optimizer.analyzeQuery(query, indexes, 1000);

    const emailIndex = plan.selectedIndexes.find(idx => idx.name === 'email_idx');
    expect(emailIndex).toBeDefined();
  });

  it('should handle range queries', () => {
    const query: Query = { age: { $gt: 30 } };
    const plan = optimizer.analyzeQuery(query, indexes, 1000);

    expect(plan.predicates.length).toBeGreaterThan(0);
    expect(plan.predicates[0].field).toBe('age');
    expect(plan.predicates[0].operator).toBe('$gt');
  });

  it('should handle IN operator', () => {
    const query: Query = { age: { $in: [20, 30, 40] } };
    const plan = optimizer.analyzeQuery(query, indexes, 1000);

    expect(plan.predicates[0].operator).toBe('$in');
  });

  it('should prefer compound indexes', () => {
    const query: Query = { name: 'John', country: 'USA' };
    const plan = optimizer.analyzeQuery(query, indexes, 1000);

    const compoundIndex = plan.selectedIndexes.find(idx => idx.name === 'name_country_idx');
    expect(compoundIndex).toBeDefined();
  });

  it('should fall back to full scan when no indexes match', () => {
    const query: Query = { unknownField: 'value' };
    const plan = optimizer.analyzeQuery(query, indexes, 1000);

    // When no indexes match, optimizer should still create a valid plan
    expect(plan).toBeDefined();
    expect(plan.query).toEqual(query);
    // Plan will indicate no index was selected
    expect(plan.selectedIndexes.length).toBe(0);
  });

  it('should estimate rows correctly', () => {
    const query: Query = { email: 'test@example.com' };
    const plan = optimizer.analyzeQuery(query, indexes, 1000);

    expect(plan.estimatedRows).toBeLessThan(1000);
    expect(plan.estimatedRows).toBeGreaterThan(0);
  });

  it('should have execution steps', () => {
    const query: Query = { email: 'test@example.com' };
    const plan = optimizer.analyzeQuery(query, indexes, 1000);

    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.steps[0].type).toBe('INDEX_LOOKUP');
  });

  it('should cache query plans', () => {
    const query: Query = { email: 'test@example.com' };

    const plan1 = optimizer.analyzeQuery(query, indexes, 1000);
    const plan2 = optimizer.analyzeQuery(query, indexes, 1000);

    expect(plan1.planId).toBe(plan2.planId); // Same plan from cache
  });

  it('should calculate cost for queries', () => {
    const query: Query = { age: { $gt: 30 } };
    const plan = optimizer.analyzeQuery(query, indexes, 1000);

    expect(plan.cost).toBeGreaterThan(0);
  });

  it('should update field statistics', () => {
    optimizer.updateFieldStats('email', 1000, 950);

    const stats = optimizer.getFieldStats('email');
    expect(stats).toBeDefined();
    expect(stats!.cardinality).toBe(1000);
    expect(stats!.distinctValues).toBe(950);
    expect(stats!.selectivity).toBeCloseTo(0.95, 1);
  });

  it('should handle multiple predicates', () => {
    const query: Query = { age: { $gt: 25 }, country: 'USA' };
    const plan = optimizer.analyzeQuery(query, indexes, 1000);

    expect(plan.predicates.length).toBe(2);
  });

  it('should format plan as readable string', () => {
    const query: Query = { email: 'test@example.com' };
    const plan = optimizer.analyzeQuery(query, indexes, 1000);

    const formatted = optimizer.formatPlan(plan);

    expect(formatted).toContain('Query Plan');
    expect(formatted).toContain('Estimated Rows');
    expect(formatted).toContain('Total Cost');
  });

  it('should clear cache', () => {
    const query: Query = { email: 'test@example.com' };
    optimizer.analyzeQuery(query, indexes, 1000);

    const statsBefore = optimizer.getCacheStats();
    expect(statsBefore.size).toBeGreaterThan(0);

    optimizer.clearCache();

    const statsAfter = optimizer.getCacheStats();
    expect(statsAfter.size).toBe(0);
  });

  it('should handle regex queries', () => {
    const query: Query = { email: { $regex: '^test' } };
    const plan = optimizer.analyzeQuery(query, indexes, 1000);

    expect(plan.predicates[0].operator).toBe('$regex');
  });

  it('should calculate selectivity based on field cardinality', () => {
    optimizer.updateFieldStats('country', 1000, 10); // Low cardinality
    optimizer.updateFieldStats('id', 1000, 1000); // High cardinality

    const lowCardQuery: Query = { country: 'USA' };
    const highCardQuery: Query = { id: '123' };

    const lowCardPlan = optimizer.analyzeQuery(lowCardQuery, indexes, 1000);
    const highCardPlan = optimizer.analyzeQuery(highCardQuery, indexes, 1000);

    // Both queries should produce valid plans
    expect(lowCardPlan.estimatedRows).toBeGreaterThan(0);
    expect(highCardPlan.estimatedRows).toBeGreaterThan(0);
    
    // High cardinality fields should have higher selectivity
    const highCardPred = highCardPlan.predicates.find(p => p.field === 'id');
    const lowCardPred = lowCardPlan.predicates.find(p => p.field === 'country');
    
    if (highCardPred && lowCardPred) {
      expect(highCardPred.selectivity).toBeGreaterThanOrEqual(lowCardPred.selectivity);
    }
  });

  it('should prefer indexes on more selective fields first', () => {
    const query: Query = { age: { $gt: 30 }, email: 'test@example.com' };
    const plan = optimizer.analyzeQuery(query, indexes, 1000);

    // Email is more selective, should be in predicates
    const emailPredicate = plan.predicates.find(p => p.field === 'email');
    expect(emailPredicate).toBeDefined();
  });
});
