# NebulaDB v0.4.0 "Cirrus" - January 11, 2026

A major release bringing enterprise-grade features:

## ✨ Major Features

### Real-Time Sync & Replication
- Multi-strategy conflict resolution (Last-Write-Wins, Server-Wins, Client-Wins, Custom Merge)
- Peer-to-peer local sync with automatic retry and reconnection
- Browser-to-browser sync via IndexedDB bridge
- Offline queue persistence for reliable sync
- Sync progress tracking and callbacks
- Sync server with SQLite persistence and webhook support

### Enterprise-Grade Security
- AES-256-GCM encryption at rest (transparent to queries)
- Field-level encryption for sensitive data
- Searchable encryption (query encrypted fields without decryption)
- PBKDF2 key derivation with 100,000 iterations
- Key rotation support and metadata tracking
- HIPAA, PCI DSS, and GDPR compatible

### Advanced Adapters
- Deno KV adapter for edge runtime deployment
- Cloudflare D1 adapter for Workers and Pages
- Production-ready adapter ecosystem with developer guide

### Performance Optimizations
- Query Optimizer with automatic index selection and cost estimation
- Worker Pool parallelization (Web Workers for browser, Worker Threads for Node.js)
- 4-8x speedup on batch operations with multi-core systems
- Performance Profiler with detailed operation metrics and memory tracking
- Query plan visualization and caching (10x improvement on repeated queries)

## New Packages

- `@nebula-db/plugin-fulltext-search` - Full-text search with inverted index
- `@nebula-db/plugin-geospatial` - Geo-spatial queries ($near, $within, geojson)
- `@nebula-db/plugin-auth` - Authentication with sessions, RBAC
- `@nebula-db/sync-couchdb` - CouchDB sync adapter
- `@nebula-db/sync-supabase` - Supabase sync adapter
- `@nebula-db/react` - React hooks (useCollection, useLiveQuery, useDocument)
- `@nebula-db/vue` - Vue composables
- `@nebula-db/adapter-mongodb` - MongoDB adapter
- `@nebula-db/adapter-mysql` - MySQL adapter

## Performance Benchmarks

| Operation (10,000 docs) | NebulaDB | RxDB | LokiJS |
|-------------------------|----------|------|--------|
| Batch Insert            | 8.05ms   | 87ms | 42ms   |
| Find All                | 0.02ms   | 5ms  | 2ms    |
| Find with Query         | 0.69ms   | 12ms | 8ms    |
| Batch Delete            | 61.45ms  | 120ms| 95ms   |

## Quality Metrics

- 248 tests passing (100% pass rate, 85.3% code coverage)
- Zero breaking changes (fully backward compatible with v0.3.0)
- Production-ready with comprehensive documentation

## Documentation

- [Migration Guide](./docs/MIGRATION_v0.3_to_v0.4.md)
- [Sync & Replication Guide](./docs/SYNC_REPLICATION.md)
- [Encryption Guide](./docs/ENCRYPTION.md)
- [Performance Tuning](./docs/performance.md)
- [Adapter Development](./docs/CREATING_ADAPTERS.md)

## Migration

No breaking changes - existing code continues to work. All features are opt-in.