# NebulaDB Documentation

Welcome to the NebulaDB documentation. This guide will help you get started with NebulaDB and explore its features.

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Core Concepts](#core-concepts)
4. [Performance Optimizations](#performance-optimizations)
5. [API Reference](#api-reference)
6. [Adapters](#adapters)
7. [Plugins](#plugins)
8. [Examples](#examples)
9. [Advanced Usage](#advanced-usage)

## Introduction

NebulaDB is a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database that runs in the browser, Node.js, and Edge environments. It features advanced indexing, optimized query processing, modular adapters for persistence, reactive live queries, extensibility via plugins, and blazing-fast in-memory operations with adaptive concurrency control.

### Key Features

- **Embedded**: Runs directly in your application, no server required
- **High Performance**: Advanced indexing, query optimization, and adaptive concurrency
- **TypeScript-First**: Full type safety with your data
- **Reactive**: Live queries that update in real-time
- **Flexible**: Schema-optional with validation when you need it
- **Modular**: Use only what you need with adapters and plugins
- **Universal**: Works in browsers, Node.js, and Edge environments
- **Scalable**: Efficient memory management and document compression for large datasets
- **Optimized**: Batch operations and parallel processing for better performance

## Installation

```bash
# Install core package
npm install @nebula/core

# Install adapters as needed
npm install @nebula/adapter-memory
npm install @nebula/adapter-localstorage
npm install @nebula/adapter-indexeddb
npm install @nebula/adapter-filesystem

# Install plugins as needed
npm install @nebula/plugin-encryption
npm install @nebula/plugin-validation
npm install @nebula/plugin-versioning
```

## Core Concepts

### Database

The database is the main entry point to NebulaDB. It manages collections and provides methods for persistence.

```typescript
import { createDb } from '@nebula/core';
import { MemoryAdapter } from '@nebula/adapter-memory';

const db = createDb({
  adapter: new MemoryAdapter(),
  // Enable performance optimizations
  queryCache: { enabled: true, maxSize: 100 },
  compression: { enabled: true, threshold: 1024 },
  concurrency: { enabled: true, initialConcurrency: 4 }
});
```

### Collections

Collections are containers for documents. They provide methods for CRUD operations.

```typescript
// Create a collection with indexes for better performance
const users = db.collection('users', {
  indexes: [
    { name: 'id_idx', fields: ['id'], type: 'unique' },
    { name: 'age_idx', fields: ['age'], type: 'single' }
  ]
});
```

### Documents

Documents are JSON objects with a unique `id` field.

```typescript
const user = {
  id: '1',
  name: 'Alice',
  age: 30,
  email: 'alice@example.com'
};
```

### Queries

Queries are used to filter documents in a collection. NebulaDB supports a MongoDB-like query syntax.

```typescript
// Find users over 25
const results = await users.find({ age: { $gt: 25 } });

// Find users with a specific name
const alice = await users.findOne({ name: 'Alice' });

// Complex queries
const results = await users.find({
  $and: [
    { age: { $gt: 25 } },
    { tags: { $in: ['developer'] } }
  ]
});
```

### Updates

Updates modify documents in a collection. NebulaDB supports update operators like `$set`, `$unset`, `$inc`, etc.

```typescript
// Update a user's age
await users.update(
  { id: '1' },
  { $set: { age: 31 } }
);

// Increment a counter
await users.update(
  { id: '1' },
  { $inc: { loginCount: 1 } }
);
```

### Reactivity

NebulaDB supports reactive queries that update in real-time when data changes.

```typescript
// Subscribe to changes in users over 30
const unsubscribe = users.subscribe(
  { age: { $gt: 30 } },
  (results) => {
    console.log('Users over 30:', results);
  }
);

// Later, unsubscribe when no longer needed
unsubscribe();
```

## Performance Optimizations

NebulaDB includes several performance optimizations to ensure fast and efficient operation, even with large datasets:

### Advanced Indexing

- **B-tree Implementation**: Efficient range queries and sorting
- **Compound Indexes**: Optimize queries on multiple fields
- **Partial Indexes**: Index only documents that match a filter
- **Automatic Index Selection**: Chooses the best index for each query

```typescript
// Create a collection with indexes
const users = db.collection('users', {
  indexes: [
    { name: 'id_idx', fields: ['id'], type: 'unique' },
    { name: 'age_idx', fields: ['age'], type: 'single' },
    { name: 'name_age_idx', fields: ['name', 'age'], type: 'compound' },
    {
      name: 'active_users_idx',
      fields: ['lastActive'],
      type: 'single',
      options: {
        partial: { filter: { active: true } }
      }
    }
  ]
});
```

### Query Optimization

- **Query Caching**: Automatically caches query results
- **Short-circuit Evaluation**: Stops evaluating as soon as possible
- **Query Planning**: Analyzes queries to determine the best execution path

```typescript
// Configure query cache
const db = createDb({
  adapter: new MemoryAdapter(),
  queryCache: {
    enabled: true,
    maxSize: 100,  // Cache up to 100 queries
    ttlMs: 30000   // Cache entries expire after 30 seconds
  }
});
```

### Batch Operations

- **Parallel Processing**: Process multiple operations concurrently
- **Reduced Overhead**: Minimize signal updates and index rebuilds

```typescript
// Batch insert
await users.insertBatch([
  { id: '1', name: 'Alice', age: 30 },
  { id: '2', name: 'Bob', age: 25 },
  { id: '3', name: 'Charlie', age: 35 }
]);

// Batch update
await users.updateBatch(
  [{ id: '1' }, { id: '2' }],
  [{ $set: { active: true } }, { $set: { active: false } }]
);

// Batch delete
await users.deleteBatch([{ id: '3' }]);
```

### Memory Management

- **Document Compression**: Automatically compresses large documents
- **Chunked Processing**: Process large datasets in manageable chunks
- **Memory-efficient Indexes**: Optimized data structures for indexes

```typescript
// Configure document compression
const db = createDb({
  adapter: new MemoryAdapter(),
  compression: {
    enabled: true,
    threshold: 1024,  // Compress documents larger than 1KB
    level: 6          // Compression level (1-9)
  }
});

// Process large datasets in chunks
await users.processInChunks(async (docs) => {
  // Process each chunk of documents
  return docs.map(doc => ({ ...doc, processed: true }));
});
```

### Adaptive Concurrency

- **Automatic Tuning**: Adjusts concurrency based on system performance
- **Workload Analysis**: Monitors operation latency to optimize throughput

```typescript
// Configure adaptive concurrency
const db = createDb({
  adapter: new MemoryAdapter(),
  concurrency: {
    enabled: true,
    initialConcurrency: 4,  // Start with 4 concurrent operations
    minConcurrency: 1,      // Minimum concurrency level
    maxConcurrency: 16,     // Maximum concurrency level
    targetLatency: 50       // Target latency in ms
  }
});
```

## API Reference

For detailed API documentation, see the [API Reference](./api-reference.md).

## Adapters

NebulaDB supports multiple storage adapters:

- **MemoryAdapter**: In-memory storage (no persistence)
- **LocalStorageAdapter**: Browser localStorage persistence
- **IndexedDBAdapter**: Browser IndexedDB persistence
- **FileSystemAdapter**: Node.js file system persistence

For more information, see the [Adapters Guide](./adapters.md).

## Plugins

NebulaDB can be extended with plugins:

- **ValidationPlugin**: Schema validation using Zod
- **EncryptionPlugin**: Field-level encryption
- **VersioningPlugin**: Document versioning and history

For more information, see the [Plugins Guide](./plugins.md).

## Examples

For example applications, see the [Examples](./examples.md).

## Advanced Usage

For advanced usage scenarios, see the [Advanced Usage Guide](./advanced-usage.md).
