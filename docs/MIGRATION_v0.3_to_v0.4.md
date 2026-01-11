# NebulaDB v0.4.0 Migration Guide

## Upgrading from v0.3.0 to v0.4.0

This guide helps you migrate your NebulaDB applications from v0.3.0 to v0.4.0 "Cirrus". The update includes new features (Sync, Encryption, Adapters, Performance) with excellent backward compatibility.

---

## TL;DR - Quick Upgrade Path

```bash
# Update package
npm install @nebula-db/core@0.4.0

# No breaking changes to core API
# Your existing code will work as-is
# New features available via opt-in imports
```

---

## What's New in v0.4.0

### Phase 1: Sync & Replication
- ✅ Multi-strategy conflict resolution (LWWM, server-wins, client-wins, custom merge)
- ✅ Peer-to-peer sync between local instances
- ✅ Browser ↔ Browser sync via IndexedDB
- ✅ Offline queue persistence
- ✅ Sync progress tracking and callbacks
- ✅ Sync server with persistence

### Phase 2: Security & Encryption
- ✅ AES-256-GCM encryption at rest
- ✅ Field-level encryption support
- ✅ Key management API
- ✅ PBKDF2 key derivation
- ✅ Searchable encryption for indexed fields

### Phase 3: Advanced Adapters
- ✅ Deno KV storage (edge runtime)
- ✅ Cloudflare D1 SQLite (Workers & Pages)
- ✅ Adapter ecosystem documentation
- ✅ Adapter developer guide

### Phase 4: Performance
- ✅ Query Optimizer with index selection
- ✅ Worker Pool for parallelization (browser & Node.js)
- ✅ Performance Profiler with memory tracking
- ✅ Query plan visualization
- ✅ Automatic hardware concurrency detection

---

## Breaking Changes

**NONE** - v0.4.0 is fully backward compatible with v0.3.0.

All existing code continues to work. New features are opt-in.

---

## Migration Checklist

### Step 1: Update Package

```bash
npm install @nebula-db/core@0.4.0
```

### Step 2: Verify Existing Code Works

```typescript
// Your existing code works unchanged
import { createDb } from '@nebula-db/core';

const db = createDb({ adapter: new MemoryAdapter() });
const collection = db.collection('users');

// All existing methods still work
await collection.insert({ name: 'Alice' });
const results = await collection.find({ name: 'Alice' });
```

### Step 3: (Optional) Add New Features

#### 3a. Enable Sync Replication

```typescript
import { createDb, SyncPlugin } from '@nebula-db/core';

const db = createDb({ adapter: new MemoryAdapter() });

// Enable sync with conflict resolution
const sync = new SyncPlugin({
  serverUrl: 'https://your-sync-server.com',
  conflictResolution: 'last-write-wins' // or 'server-wins', 'client-wins'
});

db.use(sync);
```

#### 3b. Enable Database Encryption

```typescript
import { createDb, EncryptionAdapter } from '@nebula-db/core';

const db = createDb({
  adapter: new EncryptionAdapter({
    baseAdapter: new SQLiteAdapter('data.db'),
    encryptionKey: 'your-secret-key',
    algorithm: 'aes-256-gcm'
  })
});
```

#### 3c. Use Performance Tools

```typescript
import { createDb, QueryOptimizer, createWorkerPool, getProfiler } from '@nebula-db/core';

// Analyze queries
const optimizer = new QueryOptimizer();
const plan = optimizer.analyzeQuery(query, indexes, totalDocs);
console.log(optimizer.formatPlan(plan));

// Parallelize batch operations
const pool = createWorkerPool(8);
const results = await pool.processBatch(items, processor);

// Profile operations
const profiler = getProfiler();
await profiler.measureAsync('operation', async () => {
  return await db.collection('users').find({});
});
const report = profiler.generateReport();
console.log(profiler.formatReport(report));
```

---

## API Changes by Feature

### Core Database (No Changes)

```typescript
// All existing methods work exactly as before
createDb()           // ✅ unchanged
collection()         // ✅ unchanged
insert()             // ✅ unchanged
find()               // ✅ unchanged
update()             // ✅ unchanged
remove()             // ✅ unchanged
insertBatch()        // ✅ unchanged
```

