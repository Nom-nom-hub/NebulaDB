# NebulaDB Performance Guide

Comprehensive guide to optimizing NebulaDB performance for your application.

## Query Optimizer

The Query Optimizer analyzes queries and selects the optimal execution strategy based on available indexes.

### How It Works

```typescript
import { QueryOptimizer } from '@nebula-db/core';

const optimizer = new QueryOptimizer();

// Analyze a query
const plan = optimizer.analyzeQuery(query, indexes, collectionSize);

// Plan contains:
// - selectedIndexes: Best indexes to use
// - estimatedRows: Estimated result size
// - cost: Execution cost estimate
// - steps: Detailed execution steps
// - predicates: Query conditions with selectivity
```

### Understanding Query Plans

A query plan shows exactly how NebulaDB will execute your query:

```typescript
{
  planId: 'plan-123',
  query: { email: 'user@example.com', age: { $gt: 25 } },
  selectedIndexes: [{ name: 'email_idx', fields: ['email'] }],
  estimatedRows: 42,
  cost: 12.5,
  fullScan: false,
  predicates: [
    { field: 'email', operator: '$eq', selectivity: 0.05 },
    { field: 'age', operator: '$gt', selectivity: 0.3 }
  ],
  steps: [
    { type: 'INDEX_LOOKUP', description: 'Lookup in index email_idx' },
    { type: 'FILTER', description: 'Filter on age > 25' }
  ]
}
```

### Index Selection

The optimizer scores indexes based on:
- **Coverage**: How many query conditions does this index cover?
- **Selectivity**: How selective is the indexed field?
- **Compound Preference**: Compound indexes get a boost

```typescript
// Best: Query uses indexed field with high selectivity
// Cost: ~log(n) from index + filter on other fields
db.collection('users').find({ email: 'user@example.com' });

// Good: Multiple indexed fields
// Cost: ~log(n) from compound index
db.collection('users').find({ 
  name: 'John',
  country: 'USA'
});

// Acceptable: Range query on indexed field
// Cost: ~log(n) + field results
db.collection('users').find({ age: { $gt: 25 } });

// Costly: Full table scan
// Cost: O(n) - all documents scanned
db.collection('users').find({ customField: 'value' });
```

### Visualizing Plans

```typescript
const plan = optimizer.analyzeQuery(query, indexes, 1000);
console.log(optimizer.formatPlan(plan));

// Output:
// ═════════════════════════════════════════════════════════════
// Query Plan: plan-123-abc
// ═════════════════════════════════════════════════════════════
// 
// Estimated Rows: 42
// Total Cost: 12.50
// Full Scan: No
// 
// Selected Indexes:
//   • email_idx (email)
// 
// Predicates:
//   • email $eq (selectivity: 5.0%)
//   • age $gt (selectivity: 30.0%)
// 
// Execution Steps:
//   1. INDEX_LOOKUP
//      Lookup in index 'email_idx'
//      Rows: 5, Cost: 3.50
//   2. FILTER
//      Filter on field 'age' ($gt)
//      Rows: 3, Cost: 0.50
```

## Worker Pool & Parallelization

Process large batches of data in parallel using adaptive worker pools.

### Browser & Node.js Compatibility

```typescript
import { AdaptiveWorkerPool } from '@nebula-db/core';

// Automatically detects environment (browser/Node.js)
const pool = new AdaptiveWorkerPool(4); // 4 workers

// Process batch in parallel
const results = await pool.processBatch(items, async (item) => {
  return await processItem(item);
});
```

### Use Cases

**Batch Processing**:
```typescript
const pool = createWorkerPool(8);

// Process 10,000 documents in parallel
const transformed = await pool.processBatch(
  largeDataset,
  async (doc) => {
    return {
      ...doc,
      processed: true,
      hash: await computeHash(doc)
    };
  }
);
```

**Bulk Insert with Transformation**:
```typescript
const pool = createWorkerPool();

const processed = await pool.processBatch(
  importedData,
  async (item) => ({
    id: generateId(),
    ...item,
    imported: new Date().toISOString()
  })
);

await collection.insertBatch(processed);
```

**Concurrent Operations**:
```typescript
// Multiple pools for different tasks
const readPool = createWorkerPool(8);
const writePool = createWorkerPool(4);

// Read-heavy operations
const docs = await readPool.processBatch(queries, executeQuery);

// Write operations with fewer workers
await writePool.processBatch(docs, saveDocument);
```

### Pool Configuration

```typescript
// Auto-detect concurrency (uses CPU count)
const pool1 = createWorkerPool();

// Manual concurrency
const pool2 = createWorkerPool(16);

// Get statistics
const stats = pool.getStats();
// {
//   poolSize: 4,
//   activeWorkers: 3,
//   queuedTasks: 5,
//   totalProcessed: 1250
// }
```

## Performance Profiler

Measure and analyze the performance of your database operations.

### Basic Usage

```typescript
import { getProfiler } from '@nebula-db/core';

const profiler = getProfiler();

// Measure synchronous operation
const result = profiler.measure('custom-operation', () => {
  return complexCalculation();
});

// Measure async operation
const data = await profiler.measureAsync('api-call', async () => {
  return await fetchData();
});
```

### Tracking Operations

```typescript
// Manual operation tracking
profiler.startOperation('op-1', 'insert');

// ... do work ...

profiler.endOperation('op-1', true, undefined, {
  collection: 'users',
  count: 100
});
```

### Generating Reports

