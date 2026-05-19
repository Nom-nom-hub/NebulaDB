# NebulaDB Deno KV Adapter Demo

This example demonstrates using NebulaDB with the Deno KV adapter for persistent edge storage in the Deno runtime.

> **Note:** This example requires [Deno](https://deno.com/) and cannot be run with Node.js. Deno KV is a built-in key-value store available in Deno runtime and Deno Deploy.

## Features Demonstrated

1. **Deno KV Storage** - Using Deno's built-in key-value store for persistence
2. **CRUD Operations** - Insert, find, update, and delete documents
3. **Filtered Queries** - Query by field values
4. **TypeScript Native** - No compilation step needed, Deno runs TypeScript directly
5. **Connection Cleanup** - Properly closing the KV store after use

## Requirements

- [Deno](https://deno.com/) v1.38 or higher (for `--unstable-kv` support)

## Setup

### Install Deno

```bash
# macOS / Linux
curl -fsSL https://deno.land/install.sh | sh

# macOS with Homebrew
brew install deno

# Windows
irm https://deno.land/install.ps1 | iex
```

Verify installation:

```bash
deno --version
```

## Running the Demo

```bash
cd examples/deno-kv-demo
deno task start
```

Or directly:

```bash
deno run --unstable-kv main.ts
```

## Code Explanation

### Adapter Setup

```typescript
const adapter = createDenoKvAdapter();
const db = createDb({ adapter });
```

No connection string needed — Deno KV opens the default local store automatically.

### Collection with Schema

```typescript
const notes = db.collection('notes', {
  schema: {
    title: { type: 'string' },
    content: { type: 'string' },
    pinned: { type: 'boolean' },
  },
});
```

### Filtered Query

```typescript
const pinned = await notes.find({ pinned: true });
```

### Always Close the Store

```typescript
await adapter.close();
```

## How Deno KV Storage Works

Each document is stored as a separate KV entry with a structured key:

```
[prefix, collectionName, documentId] → JSON object
```

For example:

```
["nebula-db", "notes", "abc123"] → { title: "Welcome", pinned: true }
```

## Deno Deploy

This example also works on [Deno Deploy](https://deno.com/deploy) — Cloudflare's edge alternative. Deno KV is available natively in the cloud environment with zero config.

## Expected Output

```
=== NebulaDB Deno KV Adapter Demo ===
ℹ️  Using Deno KV for persistent edge storage
--------------------------------------------------

=== Inserting Data ===
✅ 3 notes inserted

=== Querying All Records ===
✅ Found 3 notes: [...]

=== Filtered Query ===
✅ Found 1 pinned notes: [...]

=== Updating Data ===
✅ Note updated: [...]

=== Deleting Data ===
✅ 2 notes remaining
--------------------------------------------------
✅ All operations completed successfully!
```

## Next Steps

- Try the [Cloudflare D1 demo](../cloudflare-d1-demo) for another edge storage option
- Deploy to [Deno Deploy](https://deno.com/deploy) for serverless edge hosting
- Explore the [NebulaDB docs](https://github.com/Nom-nom-hub/NebulaDB)