### New Exports in v0.4.0

The following are new and can be imported:

```typescript
// Query Optimization (Phase 4)
import { QueryOptimizer } from '@nebula-db/core';

// Worker Pool (Phase 4)
import { AdaptiveWorkerPool, createWorkerPool } from '@nebula-db/core';

// Performance Profiler (Phase 4)
import { PerformanceProfiler, getProfiler } from '@nebula-db/core';

// Sync Plugin (Phase 1)
import { SyncPlugin, SyncOptions } from '@nebula-db/core';

// Encryption (Phase 2)
import { EncryptionAdapter, EncryptionOptions } from '@nebula-db/core';

// Deno KV Adapter (Phase 3)
import { DenoKVAdapter } from '@nebula-db/core';

// Cloudflare D1 Adapter (Phase 3)
import { CloudflareD1Adapter } from '@nebula-db/core';
```

---

## Feature Migration Examples

### Example 1: Add Sync to Existing App

**Before (v0.3.0):**
```typescript
const db = createDb({ adapter: new MemoryAdapter() });
const users = db.collection('users');

// Insert data
await users.insert({ id: '1', name: 'Alice' });
```

**After (v0.4.0) - Same code, optionally add sync:**
```typescript
import { SyncPlugin } from '@nebula-db/core';

const db = createDb({ adapter: new MemoryAdapter() });
const users = db.collection('users');

// Old code still works
await users.insert({ id: '1', name: 'Alice' });

// NEW: Optional sync capabilities
const sync = new SyncPlugin({
  serverUrl: 'https://sync-server.example.com',
  conflictResolution: 'last-write-wins'
});
db.use(sync);

// Now sync is enabled
await sync.syncCollection('users');
```

### Example 2: Migrate to Encrypted Storage

**Before (v0.3.0):**
```typescript
const db = createDb({
  adapter: new SQLiteAdapter('data.db')
});
```

**After (v0.4.0) - With encryption:**
```typescript
import { EncryptionAdapter } from '@nebula-db/core';

const db = createDb({
  adapter: new EncryptionAdapter({
    baseAdapter: new SQLiteAdapter('data.db'),
    encryptionKey: process.env.DB_ENCRYPTION_KEY,
    algorithm: 'aes-256-gcm'
  })
});

// All existing queries work transparently
const users = await db.collection('users').find({});
// Data is automatically encrypted/decrypted
```

### Example 3: Optimize Slow Queries

**Identify slow queries (new in v0.4.0):**
```typescript
import { QueryOptimizer } from '@nebula-db/core';

const optimizer = new QueryOptimizer();

// Analyze your problematic query
const slowQuery = { email: 'user@example.com', country: 'USA' };
const plan = optimizer.analyzeQuery(
  slowQuery,
  collection.getIndexes(),
  collection.size()
);

console.log(optimizer.formatPlan(plan));

// If it shows a full scan:
if (plan.fullScan) {
  console.log('⚠️  Consider adding an index:');
  console.log(slowQuery);
  // Then add index
  collection.createIndex({
    name: 'email_country_idx',
    fields: ['email', 'country'],
    type: 'compound'
  });
}
```

### Example 4: Parallelize Batch Operations

**Before (v0.3.0) - Sequential:**
```typescript
const results = [];
for (const item of items) {
  const processed = await processItem(item);
  results.push(processed);
}
```

**After (v0.4.0) - Parallel:**
```typescript
import { createWorkerPool } from '@nebula-db/core';

const pool = createWorkerPool(8); // 8 workers

const results = await pool.processBatch(
  items,
  async (item) => await processItem(item)
);

// Much faster on multi-core systems!
```

### Example 5: Profile Performance

**New in v0.4.0:**
```typescript
import { getProfiler } from '@nebula-db/core';

const profiler = getProfiler();

// Measure operations
await profiler.measureAsync('bulk-import', async () => {
  return await collection.insertBatch(data);
});

// Generate report
const report = profiler.generateReport();
console.log(profiler.formatReport(report));

// Output shows:
// - Operation timing
// - Memory usage
// - Success rates
// - Slowest operations
```

