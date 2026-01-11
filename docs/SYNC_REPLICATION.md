# NebulaDB Sync & Replication Guide

Complete guide to implementing sync and replication in your NebulaDB applications.

---

## Overview

The Sync Plugin enables real-time data synchronization across:
- Multiple browser instances
- Node.js servers
- Local peer-to-peer connections
- Remote sync servers

---

## Quick Start

### Basic Setup with Remote Sync Server

```typescript
import { createDb, SyncPlugin } from '@nebula-db/core';

const db = createDb({ adapter: new SQLiteAdapter('app.db') });

// Enable sync with default settings
const sync = new SyncPlugin({
  serverUrl: 'https://sync.example.com'
});

db.use(sync);

// Start syncing
await sync.start();

// Sync is now active - changes automatically sync to server
const collection = db.collection('users');
await collection.insert({ id: '1', name: 'Alice' });
// Automatically synced!
```

### Peer-to-Peer Sync

```typescript
// Device 1
const db1 = createDb({ adapter: new MemoryAdapter() });
const sync1 = new SyncPlugin({
  type: 'p2p',
  port: 8081
});
db1.use(sync1);
await sync1.start();

// Device 2
const db2 = createDb({ adapter: new MemoryAdapter() });
const sync2 = new SyncPlugin({
  type: 'p2p',
  peers: ['ws://device1:8081']
});
db2.use(sync2);
await sync2.start();

// Changes sync between devices
const users1 = db1.collection('users');
await users1.insert({ id: '1', name: 'Alice' });

// Alice appears on device 2
await new Promise(r => setTimeout(r, 100)); // Wait for sync
const users2 = db2.collection('users');
const alice = await users2.findOne({ id: '1' });
console.log(alice.name); // 'Alice'
```

---

## Conflict Resolution Strategies

### 1. Last-Write-Wins (LWWM)

Timestamp-based resolution - latest write always wins.

**Best for**: Most applications, acceptable when data loss is tolerable

```typescript
const sync = new SyncPlugin({
  conflictResolution: 'last-write-wins',
  timestampField: 'lastModified' // or '__timestamp'
});
```

**How it works**:
1. Conflict detected
2. Compare timestamps
3. Highest timestamp wins
4. Other version discarded

**Example**:
```typescript
// Server: { id: '1', value: 'A', lastModified: 2 }
// Client: { id: '1', value: 'B', lastModified: 3 }
// Result: value = 'B' (client's version)
```

### 2. Server-Wins

Server state always takes precedence.

**Best for**: Authoritative server, client as read-mostly cache

```typescript
const sync = new SyncPlugin({
  conflictResolution: 'server-wins'
});
```

**How it works**:
1. Conflict detected
2. Discard local changes
3. Apply server version
4. Log discarded changes

**Example**:
```typescript
// Server: { id: '1', status: 'approved', by: 'admin' }
// Client: { id: '1', status: 'pending', by: 'user' }
// Result: status = 'approved' (server wins)
```

### 3. Client-Wins

Client changes always take precedence.

**Best for**: Offline-first apps, eventual consistency OK

```typescript
const sync = new SyncPlugin({
  conflictResolution: 'client-wins'
});
```

**How it works**:
1. Conflict detected
2. Keep local changes
3. Overwrite server version
4. Force server sync

**Example**:
```typescript
// Server: { id: '1', edited: false }
// Client: { id: '1', edited: true }
// Result: edited = true (client wins)
```

### 4. Custom Merge Function

User-defined conflict resolution logic.

**Best for**: Complex business logic, conditional resolution

```typescript
const sync = new SyncPlugin({
  conflictResolution: 'custom',
  mergeFunction: (server, client, field) => {
    // Custom logic for each field
    if (field === 'score') {
      // Highest score wins
      return Math.max(server.score, client.score);
    }
    if (field === 'status') {
      // Server status is authoritative
      return server.status;
    }
    // Default: latest
    return client.lastModified > server.lastModified 
      ? client[field] 
      : server[field];
  }
});
```

**Complete Example**:
```typescript
const sync = new SyncPlugin({
  conflictResolution: 'custom',
  mergeFunction: (serverDoc, clientDoc, field) => {
    const rules = {
      // Sum scores
      'score': () => serverDoc.score + clientDoc.score,
      // Keep higher priority
      'priority': () => Math.max(serverDoc.priority, clientDoc.priority),
      // Merge tags
      'tags': () => [...new Set([...serverDoc.tags, ...clientDoc.tags])],
      // Server wins on status
      'status': () => serverDoc.status,
      // Latest on content
      'content': () => serverDoc.lastModified > clientDoc.lastModified
        ? serverDoc.content
        : clientDoc.content
    };
    
    const resolver = rules[field];
    if (resolver) return resolver();
    
    // Default: last-write-wins
    return serverDoc.lastModified > clientDoc.lastModified
      ? serverDoc[field]
      : clientDoc[field];
  }
});
```

