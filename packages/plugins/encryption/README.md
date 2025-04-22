# @nebula-db/plugin-encryption

Encryption plugin for NebulaDB

Part of the [NebulaDB](https://github.com/Nom-nom-hub/NebulaDB) project - a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database.

## Installation

```bash
npm install @nebula-db/plugin-encryption
```

## Usage

```typescript
import { createDb } from '@nebula-db/core';
import { MemoryAdapter } from '@nebula-db/adapter-memory';
import { createEncryptionPlugin } from '@nebula-db/plugin-encryption';

// Create the plugin
const encryptionPlugin = createEncryptionPlugin();

// Create a database with the plugin
const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [encryptionPlugin]
});

// Use the database with the plugin
const users = db.collection('users');
await users.insert({ name: 'Alice', age: 30 });
```

## Documentation

For full documentation, visit the [NebulaDB GitHub repository](https://github.com/Nom-nom-hub/NebulaDB).

## License

MIT
