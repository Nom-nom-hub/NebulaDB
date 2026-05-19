# @nebula-db/plugin-backup

Backup and restore plugin for NebulaDB. Export your entire database to JSON and restore it on any adapter.

Part of the [NebulaDB](https://github.com/Nom-nom-hub/NebulaDB) project.

## Features

- 💾 **Full Database Backup** — Snapshot all collections and documents in one call
- ♻️ **Restore** — Restore a backup to any compatible adapter
- 📄 **JSON Export / Import** — Serialize and deserialize backups as JSON strings
- 🏷️ **Backup Metadata** — Includes version, timestamp, collection names, and document count
- 📁 **Timestamped Filenames** — Generate unique backup filenames automatically
- 🔌 **Adapter-Agnostic** — Works with any NebulaDB adapter

## Installation

```bash
npm install @nebula-db/plugin-backup
```

## Quick Start

```typescript
import { createDb } from '@nebula-db/core';
import { MemoryAdapter } from '@nebula-db/adapter-memory';
import { backupDatabase, restoreDatabase } from '@nebula-db/plugin-backup';

const adapter = new MemoryAdapter();
const db = createDb({ adapter });

const users = db.collection('users');
await users.insert({ id: '1', name: 'Alice' });
await users.insert({ id: '2', name: 'Bob' });

// Create a backup
const backup = await backupDatabase(db);
console.log(backup.metadata);
// { version: '0.6.0', timestamp: ..., collections: ['users'], documentCount: 2 }

// Export to JSON string (e.g. write to file)
const json = JSON.stringify(backup, null, 2);

// Restore from backup
const freshAdapter = new MemoryAdapter();
const freshDb = createDb({ adapter: freshAdapter });
await restoreDatabase(freshDb, backup);
```

## Using BackupManager Directly

```typescript
import { BackupManager } from '@nebula-db/plugin-backup';

const manager = new BackupManager(adapter);

// Backup with metadata
const backup = await manager.backup({ includeMetadata: true });

// Export to JSON
const json = await manager.exportToJson();

// Import from JSON
await manager.importFromJson(json);

// Generate a timestamped filename
const filename = BackupManager.createBackupFilename('my-app');
// e.g. 'my-app-2024-01-15T10-30-00-000Z.json'
```

## API Reference

### Convenience Functions

| Function                                | Description                                         |
| --------------------------------------- | --------------------------------------------------- |
| `backupDatabase(db, options?)`          | Create a full backup of the database                |
| `restoreDatabase(db, backup)`           | Restore a database from a backup object             |
| `exportBackup(db, filename?, options?)` | Export backup as JSON; returns `{ filename, data }` |
| `importBackup(db, json)`                | Import a database from a JSON string                |

### BackupManager Class

| Method                                        | Description                                     |
| --------------------------------------------- | ----------------------------------------------- |
| `backup(options?)`                            | Create a `BackupData` snapshot                  |
| `restore(backup)`                             | Restore data from a `BackupData` object         |
| `exportToJson(options?)`                      | Serialize backup to a formatted JSON string     |
| `importFromJson(json)`                        | Parse a JSON string and restore                 |
| `getBackupInfo(backup)`                       | Return backup metadata without loading all data |
| `BackupManager.createBackupFilename(prefix?)` | Generate a timestamped filename string          |

## BackupOptions

| Option            | Type      | Default | Description                                    |
| ----------------- | --------- | ------- | ---------------------------------------------- |
| `includeMetadata` | `boolean` | `true`  | Include version, timestamp, and count metadata |

## Example: File-Based Backup (Node.js)

```typescript
import fs from 'fs/promises';
import { exportBackup, importBackup } from '@nebula-db/plugin-backup';

// Save backup to disk
const { filename, data } = await exportBackup(db, 'my-app-backup');
await fs.writeFile(filename, data, 'utf-8');
console.log(`Backup saved to ${filename}`);

// Restore from disk
const json = await fs.readFile(filename, 'utf-8');
await importBackup(freshDb, json);
console.log('Database restored');
```

## Documentation

For full documentation, visit the [NebulaDB GitHub repository](https://github.com/Nom-nom-hub/NebulaDB).

## License

Apache-2.0
