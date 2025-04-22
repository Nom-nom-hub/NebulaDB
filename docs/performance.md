# Performance Optimization Guide

This guide provides strategies for optimizing the performance of NebulaDB in your applications.

## Understanding NebulaDB Performance

NebulaDB is designed to be fast by default, with in-memory operations and efficient data structures. However, as your data grows or your application becomes more complex, you may need to optimize for specific use cases.

## Key Performance Factors

Several factors affect NebulaDB's performance:

1. **Data Size**: The number of documents in a collection
2. **Query Complexity**: The complexity of your queries
3. **Indexing**: Whether appropriate indexes are in place
4. **Adapter Choice**: The storage adapter being used
5. **Plugin Overhead**: The number and complexity of plugins

## Measuring Performance

Before optimizing, establish a baseline by measuring current performance:

```typescript
// Measure query performance
console.time('Query');
const results = await collection.find({ /* your query */ });
console.timeEnd('Query');

// Measure insert performance
console.time('Insert');
await collection.insert({ /* your document */ });
console.timeEnd('Insert');

// Measure update performance
console.time('Update');
await collection.update({ /* query */ }, { /* update */ });
console.timeEnd('Update');

// Measure delete performance
console.time('Delete');
await collection.delete({ /* query */ });
console.timeEnd('Delete');
```

For more comprehensive benchmarking, use the benchmarking tools in the `benchmarks` directory.

## Optimization Strategies

### 1. Use Indexes

Indexes are the most effective way to improve query performance:

```typescript
// Create an index on frequently queried fields
collection.createIndex({
  name: 'email_idx',
  fields: ['email'],
  type: 'unique'
});

// Create a compound index for queries that filter on multiple fields
collection.createIndex({
  name: 'user_location_idx',
  fields: ['country', 'city'],
  type: 'compound'
});
```

Guidelines for effective indexing:

- Index fields that are frequently used in queries
- For compound indexes, order fields from most selective to least selective
- Don't over-index - each index adds overhead to write operations
- Monitor index usage to ensure they're being utilized

### 2. Optimize Query Patterns

Write efficient queries:

```typescript
// GOOD: Specific query that can use an index
await users.find({ email: 'user@example.com' });

// AVOID: Complex queries that can't use indexes efficiently
await users.find({
  $or: [
    { name: { $regex: '^A' } },
    { age: { $gt: 30 } }
  ]
});
```

Tips for efficient queries:

- Use equality conditions when possible
- Limit the use of complex logical operators like `$or`
- Avoid regular expressions when possible
- Use projection to limit the fields returned

### 3. Batch Operations

For bulk operations, use batching:

```typescript
// Instead of this
for (const item of items) {
  await collection.insert(item);
}

// Do this
const promises = items.map(item => collection.insert(item));
await Promise.all(promises);
```

### 4. Choose the Right Adapter

Different adapters have different performance characteristics:

- **MemoryAdapter**: Fastest, but no persistence
- **LocalStorageAdapter**: Fast for small datasets, limited storage
- **IndexedDBAdapter**: Good for larger browser datasets
- **FileSystemAdapter**: Good for Node.js applications
- **SQLiteAdapter**: Better for larger datasets with complex queries
- **RedisAdapter**: Good for high-throughput applications

### 5. Use the Cache Plugin

The Cache Plugin can significantly improve performance for read-heavy workloads:

```typescript
import { createCachePlugin } from '@nebula/plugin-cache';

const cachePlugin = createCachePlugin({
  maxCacheSize: 100,
  ttl: 60000 // 1 minute
});

const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [cachePlugin]
});
```

### 6. Minimize Plugin Overhead

Plugins add functionality but can impact performance:

- Only use plugins you need
- Configure plugins appropriately
- Place performance-critical plugins (like caching) early in the plugin chain

### 7. Optimize Document Structure

Document structure affects performance:

- Keep documents small and focused
- Avoid deeply nested structures
- Consider denormalization for frequently accessed data
- Use appropriate data types

### 8. Pagination for Large Result Sets

When dealing with large result sets, use pagination:

```typescript
async function getPage(collection, query, page, pageSize) {
  // Get all matching documents
  const allDocs = await collection.find(query);
  
  // Calculate start and end indices
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  
  // Return the page
  return allDocs.slice(start, end);
}

// Usage
const page1 = await getPage(users, { active: true }, 1, 10);
```

### 9. Subscription Optimization

Optimize reactive subscriptions:

- Be specific with subscription queries
- Limit the number of active subscriptions
- Unsubscribe when no longer needed

```typescript
// Create a subscription
const unsubscribe = collection.subscribe(query, callback);

// Later, when no longer needed
unsubscribe();
```

### 10. Memory Management

For large datasets, be mindful of memory usage:

- Consider using a persistent adapter for large datasets
- Implement pagination for large result sets
- Use projection to limit returned fields
- Release references to large objects when no longer needed

## Advanced Optimization Techniques

### Custom Adapters

For specific performance requirements, consider creating a custom adapter:

```typescript
class OptimizedAdapter implements Adapter {
  // Implement with optimizations specific to your use case
}
```

### Sharding

For very large datasets, consider sharding:

```typescript
// Create multiple databases for different data subsets
const userDb = createDb({ adapter: new MemoryAdapter() });
const productDb = createDb({ adapter: new MemoryAdapter() });
const orderDb = createDb({ adapter: new MemoryAdapter() });
```

### Worker Threads

For CPU-intensive operations, consider using worker threads:

```typescript
// In main thread
const worker = new Worker('worker.js');
worker.postMessage({ action: 'query', collection: 'users', query: { /* complex query */ } });
worker.onmessage = (e) => {
  const results = e.data;
  // Process results
};

// In worker.js
self.onmessage = async (e) => {
  const { action, collection, query } = e.data;
  if (action === 'query') {
    const db = createDb({ adapter: new MemoryAdapter() });
    const results = await db.collection(collection).find(query);
    self.postMessage(results);
  }
};
```

## Performance Monitoring

Continuously monitor performance:

- Track query execution times
- Monitor memory usage
- Identify slow queries
- Regularly review and optimize indexes

## Case Studies

### Case Study 1: Optimizing a Todo App

**Before Optimization:**
- 1,000 todos
- No indexes
- Full collection scan for queries
- Query time: ~50ms

**After Optimization:**
- Added index on `completed` field
- Added index on `dueDate` field
- Query time: ~5ms (10x improvement)

### Case Study 2: Large Dataset Management

**Before Optimization:**
- 100,000 records
- MemoryAdapter
- All data loaded at once
- High memory usage
- Slow initial load

**After Optimization:**
- Switched to SQLiteAdapter
- Implemented pagination
- Added appropriate indexes
- Reduced memory usage by 80%
- Improved initial load time by 60%

## Conclusion

Performance optimization is an iterative process. Start with the simplest optimizations (like adding indexes) and measure the impact before moving to more complex strategies. Remember that premature optimization can lead to unnecessary complexity, so optimize based on actual performance measurements rather than assumptions.
