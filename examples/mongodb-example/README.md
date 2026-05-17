# NebulaDB MongoDB Adapter Example

This example demonstrates how to use NebulaDB with the MongoDB adapter for document-oriented persistent storage.

## Features Demonstrated

- Creating a database with MongoDB adapter
- Defining collections with schemas
- Inserting documents with arrays and nested data
- Querying with filters (equality, `$contains` for arrays)
- Updating documents with `$set`
- Deleting documents

## Prerequisites

- Node.js 18+
- MongoDB instance (local or cloud)

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

Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas) and copy your connection string.

### Install Dependencies

```bash
cd examples/mongodb-example
npm install
```

## Configure Your Connection

```bash
# Set your MongoDB connection string
export MONGO_URI="mongodb://localhost:27017"
export MONGO_DB="nebula_db_demo"
export MONGO_COLLECTION="products"

# Or use a MongoDB Atlas connection string
export MONGO_URI="mongodb+srv://username:password@cluster.mongodb.net/dbname"
```

## Run

```bash
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection URI | `mongodb://localhost:27017` |
| `MONGO_DB` | Database name | `nebula_db_demo` |
| `MONGO_COLLECTION` | Collection name | `products` |

## Code Explanation

### Adapter Setup

```javascript
import { createDatabase } from '@nebula-db/nebula-db';
import { MongoDBAdapter } from '@nebula-db/adapter-mongodb';

const adapter = new MongoDBAdapter({
  uri: MONGO_URI,
  database: DATABASE_NAME,
  collection: COLLECTION_NAME
});

const db = createDatabase({ adapter, options: {} });
```

### Collection with Schema

```javascript
const products = db.collection('products', {
  schema: {
    id: { type: 'string', optional: true },
    name: { type: 'string' },
    price: { type: 'number' },
    category: { type: 'string' },
    inStock: { type: 'boolean' },
    tags: { type: 'array', optional: true },
    createdAt: { type: 'date' }
  }
});
```

### Filtered Queries

```javascript
// Find by category
const electronics = await products.find({ category: 'Electronics' });

// Find items with a specific tag
const saleItems = await products.find({ tags: { $contains: 'sale' } });
```

### Update Documents

```javascript
await products.update(
  { name: 'LED Monitor' },
  { $set: { price: 349.99 } }
);
```

## Expected Output

```
=== NebulaDB MongoDB Adapter Demo ===
ℹ️  Connecting to MongoDB at: mongodb://localhost:27017
ℹ️  Database: nebula_db_demo
--------------------------------------------------

=== Creating Sample Products ===
ℹ️  Inserting sample products into MongoDB...
✅ Inserted: Laptop Pro
✅ Inserted: Wireless Mouse
✅ Inserted: Desk Chair
✅ Inserted: LED Monitor

=== Querying Products ===
ℹ️  Finding all products...
✅ Found 4 products
ℹ️  Finding electronics products...
✅ Found 3 electronics products
ℹ️  Finding products in stock...
✅ Found 3 products in stock
ℹ️  Finding products with "sale" tag...
✅ Found 1 sale items

=== Updating Products ===
ℹ️  Updating LED Monitor price...
✅ Updated product
ℹ️  Marking Desk Chair as in stock...
✅ Updated product

=== Deleting Products ===
ℹ️  Deleting Wireless Mouse...
✅ Product deleted
✅ 3 products remaining
--------------------------------------------------
✅ MongoDB adapter demo completed successfully!
```

## Next Steps

- Try the [PostgreSQL example](../postgresql-example) for relational storage
- Try the [Redis example](../redis-example) for cache-style storage
- Explore the [NebulaDB docs](https://github.com/Nom-nom-hub/NebulaDB)

---

*Documentation adapted from [@HirenGajjar](https://github.com/HirenGajjar)'s contribution ([PR #36](https://github.com/Nom-nom-hub/NebulaDB/pull/36)).*
