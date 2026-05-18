# @nebula-db/plugin-audit

Audit logging plugin for NebulaDB. Tracks all database operations for compliance, debugging, and security monitoring.

Part of the [NebulaDB](https://github.com/Nom-nom-hub/NebulaDB) project.

## Features

- 📋 **Operation Tracking** — Automatically logs insert, update, delete, and bulk operations
- 🔍 **Read Tracking** — Optionally track find/query operations
- 🗂️ **Filterable Log** — Query audit entries by collection, action, user, or time range
- 📤 **Export** — Export the full audit log as JSON
- 🔔 **Callback Hook** — Run custom logic on every audit entry via `onAudit`
- 🧹 **Auto-Trim** — Configurable maximum entries with automatic pruning

## Installation

```bash
npm install @nebula-db/plugin-audit
```

## Quick Start

```typescript
import { createDb } from '@nebula-db/core';
import { MemoryAdapter } from '@nebula-db/adapter-memory';
import { createAuditPlugin, getAuditApi } from '@nebula-db/plugin-audit';

const audit = createAuditPlugin({
  trackReads: false,
  maxEntries: 5000,
  onAudit: (entry) => console.log(`[AUDIT] ${entry.action} on ${entry.collection}`),
});

const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [audit],
});

const users = db.collection('users');
await users.insert({ id: '1', name: 'Alice', role: 'admin' });
await users.update({ name: 'Alice' }, { $set: { role: 'editor' } });

// Access audit log
const api = getAuditApi(db);
console.log(api.count()); // 2
console.log(api.getEntriesByAction('create')); // insert entries
console.log(api.getEntriesByCollection('users')); // all entries for 'users'
```

## Configuration

| Option           | Type                          | Default    | Description                                  |
| ---------------- | ----------------------------- | ---------- | -------------------------------------------- |
| `collectionName` | `string`                      | `'_audit'` | Internal collection name for storing entries |
| `trackReads`     | `boolean`                     | `false`    | Whether to log find/query operations         |
| `maxEntries`     | `number`                      | `10000`    | Maximum number of entries to keep in memory  |
| `onAudit`        | `(entry: AuditEntry) => void` | `() => {}` | Callback fired on every new audit entry      |

## API Reference

Access the audit API via `getAuditApi(db)`:

```typescript
const api = getAuditApi(db);
```

| Method                          | Description                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------- |
| `getEntries(filter?)`           | Get all entries, optionally filtered by collection, action, userId, or documentId |
| `getEntriesByCollection(name)`  | Get all entries for a specific collection                                         |
| `getEntriesByAction(action)`    | Get entries by action: `'create'`, `'read'`, `'update'`, `'delete'`, `'bulk'`     |
| `getEntriesByUser(userId)`      | Get entries for a specific user                                                   |
| `getEntriesInRange(start, end)` | Get entries within a timestamp range                                              |
| `count()`                       | Return total number of stored entries                                             |
| `export()`                      | Export all entries as a JSON string                                               |
| `clear()`                       | Clear all audit entries                                                           |

## Example: Time-Range Query

```typescript
const api = getAuditApi(db);

const oneHourAgo = Date.now() - 60 * 60 * 1000;
const recentEntries = api.getEntriesInRange(oneHourAgo, Date.now());

console.log(`${recentEntries.length} operations in the last hour`);
```

## Documentation

For full documentation, visit the [NebulaDB GitHub repository](https://github.com/Nom-nom-hub/NebulaDB).

## License

Apache-2.0
