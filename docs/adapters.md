# Adapters Guide

Storage backends for NebulaDB.

## Available Adapters

| Adapter | Environment | Use Case |
|---------|-------------|----------|
| Memory | All | Testing, caching |
| SQLite | Node.js | Production desktop apps |
| PostgreSQL | Node.js | Production databases |
| MySQL | Node.js | Production databases |
| MongoDB | Node.js | Production databases |
| Redis | Node.js | Caching, real-time |
| IndexedDB | Browser | Web apps |
| localStorage | Browser | Small web data |
| Filesystem | Node.js | File-based storage |
| Deno KV | Deno | Edge runtime |
| Cloudflare D1 | Workers | Edge/serverless |

## Memory Adapter

For testing and caching.

```bash
npm install @nebula-db/adapter-memory
```

```typescript
import { createDb } from '@nebula-db/core';
import { MemoryAdapter } from '@nebula-db/adapter-memory';

const adapter = new MemoryAdapter();
const db = createDb({ adapter });
```

## SQLite Adapter

Persistent local storage using better-sqlite3.

```bash
npm install @nebula-db/adapter-sqlite
npm install better-sqlite3
```

```typescript
import { SQLiteAdapter } from '@nebula-db/adapter-sqlite';

const adapter = new SQLiteAdapter('./data.db');
const db = createDb({ adapter });

// Raw queries
const users = await adapter.query('SELECT * FROM users WHERE age > ?', [25]);
```

## PostgreSQL Adapter

For production with PostgreSQL.

```bash
npm install @nebula-db/adapter-postgresql
npm install pg
```

```typescript
import { PostgreSQLAdapter } from '@nebula-db/adapter-postgresql';

const adapter = new PostgreSQLAdapter({
  host: 'localhost',
  port: 5432,
  user: 'admin',
  password: 'secret',
  database: 'myapp'
});

const db = createDb({ adapter });
```

## MySQL Adapter

```bash
npm install @nebula-db/adapter-mysql
npm install mysql2
```

```typescript
import { MySQLAdapter } from '@nebula-db/adapter-mysql';

const adapter = new MySQLAdapter({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'secret',
  database: 'myapp'
});
```

## MongoDB Adapter

```bash
npm install @nebula-db/adapter-mongodb
npm install mongodb
```

```typescript
import { MongoDBAdapter } from '@nebula-db/adapter-mongodb';

const adapter = new MongoDBAdapter({
  uri: 'mongodb://localhost:27017',
  database: 'myapp'
});
```

## Redis Adapter

For caching and real-time data.

```bash
npm install @nebula-db/adapter-redis
npm install ioredis
```

```typescript
import { RedisAdapter } from '@nebula-db/adapter-redis';

const adapter = new RedisAdapter({
  host: 'localhost',
  port: 6379
});
```

## IndexedDB Adapter (Browser)

```bash
npm install @nebula-db/adapter-indexeddb
```

```typescript
import { IndexedDBAdapter } from '@nebula-db/adapter-indexeddb';

const adapter = new IndexedDBAdapter('my-app');
```

## localStorage Adapter (Browser)

```bash
npm install @nebula-db/adapter-localstorage
```

```typescript
import { LocalStorageAdapter } from '@nebula-db/adapter-localstorage';

const adapter = new LocalStorageAdapter('nebula:');
```

## Filesystem Adapter (Node.js)

```bash
npm install @nebula-db/adapter-filesystem
```

```typescript
import { FilesystemAdapter } from '@nebula-db/adapter-filesystem';

const adapter = new FilesystemAdapter('./data');

// Get the directory
const dir = adapter.getDirPath();
```

## Deno KV Adapter

```bash
npm install @nebula-db/adapter-deno-kv
```

```typescript
import { DenoKvAdapter } from '@nebula-db/adapter-deno-kv';

const adapter = new DenoKvAdapter();
await adapter.init();
```

## Cloudflare D1 Adapter

```bash
npm install @nebula-db/adapter-cloudflare-d1
```

```typescript
// In Cloudflare Workers
export default {
  async fetch(request, env) {
    const adapter = new CloudflareD1Adapter(env.DB);
    const db = createDb({ adapter });
    
    const users = db.collection('users');
    await users.insert({ name: 'Alice' });
  }
};
```

## Choosing an Adapter

| Scenario | Recommended Adapter |
|----------|-------------------|
| Testing | Memory |
| Learning | Memory, SQLite |
| Web app (simple) | IndexedDB |
| Web app (offline) | IndexedDB + sync |
| Node.js desktop app | SQLite |
| Node.js server | PostgreSQL |
| Caching layer | Redis |
| Edge/Serverless | Cloudflare D1, Deno KV |
| Browser + Node shared | SQLite (both) |