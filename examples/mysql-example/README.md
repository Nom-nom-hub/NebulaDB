# NebulaDB MySQL Adapter Example

This example demonstrates how to use NebulaDB with the MySQL adapter.

## Prerequisites

- Node.js 18+
- MySQL server (local or cloud)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure your MySQL connection:

```bash
# Set your MySQL connection details
export MYSQL_HOST="localhost"
export MYSQL_PORT="3306"
export MYSQL_USER="root"
export MYSQL_PASSWORD="yourpassword"
export MYSQL_DATABASE="nebula_db_demo"
```

## Run

```bash
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| MYSQL_HOST | MySQL server host | localhost |
| MYSQL_PORT | MySQL server port | 3306 |
| MYSQL_USER | MySQL username | root |
| MYSQL_PASSWORD | MySQL password | (empty) |
| MYSQL_DATABASE | Database name | nebula_db_demo |

## Features Demonstrated

- Creating a database with MySQL adapter
- Defining collections with schemas
- Inserting documents
- Querying with filters (equality, comparison)
- Updating documents
- Deleting documents