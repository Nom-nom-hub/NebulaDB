# NebulaDB MongoDB Adapter Example

This example demonstrates how to use NebulaDB with the MongoDB adapter.

## Prerequisites

- Node.js 18+
- MongoDB instance (local or cloud)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure your MongoDB connection:

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
| MONGO_URI | MongoDB connection URI | mongodb://localhost:27017 |
| MONGO_DB | Database name | nebula_db_demo |
| MONGO_COLLECTION | Collection name | products |

## Features Demonstrated

- Creating a database with MongoDB adapter
- Defining collections with schemas
- Inserting documents
- Querying with filters
- Updating documents
- Deleting documents