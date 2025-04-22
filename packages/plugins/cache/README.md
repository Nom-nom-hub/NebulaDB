# @nebula-db/plugin-cache

Query caching plugin for NebulaDB

Part of the [NebulaDB](https://github.com/Nom-nom-hub/NebulaDB) project - a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database.

## Installation

```bash
npm install @nebula-db/plugin-cache
```

## Usage

```typescript
import { createDb } from '@nebula-db/core';
import { MemoryAdapter } from '@nebula-db/adapter-memory';
import { createCachePlugin } from '@nebula-db/plugin-cache';

// Create the plugin
const cachePlugin = createCachePlugin();

// Create a database with the plugin
const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [cachePlugin]
});

// Use the database with the plugin
const users = db.collection('users');
await users.insert({ name: 'Alice', age: 30 });
```

## Documentation

For full documentation, visit the [NebulaDB GitHub repository](https://github.com/Nom-nom-hub/NebulaDB).

## License

MIT
