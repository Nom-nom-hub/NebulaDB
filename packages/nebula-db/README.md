# NebulaDB

Fast, flexible, serverless embedded NoSQL database for modern applications.

<div align="center">
<img src="https://raw.githubusercontent.com/Nom-nom-hub/NebulaDB/main/assets/nebulalogo.png" alt="NebulaDB Logo" width="400" />

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![npm version](https://img.shields.io/badge/npm-v0.1.0-blue)](https://www.npmjs.com/package/@nebula-db/nebula-db)
</div>

NebulaDB is a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database that runs in the browser, Node.js, and Edge environments. It features advanced indexing, optimized query processing, modular adapters for persistence, reactive live queries, extensibility via plugins, and blazing-fast in-memory operations with adaptive concurrency control.

## Features

- 🚀 **Blazing Fast**: Optimized in-memory operations with advanced indexing and query caching
- 🔄 **Reactive**: Live queries that update in real-time
- 📐 **TypeScript-First**: Full type safety with your data
- 🧩 **Modular**: Use only what you need with adapters and plugins
- 🌐 **Universal**: Works in browsers, Node.js, and Edge environments
- 🔌 **Extensible**: Create custom adapters and plugins
- 📊 **Optimized**: B-tree indexing, batch operations, and adaptive concurrency control
- 💾 **Efficient**: Document compression and memory management for large datasets
- 🔍 **Smart Queries**: Query optimization with short-circuit evaluation and index selection

## Installation

```bash
# Install the main package
npm install @nebula-db/nebula-db
```

## Quick Start

```typescript
import { createDatabase } from '@nebula-db/nebula-db';

// Create a database with in-memory storage (default)
const db = createDatabase();

// Create a database with localStorage (for browsers)
const browserDb = createDatabase({ storage: 'localStorage' });

// Create a database with IndexedDB (for browsers)
const indexedDb = createDatabase({ storage: 'indexedDB' });

// Create a database with file system storage (for Node.js)
const nodeDb = createDatabase({ 
  storage: 'fileSystem',
  path: './my-database'
});

// Create a database with validation
const validatedDb = createDatabase({ validation: true });

// Create a collection
const users = db.collection('users');

// Insert a document
await users.insert({ name: 'Alice', age: 30 });

// Query documents
const result = await users.find({ age: { $gt: 20 } });
console.log(result);

// Subscribe to changes (reactive queries)
users.subscribe({ age: { $gt: 30 } }, (result) => {
  console.log('Users over 30:', result);
});
```

## Advanced Usage

For more advanced usage, you can import specific components:

```typescript
import { 
  createDb, 
  MemoryAdapter, 
  LocalStorageAdapter,
  IndexedDBAdapter,
  FileSystemAdapter,
  createValidationPlugin
} from '@nebula-db/nebula-db';

// Create a database with custom configuration
const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [
    createValidationPlugin()
  ],
  queryCache: { enabled: true, maxSize: 100 },
  concurrency: { enabled: true, initialConcurrency: 4 },
  compression: { enabled: true, threshold: 1024 }
});
```

## Documentation

For full documentation, visit the [NebulaDB GitHub repository](https://github.com/Nom-nom-hub/NebulaDB).

## License

MIT
