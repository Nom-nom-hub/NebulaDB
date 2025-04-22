# @nebula-db/vite-plugin

Vite plugin for NebulaDB

Part of the [NebulaDB](https://github.com/Nom-nom-hub/NebulaDB) project - a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database.

## Installation

```bash
npm install @nebula-db/vite-plugin
```

## Usage

```typescript
import { createDb } from '@nebula-db/core';
import { MemoryAdapter } from '@nebula-db/adapter-memory';
import { createVite-pluginPlugin } from '@nebula-db/vite-plugin';

// Create the plugin
const vite-pluginPlugin = createVite-pluginPlugin();

// Create a database with the plugin
const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [vite-pluginPlugin]
});

// Use the database with the plugin
const users = db.collection('users');
await users.insert({ name: 'Alice', age: 30 });
```

## Documentation

For full documentation, visit the [NebulaDB GitHub repository](https://github.com/Nom-nom-hub/NebulaDB).

## License

MIT
