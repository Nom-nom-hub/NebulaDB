# @nebula-db/adapter-filesystem

FileSystem adapter for NebulaDB

Part of the [NebulaDB](https://github.com/Nom-nom-hub/NebulaDB) project - a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database.

## Installation

```bash
npm install @nebula-db/adapter-filesystem
```

## Usage

```typescript
import { createDb } from '@nebula-db/core';
import { FilesystemAdapter } from '@nebula-db/adapter-filesystem';

// Create a database with filesystem adapter
const db = createDb({
  adapter: new FilesystemAdapter()
});

// Use the database
const users = db.collection('users');
await users.insert({ name: 'Alice', age: 30 });
```

## Documentation

For full documentation, visit the [NebulaDB GitHub repository](https://github.com/Nom-nom-hub/NebulaDB).

## License

MIT
