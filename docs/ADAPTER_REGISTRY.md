# NebulaDB Adapter Registry

The Adapter Registry provides a comprehensive guide to all available storage adapters for NebulaDB, including installation, usage, and performance characteristics.

## Core Adapters

### Memory Adapter
**Package**: `@nebula-db/adapter-memory` (Built-in)

In-memory storage - data lost on restart. Perfect for testing and development.

```typescript
import { MemoryAdapter } from '@nebula-db/core';

const db = createDb({ adapter: new MemoryAdapter() });
```

**Use Cases**:
- Unit tests and integration tests
- Development environments
- Temporary data storage
- Caching layers

---

### SQLite Adapter
**Package**: `@nebula-db/adapter-sqlite` (Built-in)

Persistent file-based storage using SQLite. Best for single-machine deployments.

```typescript
import { SQLiteAdapter } from '@nebula-db/core';

const db = createDb({ 
  adapter: new SQLiteAdapter('./data/app.db') 
});
```

**Use Cases**:
- Desktop applications
- Electron apps
- Single-server deployments
- Development with persistence

**Performance**: O(1) reads/writes, very fast for local access

---

### IndexedDB Adapter
**Package**: `@nebula-db/adapter-indexeddb` (Built-in)

Browser-native storage for web applications.

```typescript
import { IndexedDBAdapter } from '@nebula-db/adapter-indexeddb';

const db = createDb({ 
  adapter: new IndexedDBAdapter('myapp') 
});
```

**Use Cases**:
- Browser-based applications
- Progressive web apps (PWAs)
- Offline-first applications
- Client-side data persistence

**Limits**: 50MB+ per domain (browser dependent)

---

### LocalStorage Adapter
**Package**: `@nebula-db/adapter-localstorage` (Built-in)

Simple browser storage for small datasets.

```typescript
import { LocalStorageAdapter } from '@nebula-db/adapter-localstorage';

const db = createDb({ 
  adapter: new LocalStorageAdapter('myapp') 
});
```

**Use Cases**:
- Small application state (< 5MB)
- User preferences
- Simple caching
- Legacy browser support

**Limit**: 5-10MB per domain

---

### Filesystem Adapter
**Package**: `@nebula-db/adapter-filesystem` (Built-in)

File-based storage with JSON serialization.

```typescript
import { FilesystemAdapter } from '@nebula-db/adapter-filesystem';

const db = createDb({ 
  adapter: new FilesystemAdapter('./data') 
});
```

**Use Cases**:
- Node.js applications
- File-based data stores
- Cloud storage backup
- Portable data format

---

### Redis Adapter
**Package**: `@nebula-db/adapter-redis` (Built-in)

Redis-backed storage for distributed systems.

```typescript
import { RedisAdapter } from '@nebula-db/adapter-redis';
import { createClient } from 'redis';

const client = createClient();
const db = createDb({ 
  adapter: new RedisAdapter(client) 
});
```

**Use Cases**:
- Distributed systems
- High-performance caching
- Multi-machine deployments
- Real-time collaboration

**Performance**: Sub-millisecond latency

---

## Phase 3 Edge Adapters

### Deno KV Adapter
**Package**: `@nebula-db/adapter-deno-kv`

Native Deno KV storage for Deno runtime and Deno Deploy.

```typescript
import { createDenoKvAdapter } from '@nebula-db/adapter-deno-kv';

const db = createDb({
  adapter: createDenoKvAdapter()
});
```

**Features**:
- Native Deno KV integration
- Works with local and cloud storage
- Persistent key-value storage
- Zero configuration for Deno Deploy

**Use Cases**:
- Deno runtime applications
- Deno Deploy serverless functions
- Edge computing with Deno
- Cloud-native applications

**Permissions Required**:
```bash
deno run --allow-kv app.ts
```

**Key Structure**:
```
[prefix, collectionName, documentId]
```