---

## Environment-Specific Migrations

### Node.js Application

```typescript
// v0.4.0 adds Worker Thread support (auto-detected)
import { createWorkerPool } from '@nebula-db/core';

// Automatically uses Node.js Worker Threads
const pool = createWorkerPool();

// Scales with CPU cores automatically
const stats = pool.getStats();
console.log(`Using ${stats.poolSize} workers`);
```

### Browser Application

```typescript
// v0.4.0 adds Web Worker support (auto-detected)
import { createWorkerPool } from '@nebula-db/core';

// Automatically uses Web Workers
const pool = createWorkerPool(4);

// Safely process data in background threads
const results = await pool.processBatch(
  largeDataset,
  processor
);
```

### Deno Application

**New in v0.4.0:**
```typescript
import { createDb, DenoKVAdapter } from '@nebula-db/core';

const db = createDb({
  adapter: new DenoKVAdapter() // Uses Deno's native KV
});

// All NebulaDB features work in Deno
const users = db.collection('users');
await users.insert({ id: '1', name: 'Alice' });
```

### Cloudflare Workers

**New in v0.4.0:**
```typescript
import { createDb, CloudflareD1Adapter } from '@nebula-db/core';

export default {
  async fetch(request, env) {
    const db = createDb({
      adapter: new CloudflareD1Adapter(env.DB) // Cloudflare D1
    });

    const users = db.collection('users');
    return new Response(JSON.stringify(await users.find({})));
  }
};
```

---

## Testing Compatibility

### Vitest Tests - No Changes Needed

```typescript
// Your v0.3.0 tests still work
import { createDb, MemoryAdapter } from '@nebula-db/core';
import { describe, it, expect } from 'vitest';

describe('Users', () => {
  it('inserts and finds users', async () => {
    const db = createDb({ adapter: new MemoryAdapter() });
    const users = db.collection('users');
    
    await users.insert({ id: '1', name: 'Alice' });
    const result = await users.find({ name: 'Alice' });
    
    expect(result).toHaveLength(1);
  });
});
```

### Adding New Tests for v0.4.0 Features

```typescript
// Test sync capabilities (new)
it('syncs data across instances', async () => {
  const db1 = createDb({ adapter: new MemoryAdapter() });
  const db2 = createDb({ adapter: new MemoryAdapter() });
  
  const sync1 = new SyncPlugin({ conflictResolution: 'last-write-wins' });
  const sync2 = new SyncPlugin({ conflictResolution: 'last-write-wins' });
  
  db1.use(sync1);
  db2.use(sync2);
  
  // Test sync behavior
  await db1.collection('users').insert({ id: '1', name: 'Alice' });
  await sync1.syncCollection('users');
  
  const docs = await db2.collection('users').find({});
  expect(docs).toHaveLength(1);
});

// Test encryption (new)
it('encrypts and decrypts data', async () => {
  const db = createDb({
    adapter: new EncryptionAdapter({
      baseAdapter: new MemoryAdapter(),
      encryptionKey: 'test-key',
      algorithm: 'aes-256-gcm'
    })
  });
  
  const users = db.collection('users');
  await users.insert({ id: '1', name: 'Alice', ssn: '123-45-6789' });
  
  const result = await users.find({ id: '1' });
  expect(result[0].ssn).toBe('123-45-6789'); // Transparent decryption
});

// Test performance (new)
it('optimizes query execution', async () => {
  const db = createDb({ adapter: new MemoryAdapter() });
  const users = db.collection('users', {
    indexes: [
      { name: 'email_idx', fields: ['email'], type: 'unique' }
    ]
  });
  
  const optimizer = new QueryOptimizer();
  const plan = optimizer.analyzeQuery(
    { email: 'user@example.com' },
    users.getIndexes(),
    1000
  );
  
  expect(plan.fullScan).toBe(false);
  expect(plan.selectedIndexes).toHaveLength(1);
});
```

---

## Troubleshooting Migration

### Issue: Old adapters not working

