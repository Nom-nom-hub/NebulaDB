# NebulaDB Plugin & Adapter Marketplace

Discover and install plugins, adapters, and tools for NebulaDB.

## 🚀 Official Packages

### Core
| Package | Version | Description |
|---------|---------|-------------|
| `@nebula-db/core` | [npm](https://www.npmjs.com/package/@nebula-db/core) | Core database engine |
| `@nebula-db/nebula-db` | [npm](https://www.npmjs.com/package/@nebula-db/nebula-db) | All-in-one package |

### Storage Adapters
| Package | Version | Description |
|---------|---------|-------------|
| `@nebula-db/adapter-memory` | [npm](https://www.npmjs.com/package/@nebula-db/adapter-memory) | In-memory storage |
| `@nebula-db/adapter-filesystem` | [npm](https://www.npmjs.com/package/@nebula-db/adapter-filesystem) | File-based persistence |
| `@nebula-db/adapter-localstorage` | [npm](https://www.npmjs.com/package/@nebula-db/adapter-localstorage) | Browser localStorage |
| `@nebula-db/adapter-indexeddb` | [npm](https://www.npmjs.com/package/@nebula-db/adapter-indexeddb) | Browser IndexedDB |
| `@nebula-db/adapter-sqlite` | [npm](https://www.npmjs.com/package/@nebula-db/adapter-sqlite) | SQLite database |
| `@nebula-db/adapter-deno-kv` | [npm](https://www.npmjs.com/package/@nebula-db/adapter-deno-kv) | Deno KV |
| `@nebula-db/adapter-cloudflare-d1` | [npm](https://www.npmjs.com/package/@nebula-db/adapter-cloudflare-d1) | Cloudflare D1 |
| `@nebula-db/adapter-mongodb` | [npm](https://www.npmjs.com/package/@nebula-db/adapter-mongodb) | MongoDB |
| `@nebula-db/adapter-postgresql` | [npm](https://www.npmjs.com/package/@nebula-db/adapter-postgresql) | PostgreSQL |
| `@nebula-db/adapter-mysql` | [npm](https://www.npmjs.com/package/@nebula-db/adapter-mysql) | MySQL |
| `@nebula-db/adapter-redis` | [npm](https://www.npmjs.com/package/@nebula-db/adapter-redis) | Redis |

### Official Plugins
| Package | Version | Description |
|---------|---------|-------------|
| `@nebula-db/plugin-validation` | [npm](https://www.npmjs.com/package/@nebula-db/plugin-validation) | Schema validation with Zod |
| `@nebula-db/plugin-encryption` | [npm](https://www.npmjs.com/package/@nebula-db/plugin-encryption) | Document encryption |
| `@nebula-db/plugin-versioning` | [npm](https://www.npmjs.com/package/@nebula-db/plugin-versioning) | Document history |
| `@nebula-db/plugin-fulltext-search` | [npm](https://www.npmjs.com/package/@nebula-db/plugin-fulltext-search) | Full-text search |
| `@nebula-db/plugin-geospatial` | [npm](https://www.npmjs.com/package/@nebula-db/plugin-geospatial) | Geo queries |
| `@nebula-db/plugin-auth` | [npm](https://www.npmjs.com/package/@nebula-db/plugin-auth) | Authentication & RBAC |

### Sync Adapters
| Package | Version | Description |
|---------|---------|-------------|
| `@nebula-db/sync-couchdb` | [npm](https://www.npmjs.com/package/@nebula-db/sync-couchdb) | CouchDB sync |
| `@nebula-db/sync-supabase` | [npm](https://www.npmjs.com/package/@nebula-db/sync-supabase) | Supabase sync |

### Framework Integrations
| Package | Version | Description |
|---------|---------|-------------|
| `@nebula-db/react` | [npm](https://www.npmjs.com/package/@nebula-db/react) | React hooks |
| `@nebula-db/vue` | [npm](https://www.npmjs.com/package/@nebula-db/vue) | Vue composables |

## 📦 Publishing Your Plugin

1. Name your package with `@nebula-db/plugin-` or `@nebula-db/adapter-` prefix
2. Add `nebula-db` and `plugin`/`adapter` keywords
3. Publish to npm: `npm publish`

```json
{
  "name": "@nebula-db/plugin-my-feature",
  "keywords": ["nebula-db", "plugin", "my-feature"],
  "peerDependencies": {
    "@nebula-db/core": "^0.4.0"
  }
}
```

## 🔍 Browse All Packages

```bash
npm search @nebula-db --json
```

Or visit: https://www.npmjs.com/search?q=%40nebula-db