# NebulaDB v0.2.0 - Initial Public Release

We're excited to announce the initial public release of NebulaDB, a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database for modern applications!

## What's Included

- **Core Database Engine**: Fast in-memory database with advanced indexing and query capabilities
- **Multiple Storage Adapters**:
  - Memory adapter for in-memory storage
  - LocalStorage adapter for browser persistence
  - IndexedDB adapter for browser persistence
  - FileSystem adapter for Node.js persistence
- **Plugins**:
  - Validation plugin for schema validation using Zod
  - Encryption plugin for document encryption
  - Versioning plugin for document history
- **Developer Experience**:
  - TypeScript-first API with full type safety
  - Comprehensive documentation
  - Example applications

## Installation

```bash
# Simple installation (recommended)
npm install @nebula-db/nebula-db

# Or install individual packages
npm install @nebula-db/core
npm install @nebula-db/adapter-memory
# etc.
```

## Quick Start

```typescript
import { createDatabase } from '@nebula-db/nebula-db';

// Create a database with in-memory storage (default)
const db = createDatabase();

// Create a collection
const users = db.collection('users');

// Insert a document
await users.insert({ name: 'Alice', age: 30 });

// Query documents
const result = await users.find({ age: { $gt: 20 } });
console.log(result);
```

## Documentation

For full documentation, visit our [GitHub repository](https://github.com/Nom-nom-hub/NebulaDB) or our [documentation website](https://nom-nom-hub.github.io/NebulaDB/).

## Feedback

We welcome your feedback and contributions! Please open issues on GitHub for bug reports or feature requests.
