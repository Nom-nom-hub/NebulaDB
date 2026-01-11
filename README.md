<div align="center">

<img src="./assets/nebulalogo.png" alt="NebulaDB Logo" width="400" />

# NebulaDB

**Fast. Flexible. Secure. The embedded database for the modern stack.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![npm version](https://img.shields.io/badge/npm-v0.4.0-blue)](https://www.npmjs.com/package/@nebula-db/core)
[![Product Hunt](https://img.shields.io/badge/Product%20Hunt-NebulaDB-orange)](https://www.producthunt.com/products/nebuladb)
[![Build Status](https://img.shields.io/github/actions/workflow/status/Nom-nom-hub/NebulaDB/build.yml?branch=main)](https://github.com/Nom-nom-hub/NebulaDB/actions)
[![Coverage Status](https://img.shields.io/codecov/c/github/Nom-nom-hub/NebulaDB)](https://codecov.io/gh/Nom-nom-hub/NebulaDB)
[![Downloads](https://img.shields.io/npm/dm/@nebula-db/core)](https://www.npmjs.com/package/@nebula-db/core)
[![GitHub Stars](https://img.shields.io/github/stars/Nom-nom-hub/NebulaDB)](https://github.com/Nom-nom-hub/NebulaDB/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/Nom-nom-hub/NebulaDB)](https://github.com/Nom-nom-hub/NebulaDB/issues)
[![GitHub PRs](https://img.shields.io/github/issues-pr/Nom-nom-hub/NebulaDB)](https://github.com/Nom-nom-hub/NebulaDB/pulls)
[![Node.js Version](https://img.shields.io/node/v/@nebula-db/core)](https://nodejs.org/)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@nebula-db/core)](https://bundlephobia.com/package/@nebula-db/core)
[![Last Commit](https://img.shields.io/github/last-commit/Nom-nom-hub/NebulaDB)](https://github.com/Nom-nom-hub/NebulaDB/commits/main)

</div>

NebulaDB is a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database that runs in the browser, Node.js, and Edge environments. It features advanced indexing, optimized query processing, modular adapters for persistence, reactive live queries, extensibility via plugins, real-time sync & replication, enterprise-grade encryption, and blazing-fast in-memory operations with adaptive concurrency control.

## Latest Release: v0.4.0 "Cirrus" (January 11, 2026)

A major release bringing enterprise-grade features:

✨ **Real-Time Sync & Replication** - Multi-strategy conflict resolution, P2P sync, offline queuing
🔐 **Enterprise Encryption** - AES-256-GCM encryption at rest, field-level encryption, searchable encryption
🌍 **Edge Deployment** - Deno KV and Cloudflare D1 adapters for edge environments
⚡ **Performance Boost** - Query optimizer, worker pools (4-8x speedup), performance profiler
📊 **Production Ready** - 248 tests (85.3% coverage), zero breaking changes, fully backward compatible

[Read the full Release Notes](./RELEASE_NOTES_v0.4.0.md) | [Migration Guide](./docs/MIGRATION_v0.3_to_v0.4.md)

## Project Status

- **Build Status**: Continuous integration status for the main branch
- **Coverage Status**: Code coverage percentage from automated tests
- **Downloads**: Monthly downloads from npm
- **GitHub Stars**: Number of GitHub stars the project has received
- **GitHub Issues**: Number of open issues
- **GitHub PRs**: Number of open pull requests
- **Node.js Version**: Minimum required Node.js version
- **Bundle Size**: Minified + gzipped size of the core package
- **Last Commit**: Date of the last commit to the main branch

## Features

- 🚀 **Blazing Fast**: Query optimizer with automatic index selection, 4-8x batch speedup with worker pools
- 🔄 **Real-Time Sync**: Multi-strategy conflict resolution, P2P sync, offline queuing with webhooks
- 🔐 **Enterprise Security**: AES-256-GCM encryption, field-level encryption, searchable encryption
- ⚡ **Reactive**: Live queries that update in real-time with subscription support
- 📐 **TypeScript-First**: Full type safety with your data and strict mode support
- 🧩 **Modular**: Use only what you need with adapters and plugins
- 🌐 **Universal**: Works in browsers, Node.js, Deno, Cloudflare Workers, and edge environments
- 🔌 **Extensible**: Create custom adapters and plugins
- 📊 **Optimized**: B-tree indexing, batch operations, adaptive concurrency control, compression
- 💾 **Efficient**: Document compression and memory management for large datasets

## Installation

### Requirements

- **Node.js 18.x or higher** (required for development and optimal performance)
- npm 8.x or higher

### Simple Installation (Recommended)

```bash
# Install the main package
npm install @nebula-db/nebula-db
```

### Advanced Installation (For more control)

```bash
# Install core package
npm install @nebula-db/core

# Install adapters as needed
npm install @nebula-db/adapter-localstorage
npm install @nebula-db/adapter-indexeddb
npm install @nebula-db/adapter-filesystem

# Install plugins as needed
npm install @nebula-db/plugin-encryption
npm install @nebula-db/plugin-validation
npm install @nebula-db/plugin-versioning
```

> **Important**: Development dependencies require Node.js 18+. The core library is designed to work with Node.js 18+ for optimal performance and compatibility with modern JavaScript features.
>
> If you're running on Node.js 16.x, you can bypass the version check for development purposes by setting the `NEBULA_SKIP_VERSION_CHECK=1` environment variable:
> ```
> NEBULA_SKIP_VERSION_CHECK=1 npm run <command>
> ```
> Note that this is only recommended for development and testing purposes. Production use should always use Node.js 18+.

## Quick Start

### Simple Usage (Recommended)

```typescript
import { createDatabase } from '@nebula-db/nebula-db';

// Create a database with in-memory storage (default)
const db = createDatabase();

// Create a database with localStorage (for browsers)
const browserDb = createDatabase({ storage: 'localStorage' });

// Create a database with file system storage (for Node.js)
const nodeDb = createDatabase({
  storage: 'fileSystem',
  path: './my-database'
});

// Create a database with validation
const validatedDb = createDatabase({ validation: true });
```

### Advanced Usage

```typescript
import { createDb } from '@nebula-db/core';
import { MemoryAdapter } from '@nebula-db/adapter-memory';

// Create a database with in-memory adapter and optimized settings
const db = createDb({
  adapter: new MemoryAdapter(),
  // Enable query caching for better performance
  queryCache: { enabled: true, maxSize: 100 },
  // Enable adaptive concurrency for parallel operations
  concurrency: { enabled: true, initialConcurrency: 4 },
  // Enable document compression for large datasets
  compression: { enabled: true, threshold: 1024 }
});

// Create a collection with indexes for faster queries
const users = db.collection('users', {
  indexes: [
    { name: 'id_idx', fields: ['id'], type: 'unique' },
    { name: 'age_idx', fields: ['age'], type: 'single' }
  ]
});

// Batch insert for better performance
await users.insertBatch([
  { id: '1', name: 'Alice', age: 30 },
  { id: '2', name: 'Bob', age: 25 },
  { id: '3', name: 'Charlie', age: 35 }
]);

// Query documents (uses indexes automatically)
const result = await users.find({ age: { $gt: 20 } });
console.log(result); // [{ id: '1', name: 'Alice', age: 30 }, ...]

// Batch update for better performance
await users.updateBatch(
  [{ id: '1' }, { id: '2' }],
  [{ $set: { active: true } }, { $set: { active: false } }]
);

// Batch delete for better performance
await users.deleteBatch([{ id: '3' }]);

// Subscribe to changes (reactive queries)
users.subscribe({ age: { $gt: 30 } }, (result) => {
  console.log('Users over 30:', result);
});

// Process large datasets in chunks to avoid memory issues
await users.processInChunks(async (docs) => {
  // Process each chunk of documents
  return docs.map(doc => ({ ...doc, processed: true }));
});
```

## Why NebulaDB?

NebulaDB was designed to solve common challenges in modern web and application development:

- **Simplified Data Management**: No need to set up and maintain a separate database server
- **High Performance**: Advanced indexing, query optimization, and adaptive concurrency
- **Offline-First Development**: Built for applications that need to work offline
- **Reactive UI Updates**: Real-time UI updates without complex state management
- **TypeScript Integration**: First-class TypeScript support for type safety
- **Flexible Schema**: Adapt to changing requirements without migrations
- **Lightweight**: Small bundle size, perfect for edge computing and mobile devices
- **Scalable**: Efficient memory management and document compression for large datasets
- **Batch Operations**: Optimized for bulk inserts, updates, and deletes

## Comparison

Here's how NebulaDB compares to other embedded databases:

| Feature | NebulaDB | LokiJS | PouchDB | Lowdb |
|---------|----------|--------|---------|-------|
| TypeScript-first | ✅ | ❌ | ❌ | ✅ |
| Reactive queries | ✅ | ❌ | ✅ | ❌ |
| Real-time sync | ✅ | ❌ | ✅ | ❌ |
| Encryption (at-rest) | ✅ | ❌ | ❌ | ❌ |
| Plugin system | ✅ | ❌ | ✅ | ❌ |
| Schema validation | ✅ | ❌ | ❌ | ❌ |
| Browser support | ✅ | ✅ | ✅ | ✅ |
| Node.js support | ✅ | ✅ | ✅ | ✅ |
| Deno support | ✅ | ❌ | ❌ | ❌ |
| Edge runtime support | ✅ | ❌ | ❌ | ❌ |
| Advanced indexing | ✅ | ⚠️ | ⚠️ | ❌ |
| Query optimization | ✅ | ❌ | ❌ | ❌ |
| Worker pools | ✅ | ❌ | ❌ | ❌ |
| Batch operations | ✅ | ⚠️ | ✅ | ❌ |
| Document compression | ✅ | ❌ | ✅ | ❌ |
| Adaptive concurrency | ✅ | ❌ | ❌ | ❌ |
| Memory management | ✅ | ⚠️ | ❌ | ❌ |
| Bundle size | Small | Medium | Large | Small |

## Performance

NebulaDB is designed for high performance. Here are some benchmark results:

| Operation (10,000 docs) | NebulaDB | RxDB | LokiJS |
|-------------------------|----------|------|--------|
| Batch Insert            | 8.05ms   | 87ms | 42ms   |
| Find All                | 0.02ms   | 5ms  | 2ms    |
| Find with Query         | 0.69ms   | 12ms | 8ms    |
| Batch Delete            | 61.45ms  | 120ms| 95ms   |

### Optimizations

- **Advanced Indexing**: B-tree implementation for efficient range queries
- **Query Caching**: Automatic caching of query results for repeated queries
- **Batch Operations**: Optimized bulk operations with parallel processing
- **Document Compression**: Automatic compression of large documents
- **Memory Management**: Efficient memory usage with chunked processing
- **Adaptive Concurrency**: Automatic tuning of concurrency levels based on workload

## Documentation

For full documentation, visit [docs/README.md](docs/README.md).

## Examples

Check out the [examples](examples/) directory for complete working examples:

- [Node.js Example](examples/node-demo/): A simple CLI application using NebulaDB with file system persistence
- [Browser Example](examples/browser-demo/): A todo application using NebulaDB with localStorage persistence

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Node.js Version Issues

If you encounter errors related to Node.js version compatibility:

1. **Update Node.js**: The recommended solution is to update to Node.js 18 or higher.
   - Download from [nodejs.org](https://nodejs.org/)
   - Or use a version manager like [nvm](https://github.com/nvm-sh/nvm)

2. **Bypass Version Check**: For development only, you can bypass the version check:
   ```
   NEBULA_SKIP_VERSION_CHECK=1 npm run <command>
   ```

3. **Engine Warnings**: If you see `EBADENGINE` warnings but the installation completes, these are just warnings and can be ignored for development purposes.

### Common Issues

- **ESLint Errors**: If you encounter ESLint errors, run `npm run lint -- --fix` to automatically fix many common issues.

- **Test Failures**: Make sure you're using Node.js 18+ for running tests. Some test features require modern JavaScript capabilities.

- **Build Errors**: If you encounter build errors, try running `npm run clean` followed by `npm run build`.

## License

MIT

> **Note:** If you are running NebulaDB in the browser, some cryptographic functions (like `crypto.randomFillSync`) may not be available. A simple polyfill is provided in the demo, but it is NOT cryptographically secure. For production, ensure your environment provides the necessary crypto APIs or use a secure polyfill.

## Build Instructions

To build the project:

- **On Windows:**
  ```sh
  npm run build:win
  ```
- **On macOS/Linux:**
  ```sh
  npm run build:unix
  ```

This will install dependencies and build all packages and plugins.
