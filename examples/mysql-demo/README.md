# NebulaDB MySQL Adapter Demo

This example demonstrates using NebulaDB with the MySQL adapter for persistent, relational storage.

## Features Demonstrated

1. **MySQL Connection** - Connecting via host, port, user, password, and database options
2. **CRUD Operations** - Insert, find, update, and delete documents
3. **Filtered Queries** - Query by field values
4. **Auto Table Creation** - Tables are created automatically on first save
5. **Connection Cleanup** - Properly closing the connection pool after use

## Requirements

- Node.js v18 or higher
- A running MySQL instance (local or remote)

## Setup

### Option A — Local MySQL

```bash
# macOS
brew install mysql
brew services start mysql
mysql -u root -e "CREATE DATABASE IF NOT EXISTS nebuladb;"
```

### Option B — Docker

```bash
docker run --name nebula-mysql \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=nebuladb \
  -p 3306:3306 \
  -d mysql
```

## Installation

```bash
cd examples/mysql-demo
npm install
```

## Running the Demo

```bash
# Default: connects to localhost:3306, user: root, database: nebuladb
npm start

# Custom connection
MYSQL_HOST=localhost MYSQL_USER=myuser MYSQL_PASSWORD=mypass MYSQL_DB=mydb npm start
```

## Code Explanation

### Adapter Setup

```javascript
const adapter = createMySQLAdapter({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DB || 'nebuladb'
});
const db = createDatabase({ adapter });
```

### Collection with Schema

```javascript
const orders = db.collection('orders', {
  schema: {
    customer: { type: 'string' },
    product: { type: 'string' },
    quantity: { type: 'number' },
    fulfilled: { type: 'boolean' }
  }
});
```

### Filtered Query

```javascript
const pending = await orders.find({ fulfilled: false });
```

### Always Close the Pool

```javascript
await adapter.close();
```

## Expected Output

```
=== NebulaDB MySQL Adapter Demo ===
ℹ️  Connecting to MySQL and demonstrating CRUD operations
--------------------------------------------------

=== Inserting Data ===
✅ 3 orders inserted

=== Querying All Records ===
✅ Found 3 orders: [...]

=== Filtered Query ===
✅ Found 2 pending orders: [...]

=== Updating Data ===
✅ Order updated: [...]

=== Deleting Data ===
✅ 1 orders remaining
--------------------------------------------------
✅ All operations completed successfully!
```

## Next Steps

- Try the [PostgreSQL demo](../postgresql-demo) for another SQL option
- Try the [MongoDB demo](../mongodb-demo) for document-oriented storage
- Explore the [NebulaDB docs](https://github.com/Nom-nom-hub/NebulaDB)
