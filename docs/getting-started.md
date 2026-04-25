# NebulaDB - Getting Started

Fast, flexible, secure embedded database for modern JavaScript applications.

## Installation

```bash
npm install @nebula-db/core @nebula-db/adapter-memory
```

## Quick Start

```typescript
import { createDb } from '@nebula-db/core';
import { MemoryAdapter } from '@nebula-db/adapter-memory';

// Create database with memory adapter
const db = createDb({
  adapter: new MemoryAdapter()
});

// Get a collection
const users = db.collection('users');

// Insert documents
await users.insert({ name: 'Alice', age: 30 });
await users.insert({ name: 'Bob', age: 25 });

// Query documents
const results = await users.find({ age: { $gt: 20 } });
console.log(results);
// [{ id: '...', name: 'Alice', age: 30 }, { id: '...', name: 'Bob', age: 25 }]

// Update documents
await users.update({ name: 'Alice' }, { $set: { age: 31 } });

// Delete documents  
await users.delete({ name: 'Bob' });
```

## Core Concepts

### Database

The database is the main entry point holding collections.

```typescript
import { createDb } from '@nebula-db/core';
import { SQLiteAdapter } from '@nebula-db/adapter-sqlite';

const db = createDb({
  adapter: new SQLiteAdapter('./data.db'),
  name: 'my-app'
});

// Get all collection names
db.getCollectionNames();

// Access multiple collections
const users = db.collection('users');
const posts = db.collection('posts');
```

### Collections

Collections hold documents (like SQL tables or MongoDB collections).

```typescript
const users = db.collection('users', {
  // Optional: indexes
  indexes: [
    { name: 'age_idx', fields: ['age'], type: 'single' }
  ],
  // Optional: query cache
  queryCache: {
    enabled: true,
    maxSize: 100,
    ttlMs: 30000
  }
});
```

### Documents

Documents are plain JavaScript objects with required `id` field.

```typescript
await users.insert({
  id: 'user-1',  // required
  name: 'Alice',
  email: 'alice@example.com',
  profile: {
    bio: 'Hello world',
    avatar: 'https://...'
  },
  tags: ['admin', 'author']
});
```

## Query Syntax

### Basic Queries

```typescript
// Find all
await users.find({});

// Find by field
await users.find({ name: 'Alice' });

// Find by nested field
await users.find({ 'profile.bio': 'Hello' });

// Comparison operators
await users.find({ age: { $gt: 25 } });    // greater than
await users.find({ age: { $gte: 25 } });   // greater than or equal
await users.find({ age: { $lt: 30 } });    // less than
await users.find({ age: { $lte: 30 } });   // less than or equal
await users.find({ age: { $ne: 25 } });    // not equal
```

### Array Queries

```typescript
// Array contains
await users.find({ tags: { $contains: 'admin' } });

// Array length
await users.find({ tags: { $size: 2 } });

// In array
await users.find({ role: { $in: ['admin', 'moderator'] } });

// All in array
await users.find({ permissions: { $all: ['read', 'write'] } });
```

### Regex

```typescript
await users.find({ name: { $regex: '^A' } });     // starts with
await users.find({ name: { $regex: 'li$' } });     // ends with
await users.find({ name: { $regex: 'ic', $options: 'i' } });  // case insensitive
```

### Pagination

```typescript
const page1 = await users.find({}, { limit: 10, offset: 0 });
const page2 = await users.find({}, { limit: 10, offset: 10 });
```

### Sorting

```typescript
const results = await users.find({}, { sort: { age: 1 } });   // ascending
const results = await users.find({}, { sort: { age: -1 } }); // descending
```

## Live Queries

Reactive queries that update when data changes.

```typescript
const unsubscribe = collection.subscribe((docs) => {
  console.log('Data changed:', docs);
});

// Later: stop listening
unsubscribe();
```

## Next Steps

- [Adapters Guide](./adapters.md) - Choose storage backend
- [Plugins Guide](./plugins.md) - Add encryption, sync, etc.
- [API Reference](./api-reference.md) - Full API docs
- [Examples](./examples/) - Complete examples