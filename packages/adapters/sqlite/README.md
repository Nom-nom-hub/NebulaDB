# @nebula-db/adapter-sqlite

SQLite adapter for NebulaDB

Part of the [NebulaDB](https://github.com/Nom-nom-hub/NebulaDB) project - a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database.

## Installation

```bash
npm install @nebula-db/adapter-sqlite
```

## Usage

```typescript
import { createDb } from '@nebula-db/core';
import { SqliteAdapter } from '@nebula-db/adapter-sqlite';

// Create a database with sqlite adapter
const db = createDb({
  adapter: new SqliteAdapter()
});

// Use the database
const users = db.collection('users');
await users.insert({ name: 'Alice', age: 30 });
```

## Documentation

For full documentation, visit the [NebulaDB GitHub repository](https://github.com/Nom-nom-hub/NebulaDB).

## License

MIT
