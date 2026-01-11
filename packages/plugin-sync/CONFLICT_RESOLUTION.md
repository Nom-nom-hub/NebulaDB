# Conflict Resolution Guide

When syncing data across multiple clients or devices, conflicts can occur when the same document is modified on different clients before they sync. NebulaDB provides multiple built-in conflict resolution strategies and the ability to implement custom merge logic.

## Overview

Conflict resolution determines which version of a document is kept when the same document is modified differently on multiple clients. NebulaDB supports four strategies:

1. **Last-Write-Wins (LWW)** - The most recently modified document wins
2. **Server-Wins** - The server version always takes precedence
3. **Client-Wins** - The client version always takes precedence
4. **Custom Merge** - Apply custom logic to merge conflicting versions

## Usage

### Basic Setup with Conflict Resolution

```typescript
import { createDb } from '@nebula-db/core';
import { MemoryAdapter } from '@nebula-db/adapter-memory';
import { createSyncPlugin } from '@nebula-db/plugin-sync';

// Create database with sync plugin using last-write-wins strategy
const syncPlugin = createSyncPlugin({
  serverUrl: 'http://localhost:3000',
  collections: ['users', 'posts'],
  conflictResolution: 'last-write-wins' // default
});

const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [syncPlugin]
});
```

## Strategies

### 1. Last-Write-Wins (LWW)

The document with the most recent timestamp wins. This is the default strategy and works well for most use cases.

**Pros:**
- Simple and predictable
- Works with distributed timestamps (even with clock skew tolerances)
- No data loss, all changes are preserved somewhere

**Cons:**
- Newer changes can overwrite important older changes
- Doesn't preserve all edits

**When to use:**
- Single-author documents
- Content where the latest version is always correct
- Most real-world applications

```typescript
const syncPlugin = createSyncPlugin({
  serverUrl: 'http://localhost:3000',
  conflictResolution: 'last-write-wins'
});
```

### 2. Server-Wins

The server's version of the document always takes precedence, regardless of timestamps.

**Pros:**
- Server is authoritative source of truth
- Simple to reason about
- Good for mobile apps with offline mode

**Cons:**
- Client changes may be lost
- Doesn't work well with peer-to-peer sync

**When to use:**
- Client-server architectures
- When server is the source of truth
- Scenarios where client changes are considered temporary

```typescript
const syncPlugin = createSyncPlugin({
  serverUrl: 'http://localhost:3000',
  conflictResolution: 'server-wins'
});
```

### 3. Client-Wins

The client's version of the document always takes precedence.

**Pros:**
- User changes are never lost
- Works well for offline-first applications
- Respects user's latest action

**Cons:**
- May diverge from server state
- Server changes may be overwritten
- Doesn't work well in multi-user scenarios

**When to use:**
- Offline-first applications
- Single-user databases
- Local-first applications

```typescript
const syncPlugin = createSyncPlugin({
  serverUrl: 'http://localhost:3000',
  conflictResolution: 'client-wins'
});
```

### 4. Custom Merge

Implement custom merge logic to intelligently combine conflicting versions.

**Pros:**
- Preserves both versions' non-conflicting changes
- Can implement field-level conflict resolution
- Maximum control and flexibility

**Cons:**
- More complex to implement and test
- Merge function must handle all edge cases
- Performance impact for large datasets

**When to use:**
- Collaborative editing
- Complex document structures
- When you need intelligent merging

#### Example: Field-Level Merge

```typescript
const customMergeFn = (local, remote) => {
  // Keep remote changes but merge in local-only fields
  const merged = { ...remote };
  
  // Merge non-conflicting fields from local
  for (const key of Object.keys(local)) {
    if (key.startsWith('_')) continue; // Skip metadata
    if (!(key in remote)) {
      // Field only exists in local, keep it
      merged[key] = local[key];
    }
  }
  
  return merged;
};

const syncPlugin = createSyncPlugin({
  serverUrl: 'http://localhost:3000',
  conflictResolution: 'custom',
  customMergeFn
});
```

#### Example: Array-Aware Merge

```typescript
const customMergeFn = (local, remote) => {
  return {
    ...remote,
    // Merge arrays by combining unique items
    tags: [...new Set([...local.tags, ...remote.tags])],
    // Keep newer timestamp
    updatedAt: Math.max(local.updatedAt, remote.updatedAt)
  };
};

const syncPlugin = createSyncPlugin({
  serverUrl: 'http://localhost:3000',
  conflictResolution: 'custom',
  customMergeFn
});
```

#### Example: Three-Way Merge

