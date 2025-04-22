# @nebula-db/core

Core package for NebulaDB

Part of the [NebulaDB](https://github.com/Nom-nom-hub/NebulaDB) project - a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database.

## Installation

```bash
npm install @nebula-db/core
```

## Quick Start

```typescript
import { createDb } from '@nebula-db/core';
import { MemoryAdapter } from '@nebula-db/adapter-memory';

// Create a database with in-memory adapter
const db = createDb({
  adapter: new MemoryAdapter()
});

// Create a collection
const users = db.collection('users');

// Insert a document
await users.insert({ name: 'Alice', age: 30 });

// Query documents
const result = await users.find({ age: { $gt: 20 } });
console.log(result);
```

## Documentation

For full documentation, visit the [NebulaDB GitHub repository](https://github.com/Nom-nom-hub/NebulaDB).

## License

MIT