---

## Configuration Options

### Server-Based Sync

```typescript
new SyncPlugin({
  // Connection
  serverUrl: 'https://sync.example.com',      // Required
  reconnectInterval: 5000,                     // ms between reconnect attempts
  maxRetries: 3,                               // Max reconnect attempts
  timeout: 30000,                              // Request timeout (ms)
  
  // Conflict Resolution
  conflictResolution: 'last-write-wins',       // Strategy
  trackConflictHistory: true,                  // Store resolved conflicts
  maxConflictHistorySize: 1000,                // Max conflicts to store
  
  // Sync Behavior
  selectiveSync: false,                        // Sync specific collections only
  batchSize: 100,                              // Batch changes together
  syncInterval: 5000,                          // Automatic sync interval (ms)
  offlineQueueLimit: 10000,                    // Max offline changes
  
  // Callbacks
  onConflict: (conflict) => { /* ... */ },     // Conflict detected
  onProgress: (progress) => { /* ... */ },     // Sync progress
  onError: (error) => { /* ... */ }            // Sync error
});
```

### Peer-to-Peer Sync

```typescript
new SyncPlugin({
  type: 'p2p',                                 // P2P mode
  port: 8080,                                  // Listen port
  peers: ['ws://peer1:8080', 'ws://peer2:8080'], // Known peers
  maxConnections: 10,                          // Max peer connections
  autoDiscover: true,                          // Auto-discover peers
  
  // P2P Behavior
  propagationDelay: 100,                       // ms to propagate changes
  replicationFactor: 3,                        // Data copies
  
  // Same conflict resolution & callbacks as server sync
  conflictResolution: 'last-write-wins',
  onConflict: (conflict) => { /* ... */ }
});
```

---

## Sync Events & Callbacks

### Progress Tracking

```typescript
sync.on('progress', (progress) => {
  console.log(`Synced: ${progress.synced}/${progress.total}`);
  console.log(`Collections: ${progress.collections}`);
  console.log(`Duration: ${progress.durationMs}ms`);
});
```

### Conflict Handling

```typescript
sync.on('conflict', (conflict) => {
  console.log(`Conflict in ${conflict.collection}:${conflict.documentId}`);
  console.log(`Server version: ${JSON.stringify(conflict.server)}`);
  console.log(`Client version: ${JSON.stringify(conflict.client)}`);
  console.log(`Resolved to: ${JSON.stringify(conflict.resolved)}`);
});
```

### Error Handling

```typescript
sync.on('error', (error) => {
  console.error(`Sync error: ${error.message}`);
  console.error(`Retrying in ${error.retryAfterMs}ms`);
});

sync.on('connectionLost', () => {
  console.log('Connection lost, queuing changes...');
});

sync.on('connectionRestored', () => {
  console.log('Connection restored, syncing queued changes...');
});
```

---

## Selective Sync

Sync only specific collections to reduce bandwidth.

```typescript
const sync = new SyncPlugin({
  serverUrl: 'https://sync.example.com',
  selectiveSync: true
});

db.use(sync);

// Only sync these collections
await sync.syncCollection('users');
await sync.syncCollection('documents');

// Other collections not synced
const cache = db.collection('cache');
await cache.insert({ key: 'temp', value: 'local only' });
// ^ Not synced to server
```

---

## Offline Support

Automatically queue changes when offline.

```typescript
const sync = new SyncPlugin({
  serverUrl: 'https://sync.example.com',
  offlineQueueLimit: 10000  // Store up to 10K changes
});

db.use(sync);

// Even when offline, changes are queued
navigator.onoffline = () => {
  console.log('Offline mode - changes queued locally');
};

// Make changes offline
const users = db.collection('users');
await users.insert({ id: '100', name: 'Offline User' });

// Later when online - auto sync
navigator.ononline = async () => {
  console.log('Online - syncing queued changes');
  await sync.syncNow(); // Optional: sync immediately
};
```

### Offline Queue Management

```typescript
// Check queue size
const queue = await sync.getOfflineQueue();
console.log(`${queue.length} pending changes`);

// Clear queue if needed
await sync.clearOfflineQueue();

// Sync pending changes
await sync.syncPending();
```

---

## Sync Server Implementation

### Setting Up a Sync Server