**Learn More**: [Deno KV Adapter README](../packages/adapter-deno-kv/README.md)

---

### Cloudflare D1 Adapter
**Package**: `@nebula-db/adapter-cloudflare-d1`

Cloudflare D1 (SQLite at the edge) adapter for Workers and Pages.

```typescript
import { createCloudflareD1Adapter } from '@nebula-db/adapter-cloudflare-d1';

export default {
  async fetch(req, env) {
    const db = createDb({
      adapter: createCloudflareD1Adapter(env.DB)
    });
  }
};
```

**Features**:
- Edge computing with SQLite
- Cloudflare Workers integration
- Cloudflare Pages Functions support
- Automatic global replication

**Use Cases**:
- Cloudflare Workers
- Cloudflare Pages Functions
- Edge computing applications
- Global API backends

**Setup**:
```bash
wrangler d1 create nebula_db
```

**wrangler.toml Configuration**:
```toml
[[d1_databases]]
binding = "DB"
database_name = "nebula_db"
database_id = "your-id"
```

**Learn More**: [Cloudflare D1 Adapter README](../packages/adapter-cloudflare-d1/README.md)

---

## Encrypted Adapters

### Encrypted Adapter Wrapper
**Package**: `@nebula-db/plugin-encryption`

Transparent encryption wrapper for any adapter.

```typescript
import { EncryptedAdapter } from '@nebula-db/plugin-encryption';

const wrapped = new EncryptedAdapter({
  adapter: new SQLiteAdapter('./data.db'),
  password: 'my-secure-password'
});

const db = createDb({ adapter: wrapped });
```

**Features**:
- AES-256-GCM encryption
- PBKDF2 key derivation
- Transparent encryption/decryption
- Works with any adapter

**Learn More**: See [Encryption Documentation](./ENCRYPTION.md)

---

## Adapter Comparison Matrix

| Adapter | Persistence | Speed | Scalability | Use Case |
|---------|-------------|-------|-------------|----------|
| Memory | No | ⚡⚡⚡ | Single process | Testing |
| SQLite | Yes | ⚡⚡ | Single machine | Desktop/Server |
| IndexedDB | Yes | ⚡⚡ | Browser | Web apps |
| LocalStorage | Yes | ⚡ | Browser | Small data |
| Filesystem | Yes | ⚡⚡ | Single machine | File-based |
| Redis | Yes | ⚡⚡⚡ | Distributed | High-performance |
| Deno KV | Yes | ⚡⚡⚡ | Global (Deno) | Deno Deploy |
| D1 | Yes | ⚡⚡⚡ | Global (Edge) | Cloudflare |

---

## Choosing an Adapter

### For Development
- **Memory Adapter**: Testing, unit tests
- **SQLite Adapter**: Development with persistence

### For Web Applications
- **IndexedDB**: Modern PWAs, offline support
- **Encrypted Adapter**: Sensitive user data

### For Server Applications
- **SQLite**: Single server deployments
- **Redis**: Multi-server, high-performance
- **Cloudflare D1**: Serverless, edge computing

### For Deno
- **Deno KV**: Any Deno application
- **Deno KV + Encrypted**: Secure Deno apps

### For Edge Computing
- **Cloudflare D1**: Cloudflare Workers/Pages
- **Deno KV**: Deno Deploy

### For Maximum Compatibility
- **Encrypted Adapter**: Wrap any adapter with encryption

---

## Creating a Custom Adapter

See [Creating Custom Adapters Guide](./CREATING_ADAPTERS.md) for detailed instructions on building your own adapter.

## Performance Benchmarks

See [Performance Guide](./PERFORMANCE.md) for detailed benchmarks and optimization tips.

## Support

For adapter-specific issues or questions:
- File an issue on [GitHub](https://github.com/Nom-nom-hub/NebulaDB)
- Check adapter README files for detailed docs
- Review examples in `/examples` directory
