# @nebula-db/adapter-localstorage

LocalStorage adapter for NebulaDB

Part of the [NebulaDB](https://github.com/Nom-nom-hub/NebulaDB) project - a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database.

## Installation

```bash
npm install @nebula-db/adapter-localstorage
```

## Usage

```typescript
import { createDb } from '@nebula-db/core';
import { LocalstorageAdapter } from '@nebula-db/adapter-localstorage';

// Create a database with localstorage adapter
const db = createDb({
  adapter: new LocalstorageAdapter()
});

// Use the database
const users = db.collection('users');
await users.insert({ name: 'Alice', age: 30 });
```

## Documentation

For full documentation, visit the [NebulaDB GitHub repository](https://github.com/Nom-nom-hub/NebulaDB).

## License

MIT
