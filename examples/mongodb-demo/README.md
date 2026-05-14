# NebulaDB MongoDB Adapter Demo

This example demonstrates using NebulaDB with the MongoDB adapter for document-oriented persistent storage.

## Features Demonstrated

1. **MongoDB Connection** - Connecting via URI and database name
2. **CRUD Operations** - Insert, find, update, and delete documents
3. **Filtered Queries** - Query by multiple fields simultaneously
4. **Auto Collection Creation** - Collections are created automatically on first save
5. **Connection Cleanup** - Properly closing the client after use

## Requirements

- Node.js v18 or higher
- A running MongoDB instance (local or remote)

## Setup

### Option A — Local MongoDB

```bash
# macOS
brew install mongodb-community
brew services start mongodb-community
```

### Option B — Docker

```bash
docker run --name nebula-mongo \
  -p 27017:27017 \
  -d mongo
```

### Option C — MongoDB Atlas (Cloud)

Create a free cluster at https://www.mongodb.com/atlas and copy your connection string.

## Installation

```bash
cd examples/mongodb-demo
npm install
```

## Running the Demo

```bash
# Default: connects to mongodb://localhost:27017, database: nebuladb
npm start

# Custom connection
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net MONGODB_DB=mydb npm start
```

## Code Explanation

### Adapter Setup

```javascript
const adapter = createMongoDBAdapter({
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  database: process.env.MONGODB_DB || 'nebuladb'
});
const db = createDatabase({ adapter });
```

### Collection with Schema

```javascript
const products = db.collection('products', {
  schema: {
    name: { type: 'string' },
    category: { type: 'string' },
    price: { type: 'number' },
    inStock: { type: 'boolean' }
  }
});
```

### Filtered Query

```javascript
const available = await products.find({ category: 'Electronics', inStock: true });
```

### Always Close the Client

```javascript
await adapter.close();
```

## Expected Output

```
=== NebulaDB MongoDB Adapter Demo ===
ℹ️  Connecting to MongoDB and demonstrating CRUD operations
--------------------------------------------------

=== Inserting Data ===
✅ 3 products inserted

=== Querying All Records ===
✅ Found 3 products: [...]

=== Filtered Query ===
✅ Found 1 Electronics in stock: [...]

=== Updating Data ===
✅ Monitor updated: [...]

=== Deleting Data ===
✅ 2 products remaining
--------------------------------------------------
✅ All operations completed successfully!
```

## Next Steps

- Try the [PostgreSQL demo](../postgresql-demo) for relational storage
- Try the [Redis demo](../redis-demo) for cache-style storage
- Explore the [NebulaDB docs](https://github.com/Nom-nom-hub/NebulaDB)
