# Cloudflare D1 Adapter for NebulaDB

A persistent SQL storage adapter for NebulaDB using Cloudflare D1 (SQLite for the edge).

## Features

- **Edge Computing**: Optimized for Cloudflare Workers and Pages
- **SQL Backend**: Uses D1 (SQLite) for reliable data storage
- **Simple Integration**: Works seamlessly with Cloudflare Workers environments
- **Low Latency**: Data stored at the edge for fast access globally

## Installation

```bash
npm install @nebula-db/adapter-cloudflare-d1
```

## Usage

### Basic Setup with Cloudflare Workers

```typescript
import { createDb } from '@nebula-db/core';
import { createCloudflareD1Adapter } from '@nebula-db/adapter-cloudflare-d1';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Create database with D1 adapter
    const adapter = createCloudflareD1Adapter(env.DB);
    const db = createDb({ adapter });

    // Use collections
    const users = db.collection('users');
    await users.insert({ name: 'Alice', age: 30 });
    const all = await users.find({});

    return new Response(JSON.stringify(all));
  }
};
```

### With wrangler.toml Configuration

```toml
[env.production]
d1_databases = [
  { binding = "DB", database_name = "nebula_db", database_id = "xxxx" }
]
```

Then in your Worker code:

```typescript
const db = createDb({
  adapter: createCloudflareD1Adapter(env.DB)
});
```

### Advanced: Raw SQL Queries

```typescript
const adapter = createCloudflareD1Adapter(env.DB);
const results = await adapter.query(
  'SELECT * FROM users WHERE age > ?',
  [25]
);
```

## Environment Setup

1. Create a D1 database:
```bash
wrangler d1 create nebula_db
```

2. Update `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "nebula_db"
database_id = "your-database-id"
```

3. Binding becomes available in `env.DB`

## Data Structure

Documents are stored as:
- **Table per Collection**: Each NebulaDB collection becomes a D1 table
- **Column Structure**: `id` (TEXT, PRIMARY KEY) and `data` (TEXT, JSON)

Example schema:
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL
);
```

The `data` column stores the document as JSON, allowing flexibility while maintaining queryability.

## Limitations

- No cross-collection transactions (D1 limitation)
- JSON queries are limited compared to document databases
- Maximum database size subject to Cloudflare plan

## Performance Characteristics

- **Read**: O(1) for single documents, O(n) for collection scans
- **Write**: O(1) per document, subject to D1 rate limits
- **Global Replication**: Automatic across Cloudflare edge locations

## Cloudflare Pages Functions

Works with Pages Functions:

```typescript
// functions/api/users.ts
import { createDb } from '@nebula-db/core';
import { createCloudflareD1Adapter } from '@nebula-db/adapter-cloudflare-d1';

export async function onRequest(context) {
  const db = createDb({
    adapter: createCloudflareD1Adapter(context.env.DB)
  });

  const users = db.collection('users');
  const data = await users.find({});

  return new Response(JSON.stringify(data));
}
```

## Debugging

Enable verbose logging in development:

```typescript
const adapter = createCloudflareD1Adapter(env.DB);
const db = createDb({ adapter });

// Check underlying database
console.log(adapter.getDatabase());
```

## License

MIT
