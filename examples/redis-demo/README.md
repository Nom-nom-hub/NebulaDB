# NebulaDB Redis Adapter Demo

This example demonstrates using NebulaDB with the Redis adapter for fast, in-memory persistent storage. Redis is ideal for session management, caching, and real-time data.

## Features Demonstrated

1. **Redis Connection** - Connecting via URL or options object
2. **CRUD Operations** - Insert, find, update, and delete documents
3. **Filtered Queries** - Query by field values
4. **Key Prefixing** - Documents stored under `nebula-db:{collection}:{id}` keys
5. **Connection Cleanup** - Properly closing the Redis connection after use

## Requirements

- Node.js v18 or higher
- A running Redis instance (local or remote)

## Setup

### Option A — Local Redis

```bash
# macOS
brew install redis
brew services start redis
```

### Option B — Docker

```bash
docker run --name nebula-redis \
  -p 6379:6379 \
  -d redis
```

### Option C — Redis Cloud

Create a free instance at https://redis.io/try-free and copy your connection URL.

## Installation

```bash
cd examples/redis-demo
npm install
```

## Running the Demo

```bash
# Default: connects to redis://localhost:6379
npm start

# Custom connection
REDIS_URL=redis://user:password@your-host:6379 npm start
```

## Code Explanation

### Adapter Setup

```javascript
const adapter = createRedisAdapter(
  process.env.REDIS_URL || 'redis://localhost:6379'
);
const db = createDatabase({ adapter });
```

### Collection with Schema

```javascript
const sessions = db.collection('sessions', {
  schema: {
    userId: { type: 'string' },
    token: { type: 'string' },
    active: { type: 'boolean' }
  }
});
```

### Filtered Query

```javascript
const active = await sessions.find({ active: true });
```

### Always Close the Connection

```javascript
await adapter.close();
```

## How Redis Storage Works

Each document is stored as a separate Redis key in the format:

```
nebula-db:{collection}:{documentId} → JSON string
```

For example:
```
nebula-db:sessions:abc123 → {"userId":"user_1","token":"tok_abc123","active":true}
```

## Expected Output

```
=== NebulaDB Redis Adapter Demo ===
ℹ️  Connecting to Redis and demonstrating CRUD operations
--------------------------------------------------

=== Inserting Data ===
✅ 3 sessions inserted

=== Querying All Records ===
✅ Found 3 sessions: [...]

=== Filtered Query ===
✅ Found 2 active sessions: [...]

=== Updating Data ===
✅ Session updated: [...]

=== Deleting Data ===
✅ 1 sessions remaining
--------------------------------------------------
✅ All operations completed successfully!
```

## Next Steps

- Try the [PostgreSQL demo](../postgresql-demo) for relational storage
- Try the [MongoDB demo](../mongodb-demo) for document-oriented storage
- Explore the [NebulaDB docs](https://github.com/Nom-nom-hub/NebulaDB)