```typescript
// Get summary by operation type
const summary = profiler.getSummary();

for (const [opType, stats] of summary) {
  console.log(`${opType}:`);
  console.log(`  Count: ${stats.count}`);
  console.log(`  Avg: ${stats.averageTime.toFixed(2)}ms`);
  console.log(`  Min: ${stats.minTime.toFixed(2)}ms`);
  console.log(`  Max: ${stats.maxTime.toFixed(2)}ms`);
  console.log(`  Success: ${stats.successRate.toFixed(1)}%`);
}

// Get full report
const report = profiler.generateReport();
console.log(profiler.formatReport(report));

// Find slowest operations
const slowest = profiler.getSlowestOperations(5);
for (const op of slowest) {
  console.log(`${op.operationType}: ${op.duration.toFixed(2)}ms`);
}
```

### Memory Tracking

```typescript
const profiler = getProfiler();

// Operations track memory usage automatically
profiler.measureAsync('memory-intensive', async () => {
  return await processLargeData();
});

// Get memory impact
const report = profiler.generateReport();
for (const op of report.operations) {
  if (op.memoryDelta) {
    console.log(`${op.operationId}: ${op.memoryDelta.toFixed(2)}MB`);
  }
}
```

## Performance Best Practices

### 1. Use Indexes Effectively

```typescript
// Create indexes for frequently queried fields
db.collection('users', {
  indexes: [
    { name: 'email_idx', fields: ['email'], type: 'unique' },
    { name: 'age_country_idx', fields: ['age', 'country'], type: 'compound' },
    { name: 'name_idx', fields: ['name'], type: 'single' }
  ]
});

// Query patterns that benefit from indexes
db.collection('users').find({ email: 'user@example.com' }); // Uses email_idx
db.collection('users').find({ age: 30, country: 'USA' }); // Uses age_country_idx
```

### 2. Batch Operations

```typescript
// Bad: Individual inserts in a loop
for (const user of users) {
  await collection.insert(user); // N operations
}

// Good: Batch insert
await collection.insertBatch(users); // 1 operation
```

### 3. Use Worker Pools for Heavy Lifting

```typescript
// Bad: Sequential processing
const results = [];
for (const item of items) {
  results.push(await processItem(item));
}

// Good: Parallel processing
const pool = createWorkerPool(8);
const results = await pool.processBatch(items, processItem);
```

### 4. Enable Query Caching

```typescript
// Create collection with query cache
const collection = db.collection('users', {
  queryCache: {
    enabled: true,
    maxSize: 100,
    ttlMs: 60000 // 1 minute
  }
});

// Repeated queries use cache
const users = await collection.find({ country: 'USA' }); // Cache miss
const users2 = await collection.find({ country: 'USA' }); // Cache hit
```

### 5. Profile Before Optimizing

```typescript
// Identify bottlenecks with profiler
const profiler = getProfiler();

// Warm up
for (let i = 0; i < 10; i++) {
  await collection.find({});
}

// Measure
const report = profiler.generateReport();
console.log(profiler.formatReport(report));

// Focus optimization on slowest operations
```

### 6. Monitor Memory Usage

```typescript
// Track memory-intensive operations
profiler.measureAsync('large-export', async () => {
  return await collection.find({});
});

// Check memory delta
const report = profiler.generateReport();
for (const op of report.operations) {
  if (op.memoryDelta && op.memoryDelta > 50) {
    console.warn(`High memory operation: ${op.operationId}`);
  }
}
```

## Performance Benchmarks

### Typical Performance on Modern Hardware

| Operation | Dataset Size | Time | Index? |
|-----------|--------------|------|--------|
| Index Lookup | 1,000,000 | 0.5ms | Yes |
| Full Scan | 1,000,000 | 50ms | No |
| Batch Insert | 10,000 docs | 150ms | - |
| Index Creation | 1,000,000 | 200ms | - |
| Range Query | 1,000,000 | 5ms | Yes |
| Text Search | 1,000,000 | 20ms | Text idx |

### Memory Usage

| Operation | Memory Delta |
|-----------|--------------|
| Load 100k docs | ~50MB |
| Create index | ~10MB |
| Query (in-memory) | <1MB |
| Worker pool (8x) | ~8MB |

## Optimization Checklist

- [ ] Identify hot query paths
- [ ] Create indexes for frequently queried fields
- [ ] Use batch operations for multiple inserts/updates
- [ ] Enable query caching on high-traffic collections
- [ ] Use worker pools for bulk processing
- [ ] Profile operations to find bottlenecks
- [ ] Monitor memory usage with profiler
- [ ] Review query plans for full scans
- [ ] Consider field selectivity when indexing
- [ ] Test performance with realistic data

## Troubleshooting

**Slow Queries**:
1. Check query plan: Is it using an index?
2. Create index if missing
3. Review predicate selectivity
4. Check if full scan is necessary

**High Memory Usage**:
1. Profile operations to identify culprits
2. Use worker pools to parallelize
3. Consider pagination for large result sets
4. Enable compression for large documents

**Slow Batch Operations**:
1. Use `insertBatch` instead of loop
2. Use worker pool for processing
3. Increase batch size (if memory allows)
4. Consider transaction batching

## See Also

- [Adapter Registry](./ADAPTER_REGISTRY.md) - Storage adapter performance
- [Query Language](./QUERIES.md) - Query syntax and patterns
- [Indexing Guide](./INDEXING.md) - Creating effective indexes
