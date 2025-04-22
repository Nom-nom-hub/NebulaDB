# @nebula-db/plugin-validation

Schema validation plugin for NebulaDB using Zod

Part of the [NebulaDB](https://github.com/Nom-nom-hub/NebulaDB) project - a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database.

## Installation

```bash
npm install @nebula-db/plugin-validation
```

## Usage

```typescript
import { createDb } from '@nebula-db/core';
import { MemoryAdapter } from '@nebula-db/adapter-memory';
import { createValidationPlugin } from '@nebula-db/plugin-validation';

// Create the plugin
const validationPlugin = createValidationPlugin();

// Create a database with the plugin
const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [validationPlugin]
});

// Use the database with the plugin
const users = db.collection('users');
await users.insert({ name: 'Alice', age: 30 });
```

## Documentation

For full documentation, visit the [NebulaDB GitHub repository](https://github.com/Nom-nom-hub/NebulaDB).

## License

MIT
