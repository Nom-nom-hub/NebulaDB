# NebulaDB Redis Adapter Example

This example demonstrates how to use NebulaDB with the Redis adapter for fast, in-memory persistent storage. Redis is ideal for session management, caching, and real-time data.

## Features Demonstrated

- Creating a database with Redis adapter
- Defining collections with schemas
- Storing session data with metadata
- Querying sessions by user ID
- Updating session tokens with `$set`
- Deleting sessions

## Prerequisites

- Node.js 18+
- Redis server (local or cloud)

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

Create a free instance at [Redis Cloud](https://redis.io/try-free) and copy your connection URL.

### Install Dependencies

```bash
cd examples/redis-example
npm install
```

## Configure Your Connection

```bash
export REDIS_HOST="localhost"
export REDIS_PORT="6379"
export REDIS_PASSWORD="yourpassword"
```

## Run

```bash
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Redis server host | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |
| `REDIS_PASSWORD` | Redis password | (empty) |

## Code Explanation

### Adapter Setup

```javascript
import { createDatabase } from '@nebula-db/nebula-db';
import { RedisAdapter } from '@nebula-db/adapter-redis';

const adapter = new RedisAdapter({
  host: REDIS_HOST,
  port: parseInt(REDIS_PORT),
  password: REDIS_PASSWORD
});

const db = createDatabase({ adapter, options: {} });
```

### Collection with Schema

```javascript
const sessions = db.collection('sessions', {
  schema: {
    id: { type: 'string', optional: true },
    userId: { type: 'string' },
    token: { type: 'string' },
    expiresAt: { type: 'date' },
    metadata: { type: 'object', optional: true }
  }
});
```

### Filtered Queries

```javascript
const user1Sessions = await sessions.find({ userId: 'user_001' });
```

### Update Documents

```javascript
await sessions.update(
  { userId: 'user_002' },
  { $set: { token: 'tok_newtoken123' } }
);
```

## How Redis Storage Works

Each document is stored as a separate Redis key. For example:

```
nebula-db:sessions:abc123 → {"userId":"user_001","token":"tok_abc123","expiresAt":"..."}
```

This key-based approach enables fast lookups by document ID while collection-level queries filter across all keys.

## Expected Output

```
=== NebulaDB Redis Adapter Demo ===
ℹ️  Connecting to Redis at localhost:6379
--------------------------------------------------

=== Creating Sample Sessions ===
ℹ️  Inserting sample sessions into Redis...
✅ Inserted: Session for user user_001
✅ Inserted: Session for user user_002
✅ Inserted: Session for user user_003

=== Querying Sessions ===
ℹ️  Finding all sessions...
✅ Found 3 sessions
ℹ️  Finding sessions for user_001...
✅ Found 1 sessions for user_001

=== Updating Sessions ===
ℹ️  Updating user_002 session token...
✅ Updated session

=== Deleting Sessions ===
ℹ️  Deleting user_003 session...
✅ Session deleted
✅ 2 sessions remaining
--------------------------------------------------
✅ Redis adapter demo completed successfully!
```

## Use Cases

The Redis adapter is ideal for:

- Session storage
- Caching
- Rate limiting
- Real-time data

## Next Steps

- Try the [PostgreSQL example](../postgresql-example) for relational storage
- Try the [MongoDB example](../mongodb-example) for document-oriented storage
- Explore the [NebulaDB docs](https://github.com/Nom-nom-hub/NebulaDB)

---

*Documentation adapted from [@HirenGajjar](https://github.com/HirenGajjar)'s contribution ([PR #36](https://github.com/Nom-nom-hub/NebulaDB/pull/36)).*
