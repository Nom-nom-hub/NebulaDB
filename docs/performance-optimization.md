# Performance Optimization Guide

This guide explains the performance optimization techniques used in NebulaDB and how to leverage them in your applications.

## Query Optimization

NebulaDB includes an advanced query optimizer that significantly improves performance for complex nested queries. The optimizer applies several strategies:

### 1. Query Reordering

The optimizer reorders query conditions to execute the most selective conditions first:

```typescript
// Before optimization
const query = {
  $and: [
    { name: { $regex: 'Smith' } }, // Expensive regex operation
    { age: { $gt: 30 } },          // Range comparison
    { id: '12345' }                // Exact equality (most selective)
  ]
};

// After optimization - exact equality first, then range, then regex
const optimizedQuery = EnhancedNestedQueryOptimizer.optimizeQuery(query);
// Result: { $and: [{ id: '12345' }, { age: { $gt: 30 } }, { name: { $regex: 'Smith' } }] }
```

### 2. Redundant Condition Elimination

The optimizer removes duplicate conditions to reduce unnecessary processing:

```typescript
// Before optimization - duplicate age condition
const query = {
  $and: [
    { age: { $gt: 30 } },
    { age: { $gt: 30 } }, // Duplicate
    { name: 'John' }
  ]
};

// After optimization - duplicates removed
const optimizedQuery = EnhancedNestedQueryOptimizer.optimizeQuery(query);
// Result: { $and: [{ age: { $gt: 30 } }, { name: 'John' }] }
```

### 3. Condition Merging

The optimizer merges compatible conditions on the same field:

```typescript
// Before optimization - separate age conditions
const query = {
  $and: [
    { age: { $gt: 30 } },
    { age: { $lt: 50 } },
    { name: 'John' }
  ]
};

// After optimization - merged age conditions
const optimizedQuery = EnhancedNestedQueryOptimizer.optimizeQuery(query);
// Result: { $and: [{ age: { $gt: 30, $lt: 50 } }, { name: 'John' }] }
```

## Batch Processing

For operations on large datasets, NebulaDB provides efficient batch processing capabilities:

### Collection.processInChunks

Process large collections in manageable chunks to avoid memory issues:

```typescript
await users.processInChunks(async (docs) => {
  // Process each chunk of documents
  return docs.map(doc => ({ ...doc, processed: true }));
}, 500); // Process 500 documents at a time
```

### Optimized Path Access

For operations that need to access nested properties across many documents:

```typescript
// Traditional approach - slower
const names = documents.map(doc => doc.user?.profile?.name);

// Optimized approach - faster
const paths = ['user.profile.name'];
const batchAccessor = EnhancedNestedQueryOptimizer.createBatchPathAccessor(paths);
const results = batchAccessor(documents);
const names = results.get('user.profile.name');
```

## Performance Benchmarks

Our benchmarks show significant performance improvements with these optimizations:

| Query Type | Without Optimization | With Optimization | Improvement |
|------------|----------------------|-------------------|-------------|
| Simple     | 15ms                 | 14ms              | 7%          |
| Multi-condition | 25ms            | 20ms              | 20%         |
| Complex nested | 120ms            | 45ms              | 62%         |
| Redundant  | 35ms                 | 18ms              | 49%         |
| Mergeable  | 40ms                 | 22ms              | 45%         |

## Best Practices

1. **Use the query optimizer**: The optimizer is enabled by default, but you can manually optimize queries:

   ```typescript
   import { EnhancedNestedQueryOptimizer } from '@nebula-db/core';
   
   const optimizedQuery = EnhancedNestedQueryOptimizer.optimizeQuery(myQuery);
   const results = await collection.find(optimizedQuery);
   ```

2. **Process large datasets in chunks**:

   ```typescript
   await collection.processInChunks(processor, 1000);
   ```

3. **Use batch operations** for multiple documents:

   ```typescript
   // Better than individual inserts
   await collection.insertBatch(documents);
   ```

4. **Enable adaptive concurrency** for parallel operations:

   ```typescript
   collection.setAdaptiveConcurrencyOptions({
     enabled: true,
     initialConcurrency: 4,
     maxConcurrency: 16
   });
   ```