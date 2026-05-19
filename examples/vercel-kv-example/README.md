# NebulaDB Vercel KV Adapter Example

This example demonstrates how to use NebulaDB with the Vercel KV adapter for persistent, Redis-compatible edge storage via Vercel's REST API.

## Features Demonstrated

- Creating a database with Vercel KV adapter
- Defining collections with schemas
- Inserting documents (link shortener collection)
- Querying with filters (equality matching)
- Updating documents with `$set`
- Deleting documents with filter conditions

## Prerequisites

- Node.js 18+
- A [Vercel](https://vercel.com) account with a KV store

## Setup

### 1. Create a Vercel KV Store

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Storage → Create → KV Database**
3. Choose a name and region
4. Once created, go to the **Settings** tab and copy:
   - `KV_REST_API_URL` (the REST API endpoint)
   - `KV_REST_API_TOKEN` (the authentication token)

### 2. Install Dependencies

```bash
cd examples/vercel-kv-example
npm install
```

### 3. Configure Environment Variables

```bash
export KV_REST_API_URL="https://your-project.kv.vercel-storage.com"
export KV_REST_API_TOKEN="your_api_token_here"
```

> **Tip:** Copy `.env.example` to `.env` and fill in your credentials for convenience.

### 4. Run

```bash
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `KV_REST_API_URL` | Vercel KV REST API endpoint | Yes |
| `KV_REST_API_TOKEN` | Vercel KV authentication token | Yes |

## Code Explanation

### Adapter Setup

```javascript
import { createDatabase } from '@nebula-db/nebula-db';
import { VercelKvAdapter } from '@nebula-db/adapter-vercel-kv';

const adapter = new VercelKvAdapter(KV_URL, KV_TOKEN, {
  namespacePrefix: 'nebula_',
});

const db = createDatabase({ adapter, options: {} });
```

The `namespacePrefix` option adds a prefix to all keys in Vercel KV, preventing collisions with other data in the same store.

### Collection with Schema

```javascript
const links = db.collection('links', {
  schema: {
    id: { type: 'string', optional: true },
    slug: { type: 'string' },
    url: { type: 'string' },
    clicks: { type: 'number' },
    active: { type: 'boolean' },
  },
});
```

### Filtered Query

```javascript
const activeLinks = await links.find({ active: true });
```

### Update Documents

```javascript
await links.update({ slug: 'gh' }, { $set: { clicks: 1 } });
```

### Delete Documents

```javascript
await links.delete({ active: false });
```

## How Vercel KV Storage Works

Each document is stored as a key-value pair via Vercel's REST API:

```
nebula_links:<documentId> → { slug: "gh", url: "https://github.com", clicks: 0, active: true }
```

The `namespacePrefix` becomes the key prefix, followed by the collection name and document ID.

## Expected Output

```
=== NebulaDB Vercel KV Adapter Demo ===
ℹ️  Connecting to Vercel KV...
--------------------------------------------------

=== Creating Sample Links ===
ℹ️  Inserting sample links into Vercel KV...
✅ Inserted: /gh → https://github.com
✅ Inserted: /docs → https://docs.example.com
✅ Inserted: /old → https://old.example.com

=== Querying Links ===
ℹ️  Finding all links...
✅ Found 3 links
[
  { "slug": "gh", "url": "https://github.com", "clicks": 0, "active": true },
  ...
]
ℹ️  Finding active links...
✅ Found 2 active links

=== Updating Links ===
ℹ️  Incrementing click count for /gh...
✅ Updated link

=== Deleting Links ===
ℹ️  Removing inactive links...
✅ 2 links remaining
--------------------------------------------------
✅ Vercel KV adapter demo completed successfully!
```

## Next Steps

- Try the [Redis example](../redis-example) for a self-hosted alternative
- Try the [Cloudflare D1 example](../cloudflare-d1-example) for another edge storage option
- Explore the [NebulaDB docs](https://github.com/Nom-nom-hub/NebulaDB)

---

*Original contribution by [@HirenGajjar](https://github.com/HirenGajjar) ([PR #46](https://github.com/Nom-nom-hub/NebulaDB/pull/46)).*
