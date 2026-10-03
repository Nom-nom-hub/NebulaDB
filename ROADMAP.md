# NebulaDB Roadmap

## Cloud-Themed Releases
Starting with v0.2.2, all NebulaDB releases are named after types of clouds, reflecting our commitment to building a database that's as flexible and powerful as the sky.

---

## Shipped

### v0.6.0 "Cumulus" (May 2026) — Cloud & Edge Integration
- 6 new adapters: Cloudflare D1, Deno KV, Vercel KV, AWS Lambda, Hybrid (local/cloud fallback), Filesystem
- Full browser compatibility (Web Crypto polyfills, no Node.js-only exports)
- CI/build fixes across all 40+ packages
- New examples and contributor recognition

### v0.4.0 "Cirrus" — Sync, Replication & Security
- Local-to-local and local-to-remote sync with conflict resolution
- Transparent encryption at rest, field-level encryption
- Smarter query optimizer, bulk operations

### v0.3.0 "Billow" — Developer Experience & Core Stability
- Polished API & TypeScript types
- Full-text search, geo-indexes, compound indexes
- Schema versioning and migrations
- Devtools (browser/CLI)

### v0.2.2 "Altocumulus" — Foundation
- Enhanced error handling and recovery
- Performance boost (query execution, indexing)
- Improved reactivity (change detection, subscriptions)

---

## In Progress

### Plugin Hardening
Several plugins are implemented but lack test coverage:
- [ ] `plugin-audit` — implemented, needs tests
- [ ] `plugin-backup` — implemented, needs tests
- [ ] `plugin-streaming` — implemented, needs tests
- [ ] `plugin-auth` — implemented, needs tests
- [ ] `plugin-geospatial` — implemented, has 1 test, needs more
- [x] `plugin-encryption` — implemented, tested
- [x] `plugin-sync` — implemented, tested
- [x] `adapter-hybrid` — implemented, tested

### Open Feature Issues
- [ ] #16 AI-assisted query optimization
- [ ] #18 Time-series data optimizations
- [ ] #10 Backup and restore utilities (plugin exists, needs hardening)
- [ ] #8 Audit logging system (plugin exists, needs hardening)
- [ ] #12 Streaming analytics (plugin exists, needs hardening)
- [ ] #28 Hybrid mode (adapter exists, needs hardening)

---

## Future: v1.0.0

### Stability & Production Readiness
- [ ] 100% test coverage on all plugins and adapters
- [ ] Comprehensive documentation for every package
- [ ] Performance benchmarks published
- [ ] Security audit

### Ecosystem
- [ ] Plugin marketplace
- [ ] Official plugin templates
- [ ] Community governance (#22)
- [ ] Enterprise support offerings (#24)

---

*Have feedback or want to contribute? Join the discussion on GitHub!*