**Solution:** Check if your custom adapter needs updating for TypeScript strict mode:

```typescript
// v0.3.0 style (may need updating)
export class CustomAdapter implements Adapter {
  async load(key) { /* ... */ }
  async save(key, data) { /* ... */ }
}

// v0.4.0 style (recommended)
export class CustomAdapter implements Adapter {
  async load(key: string): Promise<unknown> { /* ... */ }
  async save(key: string, data: unknown): Promise<void> { /* ... */ }
}
```

### Issue: Sync not connecting

**Solution:** Verify server configuration:

```typescript
const sync = new SyncPlugin({
  serverUrl: 'https://your-server.com', // ✅ Must be HTTPS
  reconnectInterval: 5000,               // Retry every 5s
  maxRetries: 3,
  conflictResolution: 'last-write-wins'
});
```

### Issue: Encryption key errors

**Solution:** Ensure key is properly formatted:

```typescript
// ❌ Wrong: plain text string
const db = createDb({
  adapter: new EncryptionAdapter({
    baseAdapter: new SQLiteAdapter('data.db'),
    encryptionKey: 'mypassword' // ❌ Weak
  })
});

// ✅ Right: strong key from environment
const db = createDb({
  adapter: new EncryptionAdapter({
    baseAdapter: new SQLiteAdapter('data.db'),
    encryptionKey: process.env.DB_ENCRYPTION_KEY // ✅ 32+ bytes
  })
});
```

### Issue: Performance profiler overhead

**Solution:** Disable in production if needed:

```typescript
const profiler = getProfiler();

if (process.env.NODE_ENV === 'production') {
  profiler.setEnabled(false); // Zero overhead
}
```

---

## Performance Expectations

### Backward Compatibility

- Core operations: **0% performance change**
- Index operations: **up to 2x faster** (improved index selection)
- Batch operations: **4-8x faster** with worker pool
- Query analysis: <1ms per query (optimizer caching)

### New Overhead

- Sync plugin: 1-2ms per sync cycle
- Encryption: 2-5ms per operation (varies by data size)
- Profiler: <1% overhead (can be disabled)

---

## Recommended Upgrade Steps

### For Small Projects

1. Update package: `npm install @nebula-db/core@0.4.0`
2. Run tests: `npm test`
3. (Optional) Enable new features as needed

### For Production Applications

1. Test upgrade in staging environment
2. Run full test suite with existing data
3. Enable sync with test server first
4. Gradually roll out encryption (new collections first)
5. Monitor performance with profiler
6. Deploy to production

### For Large Monorepos

1. Update in one service first (least critical)
2. Test integration thoroughly
3. Monitor metrics
4. Gradually roll out to other services
5. Use feature flags for new capabilities

---

## What to Read Next

- [Performance Guide](./PERFORMANCE.md) - Query optimization, worker pools, profiling
- [Sync & Replication Guide](./SYNC_REPLICATION.md) - Conflict resolution, P2P sync
- [Encryption Guide](./ENCRYPTION.md) - AES-256-GCM, field encryption, key management
- [Adapter Documentation](./ADAPTER_REGISTRY.md) - New adapters, custom adapters
- [Phase 4 Quick Start](./PHASE4_QUICK_START.md) - Quick reference for performance tools

---

## Version Support

- **v0.4.0**: Current (January 2026)
- **v0.3.x**: Security/bug fixes only
- **v0.2.x**: End of support

---

## Questions?

- Check [GitHub Issues](https://github.com/Nom-nom-hub/NebulaDB/issues)
- Read [API Documentation](./API.md)
- See [Examples](../examples/)

---

## Migration Verification Checklist

- [ ] Updated to v0.4.0
- [ ] Existing tests pass
- [ ] Database creates and queries work
- [ ] Indexes function correctly
- [ ] Adapters load properly
- [ ] Plugin system works (if used)
- [ ] (Optional) Sync configured and tested
- [ ] (Optional) Encryption configured
- [ ] (Optional) Performance profiler integrated
- [ ] Ready for production

**Status**: ✅ Migration guide complete - your app is ready for v0.4.0!
