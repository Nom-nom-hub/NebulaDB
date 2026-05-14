# NebulaDB PostgreSQL Adapter Demo

This example demonstrates using NebulaDB with the PostgreSQL adapter for persistent, server-side storage.

## Features Demonstrated

1. **PostgreSQL Connection** - Connecting via connection string or `DATABASE_URL` env var
2. **CRUD Operations** - Insert, find, update, and delete documents
3. **Filtered Queries** - Query by multiple fields simultaneously
4. **Auto Table Creation** - Adapter creates tables automatically on first save
5. **Connection Cleanup** - Properly closing the connection pool after use

## Requirements

- Node.js v18 or higher
- A running PostgreSQL instance (local or remote)

## Setup

### Option A — Local PostgreSQL

```bash
# macOS
brew install postgresql
brew services start postgresql
createdb nebuladb
```

### Option B — Docker

```bash
docker run --name nebula-postgres \
  -e POSTGRES_DB=nebuladb \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres
```

## Installation

```bash
cd examples/postgresql-demo
npm install
```

## Running the Demo

```bash
# Default: connects to postgres://localhost:5432/nebuladb
npm start

# Custom connection
DATABASE_URL=postgres://user:password@localhost:5432/mydb npm start
```

## Code Explanation

### Adapter Setup

```javascript
const adapter = createPostgreSQLAdapter(
  process.env.DATABASE_URL || 'postgres://localhost:5432/nebuladb'
);
const db = createDatabase({ adapter });
```

### Collection with Schema

```javascript
const employees = db.collection('employees', {
  schema: {
    name: { type: 'string' },
    department: { type: 'string' },
    salary: { type: 'number' },
    active: { type: 'boolean' }
  }
});
```

### Filtered Query

```javascript
const engineers = await employees.find({ department: 'Engineering', active: true });
```

### Always Close the Pool

```javascript
await adapter.close();
```

## Expected Output

```
=== NebulaDB PostgreSQL Adapter Demo ===
ℹ️  Connecting to PostgreSQL and demonstrating CRUD operations
--------------------------------------------------

=== Inserting Data ===
✅ 3 employees inserted

=== Querying All Records ===
✅ Found 3 employees: [...]

=== Filtered Query ===
✅ Found 1 active engineers: [...]

=== Updating Data ===
✅ Bob updated: [...]

=== Deleting Data ===
✅ 2 employees remaining after deletion
--------------------------------------------------
✅ All operations completed successfully!
```

## Next Steps

- Try the [MongoDB demo](../mongodb-demo) for document-oriented storage
- Try the [Redis demo](../redis-demo) for cache-style storage
- Explore the [NebulaDB docs](https://github.com/Nom-nom-hub/NebulaDB)