```typescript
const customMergeFn = (local, remote) => {
  // Implement a three-way merge with a base version
  // (requires storing the base version somewhere)
  const base = getBaseVersion(local.id);
  
  if (!base) {
    // No base, fall back to server-wins
    return remote;
  }
  
  const merged = { ...base };
  
  // Apply non-conflicting changes from both sides
  const baseKeys = Object.keys(base);
  for (const key of baseKeys) {
    const baseValue = base[key];
    const localValue = local[key];
    const remoteValue = remote[key];
    
    if (baseValue === localValue) {
      // Local unchanged, use remote
      merged[key] = remoteValue;
    } else if (baseValue === remoteValue) {
      // Remote unchanged, use local
      merged[key] = localValue;
    } else if (JSON.stringify(localValue) === JSON.stringify(remoteValue)) {
      // Both changed to same thing
      merged[key] = localValue;
    } else {
      // Both changed differently - conflict!
      // You can implement field-specific logic here
      merged[key] = remoteValue; // Default to remote
    }
  }
  
  return merged;
};
```

## Versioning and Timestamps

Documents should include version metadata to enable effective conflict resolution:

```typescript
interface VersionedDocument {
  id: string;
  // ... your fields ...
  
  // Sync metadata
  __version?: number;        // Version number
  __lastWrite?: number;      // Timestamp of last write
  __clientId?: string;       // Client that made the last write
}
```

When inserting or updating documents for sync:

```typescript
const doc = {
  id: '123',
  name: 'Alice',
  __lastWrite: Date.now(),
  __clientId: syncPlugin.api.getClientId?.() || 'unknown'
};

await users.insert(doc);
```

## Conflict Detection

The sync plugin automatically detects conflicts by comparing versions. Get detailed information about conflicts:

```typescript
// Custom merge function with detailed conflict info
const customMergeFn = (local, remote) => {
  const conflictDetails = {
    localVersion: local.__version,
    remoteVersion: remote.__version,
    conflictingFields: Object.keys(local).filter(
      key => JSON.stringify(local[key]) !== JSON.stringify(remote[key])
    )
  };
  
  console.log('Conflict details:', conflictDetails);
  
  // Implement merge logic...
  return remote;
};
```

## Best Practices

### 1. Always Include Metadata

```typescript
const doc = {
  id: '123',
  name: 'Alice',
  __lastWrite: Date.now(),
  __clientId: clientId
};
```

### 2. Test Merge Functions

```typescript
import { describe, it, expect } from 'vitest';

describe('Custom merge function', () => {
  it('should merge non-conflicting changes', () => {
    const local = { id: '1', name: 'Alice', age: 30 };
    const remote = { id: '1', name: 'Alice', email: 'alice@example.com' };
    
    const merged = customMergeFn(local, remote);
    
    expect(merged.email).toBe('alice@example.com');
    expect(merged.age).toBe(30);
  });
  
  it('should handle conflicting changes', () => {
    const local = { id: '1', name: 'Alice' };
    const remote = { id: '1', name: 'Bob' };
    
    const merged = customMergeFn(local, remote);
    
    // Make sure merge completes without error
    expect(merged).toBeDefined();
  });
});
```

### 3. Monitor Conflicts

```typescript
// Listen to sync events to detect conflicts
const syncPlugin = createSyncPlugin({
  serverUrl: 'http://localhost:3000',
  logging: { enabled: true, level: 'warn' }
});

// Check sync status periodically
setInterval(() => {
  const status = syncPlugin.api.getStatus();
  if (status.error) {
    console.error('Sync error:', status.error);
  }
}, 5000);
```

### 4. Document Your Choice

Add comments explaining why you chose a specific strategy:

```typescript
// Using client-wins because this is an offline-first app
// where user changes should never be lost. The server will
// merge changes from multiple clients during sync.
const syncPlugin = createSyncPlugin({
  serverUrl: 'http://localhost:3000',
  conflictResolution: 'client-wins'
});
```

## Troubleshooting

### Conflicts Not Being Detected

Make sure documents have timestamp metadata:

```typescript
// ❌ Wrong - no timestamps
await collection.insert({ id: '1', name: 'Alice' });

// ✅ Correct - includes timestamp
await collection.insert({
  id: '1',
  name: 'Alice',
  __lastWrite: Date.now()
});
```

### Merge Function Errors

If your custom merge function throws an error, it will fall back to server-wins:

```typescript
const customMergeFn = (local, remote) => {
  try {
    // Your merge logic
    return merged;
  } catch (error) {
    // Error is caught and server-wins is used
    throw error;
  }
};
```

## Related Documentation

- [Sync Plugin Overview](./README.md)
- [NebulaDB Sync Architecture](../../docs/sync.md)
- [TypeScript Types](./src/conflict-resolution.ts)