```typescript
import { SyncServer } from '@nebula-db/sync-server';
import { SQLiteAdapter } from '@nebula-db/sqlite-adapter';

// Create sync server with SQLite persistence
const server = new SyncServer({
  port: 3000,
  adapter: new SQLiteAdapter('sync-data.db'),
  
  // Conflict resolution
  conflictResolution: 'last-write-wins',
  
  // Security
  requireAuth: true,
  authProvider: async (token) => {
    // Validate JWT or API key
    return await validateToken(token);
  },
  
  // Audit logging
  enableAudit: true,
  auditLogger: (event) => {
    console.log(`[AUDIT] ${event.action} - ${event.collection}`);
  },
  
  // Webhooks
  webhooks: {
    'conflict-resolved': 'https://example.com/webhooks/conflict',
    'sync-complete': 'https://example.com/webhooks/sync-complete'
  }
});

await server.start();
console.log('Sync server running on port 3000');
```

### Webhook Handling

```typescript
// Webhook called when conflict is resolved
app.post('/webhooks/conflict', (req, res) => {
  const { conflict } = req.body;
  
  console.log(`Conflict resolved:`, {
    collection: conflict.collection,
    documentId: conflict.documentId,
    strategy: conflict.strategy,
    resolved: conflict.resolved
  });
  
  res.json({ ok: true });
});
```

---

## Practical Examples

### Example 1: Collaborative Document Editor

```typescript
import { createDb, SyncPlugin } from '@nebula-db/core';

// Setup
const db = createDb({ adapter: new SQLiteAdapter('editor.db') });
const documents = db.collection('documents');

// Enable sync with LWWM for concurrent edits
const sync = new SyncPlugin({
  serverUrl: 'https://docs-sync.example.com',
  conflictResolution: 'last-write-wins',
  timestampField: 'lastModified'
});

db.use(sync);
await sync.start();

// Listen to conflicts
sync.on('conflict', (conflict) => {
  console.log(`Document ${conflict.documentId} has conflicts`);
  // UI can show "document was edited elsewhere"
});

// Track sync progress
sync.on('progress', (progress) => {
  updateUI(`Syncing... ${progress.synced}/${progress.total}`);
});

// Save document
async function saveDocument(id, content) {
  await documents.update(id, {
    content,
    lastModified: new Date().getTime()
  });
  // Automatically synced and conflicts handled
}

// Load document
async function loadDocument(id) {
  return await documents.findOne({ id });
}
```

### Example 2: Offline-First Mobile App

```typescript
const db = createDb({ adapter: new SQLiteAdapter('mobile.db') });
const tasks = db.collection('tasks');

// Offline-first sync
const sync = new SyncPlugin({
  serverUrl: 'https://api.example.com/sync',
  conflictResolution: 'client-wins',  // User's local changes win
  offlineQueueLimit: 5000,
  syncInterval: 30000 // Sync every 30s if online
});

db.use(sync);

// Add task (works offline)
async function addTask(title) {
  await tasks.insert({
    id: generateId(),
    title,
    completed: false,
    created: new Date()
  });
  // Synced when online
}

// Complete task (works offline)
async function completeTask(id) {
  await tasks.update(id, {
    completed: true,
    completedAt: new Date()
  });
  // Synced when online
}

// Check sync status
sync.on('connectionLost', () => {
  showUI('Offline mode - changes saved locally');
});

sync.on('connectionRestored', () => {
  showUI('Online - syncing changes...');
});
```

### Example 3: Multi-User Workspace

```typescript
const db = createDb({ adapter: new SQLiteAdapter('workspace.db') });
const projects = db.collection('projects');

// Custom conflict resolution for teams
const sync = new SyncPlugin({
  serverUrl: 'https://workspace.example.com/sync',
  conflictResolution: 'custom',
  mergeFunction: (server, client) => {
    // Team lead always wins on status
    if (client.lead) return client;
    
    // Merge comments and assignees
    return {
      ...server,
      comments: mergeLists(server.comments, client.comments),
      assignees: mergeLists(server.assignees, client.assignees),
      lastModified: Math.max(
        server.lastModified,
        client.lastModified
      )
    };
  }
});

db.use(sync);

// Track all changes
sync.on('conflict', (conflict) => {
  // Notify team of resolution
  notifyTeam(`${conflict.collection} was updated by another user`, {
    documentId: conflict.documentId,
    resolved: conflict.resolved
  });
});
```

---

## Best Practices

### 1. Choose Right Conflict Resolution

| Strategy | Use Case |
|----------|----------|
| `last-write-wins` | Most apps, concurrent edits OK |
| `server-wins` | Authoritative backend needed |
| `client-wins` | Offline-first apps |
| `custom` | Complex business logic |

