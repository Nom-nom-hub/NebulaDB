# NebulaDB PostgreSQL Adapter Example

This example demonstrates how to use NebulaDB with the PostgreSQL adapter.

## Prerequisites

- Node.js 18+
- PostgreSQL server (local or cloud)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure your PostgreSQL connection:

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
| PG_HOST | PostgreSQL server host | localhost |
| PG_PORT | PostgreSQL server port | 5432 |
| PG_USER | PostgreSQL username | postgres |
| PG_PASSWORD | PostgreSQL password | (empty) |
| PG_DATABASE | Database name | nebula_db_demo |

## Features Demonstrated

- Creating a database with PostgreSQL adapter
- Defining collections with schemas
- Inserting documents with arrays
- Querying with filters and comparisons
- Updating documents
- Deleting documents