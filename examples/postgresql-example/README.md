# NebulaDB PostgreSQL Adapter Example

This example demonstrates how to use NebulaDB with the PostgreSQL adapter for persistent, server-side relational storage.

## Features Demonstrated

- Creating a database with PostgreSQL adapter
- Defining collections with schemas
- Inserting documents with arrays
- Querying with filters (equality, comparison operators like `$gt`)
- Updating documents with `$set`
- Deleting documents

## Prerequisites

- Node.js 18+
- PostgreSQL server (local or cloud)

## Setup

### Option A — Local PostgreSQL

```bash
# macOS
brew install postgresql
brew services start postgresql
createdb nebula_db_demo
```

### Option B — Docker

```bash
docker run --name nebula-postgres \
  -e POSTGRES_DB=nebula_db_demo \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres
```

### Install Dependencies

```bash
cd examples/postgresql-example
npm install
```

## Configure Your Connection

```bash
export PG_HOST="localhost"
export PG_PORT="5432"
export PG_USER="postgres"
export PG_PASSWORD="yourpassword"
export PG_DATABASE="nebula_db_demo"
```

## Run

```bash
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PG_HOST` | PostgreSQL server host | `localhost` |
| `PG_PORT` | PostgreSQL server port | `5432` |
| `PG_USER` | PostgreSQL username | `postgres` |
| `PG_PASSWORD` | PostgreSQL password | (empty) |
| `PG_DATABASE` | Database name | `nebula_db_demo` |

## Code Explanation

### Adapter Setup

```javascript
import { createDatabase } from '@nebula-db/nebula-db';
import { PostgreSQLAdapter } from '@nebula-db/adapter-postgresql';

const adapter = new PostgreSQLAdapter({
  host: PG_HOST,
  port: parseInt(PG_PORT),
  user: PG_USER,
  password: PG_PASSWORD,
  database: PG_DATABASE
});

const db = createDatabase({ adapter, options: {} });
```

### Collection with Schema

```javascript
const orders = db.collection('orders', {
  schema: {
    id: { type: 'string', optional: true },
    customerName: { type: 'string' },
    total: { type: 'number' },
    status: { type: 'string' },
    items: { type: 'array' },
    createdAt: { type: 'date' }
  }
});
```

### Filtered Queries

```javascript
// Find orders by status
const completed = await orders.find({ status: 'completed' });

// Find high-value orders using comparison operators
const highValue = await orders.find({ total: { $gt: 100 } });
```

### Update Documents

```javascript
await orders.update(
  { customerName: 'John Doe' },
  { $set: { status: 'processing' } }
);
```

## Expected Output

```
=== NebulaDB PostgreSQL Adapter Demo ===
ℹ️  Connecting to PostgreSQL at localhost:5432
ℹ️  Database: nebula_db_demo
--------------------------------------------------

=== Creating Sample Orders ===
ℹ️  Inserting sample orders into PostgreSQL...
✅ Inserted: Order #abc123
✅ Inserted: Order #def456
✅ Inserted: Order #ghi789
✅ Inserted: Order #jkl012

=== Querying Orders ===
ℹ️  Finding all orders...
✅ Found 4 orders
ℹ️  Finding completed orders...
✅ Found 2 completed orders
ℹ️  Finding high-value orders (>$100)...
✅ Found 2 high-value orders

=== Updating Orders ===
ℹ️  Updating John Doe order to processing...
✅ Updated order

=== Deleting Orders ===
ℹ️  Deleting Alice Brown order...
✅ Order deleted
✅ 3 orders remaining
--------------------------------------------------
✅ PostgreSQL adapter demo completed successfully!
```

## Next Steps

- Try the [MongoDB example](../mongodb-example) for document-oriented storage
- Try the [Redis example](../redis-example) for cache-style storage
- Explore the [NebulaDB docs](https://github.com/Nom-nom-hub/NebulaDB)

---

*Documentation adapted from [@HirenGajjar](https://github.com/HirenGajjar)'s contribution ([PR #36](https://github.com/Nom-nom-hub/NebulaDB/pull/36)).*
