# @nebula-db/plugin-sync

Real-time synchronization plugin for NebulaDB. Keep multiple clients in sync via WebSockets with configurable conflict resolution and automatic retry.

Part of the [NebulaDB](https://github.com/Nom-nom-hub/NebulaDB) project.

## Features

- 🔄 **Real-Time Sync** — Propagate insert, update, and delete operations across clients via Socket.io
- ⚔️ **Conflict Resolution** — Built-in strategies: `server-wins`, `client-wins`, `last-write-wins`, or `custom`
- 🕐 **Auto-Sync Interval** — Periodic sync of pending events when WebSocket is unavailable
- 📦 **Pending Event Queue** — Operations are queued locally and flushed when the connection resumes
- 🔁 **Retry with Backoff** — Configurable retries with optional exponential backoff
- 📡 **Collection Filtering** — Sync only the collections you choose
- 📝 **Structured Logging** — Configurable log levels (`debug`, `info`, `warn`, `error`)

## Installation

```bash
npm install @nebula-db/plugin-sync
```

## Quick Start

```typescript
import { createDb } from '@nebula-db/core';
import { MemoryAdapter } from '@nebula-db/adapter-memory';
import { createSyncPlugin } from '@nebula-db/plugin-sync';

const syncPlugin = createSyncPlugin({
  serverUrl: 'https://your-sync-server.example.com',
  authToken: process.env.SYNC_AUTH_TOKEN,
  collections: ['tasks', 'comments'],
  conflictResolution: 'last-write-wins',
  autoSync: true,
});

const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [syncPlugin],
});

const tasks = db.collection('tasks');

// Operations are automatically synced to other connected clients
await tasks.insert({ id: '1', title: 'Ship it', done: false });
await tasks.update({ id: '1' }, { $set: { done: true } });
```

## Configuration

| Option                        | Type       | Default             | Description                                                                          |
| ----------------------------- | ---------- | ------------------- | ------------------------------------------------------------------------------------ |
| `serverUrl`                   | `string`   | —                   | **Required.** Socket.io sync server URL                                              |
| `authToken`                   | `string`   | —                   | Bearer token sent in the Socket.io `auth` handshake                                  |
| `collections`                 | `string[]` | `[]`                | Collections to sync; empty array syncs nothing                                       |
| `syncInterval`                | `number`   | `30000`             | Milliseconds between periodic sync flushes                                           |
| `autoSync`                    | `boolean`  | `true`              | Start syncing automatically on init                                                  |
| `useWebSockets`               | `boolean`  | `true`              | Use Socket.io for real-time sync                                                     |
| `conflictResolution`          | `string`   | `'last-write-wins'` | Conflict strategy: `'server-wins'`, `'client-wins'`, `'last-write-wins'`, `'custom'` |
| `customMergeFn`               | `function` | —                   | Custom merge function when `conflictResolution` is `'custom'`                        |
| `retry.maxRetries`            | `number`   | `5`                 | Maximum reconnection attempts                                                        |
| `retry.retryDelay`            | `number`   | `1000`              | Base retry delay in milliseconds                                                     |
| `retry.useExponentialBackoff` | `boolean`  | `true`              | Multiply delay exponentially on each retry                                           |
| `logging.enabled`             | `boolean`  | `true`              | Enable or disable logging                                                            |
| `logging.level`               | `string`   | `'info'`            | Minimum log level: `'debug'`, `'info'`, `'warn'`, `'error'`                          |

## API Reference

The plugin exposes a public `api` object:

```typescript
const { api } = syncPlugin;
```

| Method                   | Description                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `getStatus()`            | Return current sync status: `enabled`, `connected`, `lastSyncTime`, `pendingEvents`, `error` |
| `enable()`               | Enable syncing and reconnect to the server                                                   |
| `disable()`              | Disable syncing and disconnect from the server                                               |
| `syncNow()`              | Manually trigger an immediate flush of pending events                                        |
| `clearPendingEvents()`   | Discard all queued events; returns the count cleared                                         |
| `addCollection(name)`    | Add a collection to the sync scope at runtime                                                |
| `removeCollection(name)` | Remove a collection from the sync scope at runtime                                           |
| `getCollections()`       | Return the current list of synced collection names                                           |

## Example: Manual Sync Control

```typescript
const { api } = syncPlugin;

// Check sync health
const status = api.getStatus();
console.log('Connected:', status.connected);
console.log('Pending:', status.pendingEvents);

// Trigger a manual flush
const result = await api.syncNow();
console.log('Sync result:', result);

// Pause and resume sync
api.disable();
// ... perform offline operations ...
api.enable();
```

## Example: Custom Conflict Resolution

```typescript
const syncPlugin = createSyncPlugin({
  serverUrl: 'https://your-sync-server.example.com',
  collections: ['documents'],
  conflictResolution: 'custom',
  customMergeFn: (local, remote) => {
    // Always prefer the document with more content
    return local.content?.length >= remote.content?.length ? local : remote;
  },
});
```

## Documentation

For full documentation, visit the [NebulaDB GitHub repository](https://github.com/Nom-nom-hub/NebulaDB).

## License

Apache-2.0
