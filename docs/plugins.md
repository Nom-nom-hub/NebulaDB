# Plugins Guide

Extend NebulaDB with plugins.

## Available Plugins

| Plugin | Description |
|--------|-------------|
| encryption | AES-256 encryption at rest |
| cache | Query result caching |
| sync | Real-time sync |
| validation | Schema validation |
| versioning | Schema versioning |
| fulltext-search | Full-text search |
| geospatial | Geo-spatial queries |
| auth | Authentication & RBAC |

## Encryption Plugin

Encrypt data at rest.

```bash
npm install @nebula-db/plugin-encryption
```

```typescript
import { createDb } from '@nebula-db/core';
import { createEncryptionPlugin } from '@nebula-db/plugin-encryption';

const encryption = createEncryptionPlugin({
  key: 'your-256-bit-key-here-32byt',
  algorithm: 'AES-256-GCM'
});

const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [encryption]
});

// Documents are now encrypted when saved
await db.collection('secrets').insert({ 
  secret: 'my password' 
});
```

## Cache Plugin

Cache query results.

```bash
npm install @nebula-db/plugin-cache
```

```typescript
import { createCachePlugin } from '@nebula-db/plugin-cache';

const cache = createCachePlugin({
  ttlMs: 60000,  // 1 minute
  maxSize: 100
});

const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [cache]
});

// Repeated queries return cached results
const users = await db.collection('users').find({ age: 25 });
```

## Validation Plugin

Validate documents against schemas.

```bash
npm install @nebula-db/plugin-validation
```

```typescript
import { createValidationPlugin } from '@nebula-db/plugin-validation';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).optional()
});

const validation = createValidationPlugin({
  users: userSchema
});

const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [validation]
});

// Throws if invalid
await db.collection('users').insert({ 
  name: 'Alice',
  email: 'invalid-email'
});
```

## Versioning Plugin

Track schema versions and run migrations.

```bash
npm install @nebula-db/plugin-versioning
```

```typescript
import { createVersioningPlugin } from '@nebula-db/plugin-versioning';

const versioning = createVersioningPlugin();

const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [versioning]
});

// Set schema version
await versioning.setVersion('users', 2);

// Get version
const version = await versioning.getVersion('users');

// Add migration
await versioning.addMigration('users', 2, async (db) => {
  await db.collection('users').update({}, { $set: { newField: '' }});
});
```

## Full-Text Search Plugin

Search documents by text content.

```bash
npm install @nebula-db/plugin-fulltext-search
```

```typescript
import { createFullTextSearchPlugin } from '@nebula-db/plugin-fulltext-search';

const fts = createFullTextSearchPlugin({
  fields: ['title', 'content'],
  stopWords: new Set(['the', 'a', 'an']),
  minWordLength: 2
});

const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [fts]
});

await db.collection('posts').insert({
  id: '1',
  title: 'Getting Started with JavaScript',
  content: 'Learn JavaScript from scratch'
});

// Search
const results = await db.collection('posts').find({
  $text: { $search: 'javascript' }
});
```

## Geo-Spatial Plugin

Query by location.

```bash
npm install @nebula-db/plugin-geospatial
```

```typescript
import { createGeospatialPlugin } from '@nebula-db/plugin-geospatial';

const geo = createGeospatialPlugin({
  latField: 'location.lat',
  lngField: 'location.lng'
});

const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [geo]
});

await db.collection('places').insert([
  { id: '1', name: 'NYC', location: { lat: 40.7128, lng: -74.0060 }},
  { id: '2', name: 'LA', location: { lat: 34.0522, lng: -118.2437 }}
]);

// Find nearby
const nearby = await db.collection('places').find({
  $geo: {
    $near: { lat: 40.7128, lng: -74.0060, maxDistance: 100000 }
  }
});

// Find within box
const inBox = await db.collection('places').find({
  $geo: { $within: { box: [-80, 35, -70, 45] }}
});

// Find within circle
const inCircle = await db.collection('places').find({
  $geo: { $within: { center: [-74.0060, 40.7128, 50000] }}
});
```

## Auth Plugin

Authentication and authorization.

```bash
npm install @nebula-db/plugin-auth
```

```typescript
import { createAuthPlugin } from '@nebula-db/plugin-auth';

const auth = createAuthPlugin();

const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [auth]
});

// Register user
await auth.register('alice', 'alice@example.com', 'password123');

// Login
const { user, session } = await auth.login('alice@example.com', 'password123');
console.log(session.id); // session token

// Validate session
const validUser = await auth.validateSession(session.id);

// Check permissions
if (auth.canAccess(validUser, 'posts', 'write')) {
  await db.collection('posts').insert({ title: 'New post' });
}

// Define access control
auth.requireAuth('admin-posts', 'admin');
```

## Sync Plugins

CouchDB and Supabase sync.

```bash
npm install @nebula-db/sync-couchdb
npm install @nebula-db/sync-supabase
```

```typescript
// CouchDB
import { createCouchDBSyncAdapter } from '@nebula-db/sync-couchdb';

const couch = createCouchDBSyncAdapter({
  url: 'http://localhost:5984',
  database: 'myapp',
  username: 'admin',
  password: 'secret'
}, db);

await couch.sync();

// Supabase
import { createSupabaseSyncAdapter } from '@nebula-db/sync-supabase';

const supabase = createSupabaseSyncAdapter({
  url: 'https://xxx.supabase.co',
  apikey: 'your-key'
}, db);

await supabase.sync();
```

## Combining Plugins

```typescript
const db = createDb({
  adapter: new SQLiteAdapter('./app.db'),
  plugins: [
    encryption,
    cache,
    validation,
    versioning
  ]
});
```