### 2. Handle Sync Errors

```typescript
sync.on('error', async (error) => {
  if (error.type === 'network') {
    // Network error - will retry automatically
    showToast('Connection lost, will retry...');
  } else if (error.type === 'auth') {
    // Auth failed - need user intervention
    await showLoginDialog();
  } else if (error.type === 'conflict') {
    // Conflict - already resolved automatically
    showToast('Document updated by another user');
  }
});
```

### 3. Monitor Offline Queue

```typescript
// Warn when queue is large
sync.on('queueSizeChanged', (size) => {
  if (size > 1000) {
    showWarning(`${size} pending changes - sync soon!`);
  }
});

// Cleanup very old offline changes
async function cleanupQueue() {
  const queue = await sync.getOfflineQueue();
  const old = queue.filter(change => 
    Date.now() - change.timestamp > 7 * 24 * 60 * 60 * 1000 // 7 days
  );
  
  if (old.length > 0) {
    console.warn(`Removing ${old.length} very old offline changes`);
    await sync.clearOfflineQueue(); // Manual cleanup if needed
  }
}
```

### 4. Optimize Sync Bandwidth

```typescript
const sync = new SyncPlugin({
  serverUrl: 'https://sync.example.com',
  selectiveSync: true,      // Only sync needed collections
  batchSize: 100,           // Batch changes
  syncInterval: 30000       // Don't sync too frequently
});

// Only sync essential collections
await sync.syncCollection('users');
await sync.syncCollection('documents');

// Skip syncing read-only caches
// await sync.syncCollection('cache'); // NO
```

### 5. Handle Conflicts Gracefully

```typescript
sync.on('conflict', (conflict) => {
  // Log for debugging
  logger.warn('Conflict resolved', {
    collection: conflict.collection,
    doc: conflict.documentId,
    strategy: conflict.strategy
  });
  
  // For user-facing conflicts
  if (conflict.collection === 'documents') {
    showNotification(
      'Your document was edited elsewhere. Your changes were kept.',
      'info'
    );
  }
});
```

---

## Troubleshooting

### Sync Not Starting

```typescript
// Check connection
const sync = new SyncPlugin({
  serverUrl: 'https://sync.example.com',
  timeout: 10000 // Increase timeout
});

sync.on('error', (error) => {
  console.error('Sync failed:', error.message);
  // Check: network, firewall, server running?
});

await sync.start();
```

### Changes Not Syncing

```typescript
// Force immediate sync
await sync.syncNow();

// Check if online
const queue = await sync.getOfflineQueue();
if (queue.length > 0) {
  console.log(`${queue.length} pending changes`);
}

// Monitor sync progress
sync.on('progress', (p) => {
  console.log(`Progress: ${p.synced}/${p.total}`);
});
```

### High Conflict Rate

```typescript
// Reduce conflict rate:
// 1. Use more selective queries to avoid overlapping edits
// 2. Implement lock/lease system for important documents
// 3. Use server-wins strategy if one source is authoritative
// 4. Consider splitting data differently

const sync = new SyncPlugin({
  conflictResolution: 'server-wins', // Reduce conflicts
  syncInterval: 60000 // Sync less frequently
});
```

---

## API Reference

### SyncPlugin Methods

```typescript
// Start/stop sync
await sync.start(): Promise<void>
await sync.stop(): Promise<void>

// Manual sync
await sync.syncNow(): Promise<void>
await sync.syncCollection(name): Promise<void>
await sync.syncPending(): Promise<void>

// Queue management
await sync.getOfflineQueue(): Promise<Change[]>
await sync.clearOfflineQueue(): Promise<void>

// Status
sync.isOnline(): boolean
sync.isSyncing(): boolean
sync.getStatus(): SyncStatus

// Events
sync.on(event, callback)
sync.off(event, callback)
sync.once(event, callback)
```

### Events

```typescript
'progress'           // Sync progress
'conflict'           // Conflict detected & resolved
'error'              // Sync error
'connectionLost'     // Went offline
'connectionRestored' // Came back online
'syncStart'          // Sync started
'syncComplete'       // Sync finished
'queueSizeChanged'   // Offline queue changed
```

---

## Security Considerations

- Always use HTTPS for sync connections
- Validate authentication tokens
- Encrypt sensitive data
- Monitor audit logs
- Implement rate limiting
- Use webhook signatures to prevent spoofing

---

## See Also

- [Performance Guide](./PERFORMANCE.md) - Optimize sync performance
- [Encryption Guide](./ENCRYPTION.md) - Encrypt synced data
- [Migration Guide](./MIGRATION_v0.3_to_v0.4.md) - Upgrade from v0.3
