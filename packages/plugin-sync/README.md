# NebulaDB Sync Plugin

A synchronization plugin for NebulaDB that enables real-time data synchronization between clients and servers.

## Features

- Real-time synchronization using WebSockets
- Offline support with automatic sync when reconnected
- Conflict resolution strategies
- Selective collection synchronization
- Authentication support
- Customizable sync intervals
- Event-based architecture
- Memory-efficient storage

## Installation

```bash
npm install @nebula/plugin-sync
```

## Client Usage

```typescript
import { createDb, MemoryAdapter } from '@nebula/core';
import { createSyncPlugin } from '@nebula/plugin-sync';

// Create sync plugin
const syncPlugin = createSyncPlugin({
  serverUrl: 'https://your-sync-server.com',
  authToken: 'your-auth-token',
  collections: ['users', 'posts', 'comments'],
  autoSync: true,
  useWebSockets: true,
  conflictResolution: 'last-write-wins'
});

// Create database with sync plugin
const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [syncPlugin]
});

// Use the database as usual
const users = db.collection('users');
await users.insert({ name: 'Alice', email: 'alice@example.com' });

// Access sync API
const syncApi = db.plugin('sync');

// Check sync status
const status = syncApi.getStatus();
console.log('Sync status:', status);

// Manually trigger sync
await syncApi.syncNow();

// Disable sync
syncApi.disable();

// Enable sync
syncApi.enable();
```

## Server Usage

```typescript
import { createServer } from 'http';
import { createSyncServer } from '@nebula/plugin-sync/server';

// Create HTTP server
const httpServer = createServer();

// Create sync server
const syncServer = createSyncServer({
  httpServer,
  authenticate: async (socket, token) => {
    // Validate token
    return token === 'valid-token';
  },
  logging: {
    enabled: true,
    level: 'info'
  }
});

// Start sync server
syncServer.start();

// Start HTTP server
httpServer.listen(3000, () => {
  console.log('Sync server listening on port 3000');
});
```

## Options

### Client Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `serverUrl` | `string` | - | Sync server URL |
| `authToken` | `string` | `undefined` | Authentication token |
| `collections` | `string[]` | `[]` | Collections to sync |
| `syncInterval` | `number` | `30000` | Sync interval in milliseconds |
| `autoSync` | `boolean` | `true` | Whether to sync automatically |
| `useWebSockets` | `boolean` | `true` | Whether to use WebSockets for real-time sync |
| `conflictResolution` | `string` | `'last-write-wins'` | Conflict resolution strategy |
| `retry.maxRetries` | `number` | `5` | Maximum number of retries |
| `retry.retryDelay` | `number` | `1000` | Retry delay in milliseconds |
| `retry.useExponentialBackoff` | `boolean` | `true` | Whether to use exponential backoff |
| `logging.enabled` | `boolean` | `true` | Whether to enable logging |
| `logging.level` | `string` | `'info'` | Log level |

### Server Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `httpServer` | `HttpServer` | `undefined` | HTTP server |
| `socketOptions` | `object` | `{}` | Socket.io server options |
| `authenticate` | `function` | `undefined` | Authentication function |
| `storage` | `SyncStorage` | `MemorySyncStorage` | Event storage |
| `logging.enabled` | `boolean` | `true` | Whether to enable logging |
| `logging.level` | `string` | `'info'` | Log level |

## API

### Client API

#### `getStatus()`

Get the current sync status.

```typescript
const status = syncApi.getStatus();
// {
//   enabled: true,
//   connected: true,
//   lastSyncTime: 1625097600000,
//   pendingEvents: 0,
//   error: null
// }
```

#### `enable()`

Enable synchronization.

```typescript
syncApi.enable();
```

#### `disable()`

Disable synchronization.

```typescript
syncApi.disable();
```

#### `syncNow()`

Manually trigger synchronization.

```typescript
const result = await syncApi.syncNow();
// {
//   success: true,
//   error: null,
//   syncedEvents: 5
// }
```

#### `clearPendingEvents()`

Clear pending events.

```typescript
const count = syncApi.clearPendingEvents();
// 5
```

#### `addCollection(collectionName)`

Add a collection to sync.

```typescript
const added = syncApi.addCollection('products');
// true
```

#### `removeCollection(collectionName)`

Remove a collection from sync.

```typescript
const removed = syncApi.removeCollection('products');
// true
```

#### `getCollections()`

Get synced collections.

```typescript
const collections = syncApi.getCollections();
// ['users', 'posts', 'comments']
```

### Server API

#### `start()`

Start the sync server.

```typescript
syncServer.start();
```

#### `stop()`

Stop the sync server.

```typescript
syncServer.stop();
```

#### `getClientsCount()`

Get the number of connected clients.

```typescript
const count = syncServer.getClientsCount();
// 5
```

#### `getStorage()`

Get the storage instance.

```typescript
const storage = syncServer.getStorage();
```

#### `getIo()`

Get the Socket.io server instance.

```typescript
const io = syncServer.getIo();
```

## Custom Storage

You can implement a custom storage for the sync server:

```typescript
import { SyncStorage, SyncEvent } from '@nebula/plugin-sync/server';

class CustomStorage implements SyncStorage {
  async saveEvents(events: SyncEvent[]): Promise<void> {
    // Save events to database
  }
  
  async getEventsAfter(timestamp: number): Promise<SyncEvent[]> {
    // Get events after timestamp
  }
  
  async getEventsForClient(clientId: string, collections: string[]): Promise<SyncEvent[]> {
    // Get events for client
  }
  
  async clearEventsBefore(timestamp: number): Promise<number> {
    // Clear events before timestamp
  }
}

// Use custom storage
const syncServer = createSyncServer({
  storage: new CustomStorage()
});
```

## License

MIT
