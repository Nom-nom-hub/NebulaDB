# Indexing Guide

NebulaDB supports indexing to improve query performance. This guide explains how to use indexes effectively.

## Understanding Indexes

Indexes in NebulaDB are data structures that improve the speed of data retrieval operations. They work by creating a reference to the data based on specific fields, allowing the database to find documents without scanning the entire collection.

### Index Types

NebulaDB supports several types of indexes:

- **Single Field**: Index on a single field
- **Compound**: Index on multiple fields
- **Unique**: Index that enforces uniqueness of values
- **Text**: Index optimized for text searches

## Creating Indexes

You can create indexes when defining a collection or later using the `createIndex` method:

### When Creating a Collection

```typescript
import { createDb, IndexType } from '@nebula/core';
import { MemoryAdapter } from '@nebula/adapter-memory';

const db = createDb({ adapter: new MemoryAdapter() });

// Create a collection with indexes
const users = db.collection('users', {
  indexes: [
    {
      name: 'email_idx',
      fields: ['email'],
      type: IndexType.UNIQUE
    },
    {
      name: 'name_age_idx',
      fields: ['name', 'age'],
      type: IndexType.COMPOUND
    }
  ]
});
```

### After Collection Creation

```typescript
import { IndexType } from '@nebula/core';

// Create a single field index
users.createIndex({
  name: 'age_idx',
  fields: ['age'],
  type: IndexType.SINGLE
});

// Create a unique index
users.createIndex({
  name: 'username_idx',
  fields: ['username'],
  type: IndexType.UNIQUE
});

// Create a compound index
users.createIndex({
  name: 'location_idx',
  fields: ['country', 'city'],
  type: IndexType.COMPOUND
});
```

## Using Indexes

NebulaDB automatically uses indexes when processing queries. The query engine analyzes the query and determines if an index can be used to improve performance.

For an index to be used, the query must include the indexed fields with equality conditions:

```typescript
// Will use the 'email_idx' index
const user = await users.findOne({ email: 'alice@example.com' });

// Will use the 'name_age_idx' compound index
const results = await users.find({ 
  name: 'Alice', 
  age: 30 
});

// Will NOT use the 'name_age_idx' index (range query on age)
const results = await users.find({ 
  name: 'Alice', 
  age: { $gt: 25 } 
});
```

## Managing Indexes

### Listing Indexes

```typescript
const indexes = users.getIndexes();
console.log(indexes);
// [
//   { name: 'email_idx', fields: ['email'], type: 'unique' },
//   { name: 'name_age_idx', fields: ['name', 'age'], type: 'compound' },
//   { name: 'age_idx', fields: ['age'], type: 'single' }
// ]
```

### Dropping Indexes

```typescript
// Drop an index by name
users.dropIndex('age_idx');
```

## Index Performance Considerations

### When to Use Indexes

- **High Read-to-Write Ratio**: Indexes are most beneficial when you read data more often than you write it
- **Large Collections**: Indexes provide more benefit as collection size grows
- **Frequent Queries on Specific Fields**: Index fields that are frequently used in queries
- **Sorting Operations**: Indexes can improve the performance of sorting

### When to Avoid Indexes

- **Small Collections**: For small collections, a full scan might be faster than using an index
- **High Write-to-Read Ratio**: Indexes slow down write operations
- **Rarely Queried Fields**: Don't index fields that are rarely used in queries
- **Highly Volatile Data**: If data changes frequently, maintaining indexes can be expensive

## Index Limitations

- **Memory Usage**: Indexes consume additional memory
- **Write Performance**: Indexes slow down insert, update, and delete operations
- **Range Queries**: Current implementation only optimizes equality queries
- **Complex Queries**: Queries with `$or`, `$not`, etc. may not fully utilize indexes

## Best Practices

1. **Index Selectively**: Only create indexes that will be used frequently
2. **Use Compound Indexes Wisely**: Order fields from most selective to least selective
3. **Monitor Performance**: Test queries with and without indexes to ensure they're helping
4. **Avoid Over-Indexing**: Too many indexes can degrade write performance
5. **Consider Collection Size**: For very small collections, indexes might not be necessary

## Example: Optimizing a Query

```typescript
// Create a collection with 10,000 documents
const products = db.collection('products');

// Add 10,000 products
for (let i = 0; i < 10000; i++) {
  await products.insert({
    name: `Product ${i}`,
    category: ['A', 'B', 'C'][i % 3],
    price: Math.floor(Math.random() * 1000),
    inStock: Math.random() > 0.5
  });
}

// Query without index
console.time('Without index');
const resultsWithoutIndex = await products.find({ category: 'B', inStock: true });
console.timeEnd('Without index');

// Create an index
products.createIndex({
  name: 'category_stock_idx',
  fields: ['category', 'inStock'],
  type: IndexType.COMPOUND
});

// Query with index
console.time('With index');
const resultsWithIndex = await products.find({ category: 'B', inStock: true });
console.timeEnd('With index');
```

## Partial Indexes

Partial indexes only index documents that match a specified filter. This can improve performance and reduce memory usage when you only need to query a subset of documents.

```typescript
// Create a partial index for active users only
users.createIndex({
  name: 'active_users_idx',
  fields: ['lastActive'],
  type: IndexType.SINGLE,
  options: {
    partial: {
      filter: { active: true }
    }
  }
});

// This query will use the partial index
const activeUsers = await users.find({ 
  active: true,
  lastActive: { $gt: new Date('2023-01-01') }
});

// This query won't use the partial index because it doesn't include the filter
const recentUsers = await users.find({
  lastActive: { $gt: new Date('2023-01-01') }
});
```

Partial indexes are particularly useful when:

1. You frequently query a specific subset of your data
2. The subset is significantly smaller than the full collection
3. You want to enforce unique constraints on a subset of documents

For example, you might create a partial index on `email` for verified users only, ensuring uniqueness only among verified accounts.
