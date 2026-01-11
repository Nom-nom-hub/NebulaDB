# Deno KV Adapter for NebulaDB

A persistent storage adapter for NebulaDB using Deno's built-in KV store.

## Features

- **Deno Runtime Support**: Built specifically for Deno environments
- **Persistent Storage**: Data persists across application restarts
- **Simple API**: Implements NebulaDB's Adapter interface
- **Cloud Ready**: Works with both local and Deno Deploy cloud storage

## Installation

```bash
deno add jsr:@nebula-db/adapter-deno-kv
```

Or import directly:

```typescript
import { DenoKvAdapter } from 'jsr:@nebula-db/adapter-deno-kv';
```

## Usage

### Basic Setup

```typescript
import { createDb } from '@nebula-db/core';
import { createDenoKvAdapter } from '@nebula-db/adapter-deno-kv';

// Create database with Deno KV adapter
const adapter = createDenoKvAdapter();
const db = createDb({ adapter });

// Create and use collections
const users = db.collection('users');
await users.insert({ name: 'Alice', age: 30 });
```

### With Custom Prefix

```typescript
// Use a custom prefix for key namespacing
const adapter = createDenoKvAdapter(undefined, 'myapp');
const db = createDb({ adapter });
```

## Permissions

The Deno KV adapter requires the following permissions:

```bash
deno run --allow-kv your-script.ts
```

## Key Structure

Documents are stored with the following key structure:

```
[prefix, collectionName, documentId]
```

Example keys:
- `["nebula-db", "users", "user-123"]`
- `["myapp", "posts", "post-456"]`

## Limitations

- KV operations are eventually consistent (like real distributed systems)
- Transactions are not atomic across multiple operations
- String keys are not supported directly; collection/document structure recommended

## Performance Characteristics

- **Read**: O(1) for single documents, O(n) for collection scans
- **Write**: O(1) per document
- **Storage**: Limited by Deno KV storage quotas

## Deno Deploy

This adapter works seamlessly with Deno Deploy:

```typescript
// Your app automatically uses cloud KV when deployed
const adapter = createDenoKvAdapter();
const db = createDb({ adapter });
```

No code changes needed - Deno handles routing local vs. cloud KV automatically.

## License

MIT
