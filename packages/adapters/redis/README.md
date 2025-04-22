# @nebula-db/adapter-redis

Redis adapter for NebulaDB

Part of the [NebulaDB](https://github.com/Nom-nom-hub/NebulaDB) project - a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database.

## Installation

```bash
npm install @nebula-db/adapter-redis
```

## Usage

```typescript
import { createDb } from '@nebula-db/core';
import { RedisAdapter } from '@nebula-db/adapter-redis';

// Create a database with redis adapter
const db = createDb({
  adapter: new RedisAdapter()
});

// Use the database
const users = db.collection('users');
await users.insert({ name: 'Alice', age: 30 });
```

## Documentation

For full documentation, visit the [NebulaDB GitHub repository](https://github.com/Nom-nom-hub/NebulaDB).

## License

MIT
