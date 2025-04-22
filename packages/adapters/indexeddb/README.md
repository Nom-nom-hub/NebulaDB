# @nebula-db/adapter-indexeddb

IndexedDB adapter for NebulaDB

Part of the [NebulaDB](https://github.com/Nom-nom-hub/NebulaDB) project - a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database.

## Installation

```bash
npm install @nebula-db/adapter-indexeddb
```

## Usage

```typescript
import { createDb } from '@nebula-db/core';
import { IndexeddbAdapter } from '@nebula-db/adapter-indexeddb';

// Create a database with indexeddb adapter
const db = createDb({
  adapter: new IndexeddbAdapter()
});

// Use the database
const users = db.collection('users');
await users.insert({ name: 'Alice', age: 30 });
```

## Documentation

For full documentation, visit the [NebulaDB GitHub repository](https://github.com/Nom-nom-hub/NebulaDB).

## License

MIT
