# NebulaDB Cloudflare D1 Adapter Demo

This example demonstrates using NebulaDB with the Cloudflare D1 adapter inside a Cloudflare Worker. D1 is Cloudflare's edge-native SQLite database.

> **Note:** Cloudflare D1 only runs inside a Cloudflare Worker environment. This example cannot be run with `node` locally — use `wrangler dev` for local simulation or `wrangler deploy` for production.

## Features Demonstrated

1. **D1 Binding** - Receiving the D1 instance from the Worker's `env.DB`
2. **CRUD via HTTP** - Each route demonstrates an operation (insert, find, update, delete)
3. **Edge Storage** - Data persists in D1 across Worker requests
4. **Auto Table Creation** - Tables are created automatically on first save

## Requirements

- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) v3+
- Node.js v18 or higher

## Setup

### 1. Install Wrangler

```bash
npm install -g wrangler
wrangler login
```

### 2. Create a D1 Database

```bash
wrangler d1 create nebula-demo
```

Copy the `database_id` from the output and paste it into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "nebula-demo"
database_id = "YOUR_D1_DATABASE_ID"   # <-- replace this
```

### 3. Install Dependencies

```bash
cd examples/cloudflare-d1-demo
npm install
```

## Running the Demo

### Local simulation

```bash
npm run dev
```

Worker runs at `http://localhost:8787`

### Production deploy

```bash
npm run deploy
```

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | List all available routes |
| POST | `/seed` | Insert 3 sample tasks |
| GET | `/tasks` | Fetch all tasks |
| GET | `/tasks/pending` | Fetch pending tasks |
| PATCH | `/tasks/complete` | Complete medium priority tasks |
| DELETE | `/tasks/done` | Remove completed tasks |

### Example requests

```bash
# Seed data
curl -X POST http://localhost:8787/seed

# Fetch all tasks
curl http://localhost:8787/tasks

# Fetch pending tasks
curl http://localhost:8787/tasks/pending

# Complete a task
curl -X PATCH http://localhost:8787/tasks/complete

# Delete completed tasks
curl -X DELETE http://localhost:8787/tasks/done
```

## Code Explanation

### Adapter Setup inside a Worker

```javascript
export default {
  async fetch(request, env) {
    // env.DB is the D1 binding from wrangler.toml
    const adapter = createCloudflareD1Adapter(env.DB);
    const db = createDb({ adapter });
  }
};
```

### Collection with Schema

```javascript
const tasks = db.collection('tasks', {
  schema: {
    title: { type: 'string' },
    priority: { type: 'string' },
    done: { type: 'boolean' }
  }
});
```

## Next Steps

- Try the [Deno KV demo](../deno-kv-demo) for another edge storage option
- Explore the [NebulaDB docs](https://github.com/Nom-nom-hub/NebulaDB)
- Read the [Cloudflare D1 docs](https://developers.cloudflare.com/d1/)
