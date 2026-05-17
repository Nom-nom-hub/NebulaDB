# NebulaDB MySQL Adapter Example

This example demonstrates how to use NebulaDB with the MySQL adapter for persistent, relational storage.

## Features Demonstrated

- Creating a database with MySQL adapter
- Defining collections with schemas
- Inserting documents
- Querying with filters (equality, comparison operators like `$gt`)
- Updating documents with `$set`
- Deleting documents

## Prerequisites

- Node.js 18+
- MySQL server (local or cloud)

## Setup

### Option A — Local MySQL

```bash
# macOS
brew install mysql
brew services start mysql
mysql -u root -e "CREATE DATABASE IF NOT EXISTS nebula_db_demo;"
```

### Option B — Docker

```bash
docker run --name nebula-mysql \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=nebula_db_demo \
  -p 3306:3306 \
  -d mysql
```

### Install Dependencies

```bash
cd examples/mysql-example
npm install
```

## Configure Your Connection

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
| `MYSQL_HOST` | MySQL server host | `localhost` |
| `MYSQL_PORT` | MySQL server port | `3306` |
| `MYSQL_USER` | MySQL username | `root` |
| `MYSQL_PASSWORD` | MySQL password | (empty) |
| `MYSQL_DATABASE` | Database name | `nebula_db_demo` |

## Code Explanation

### Adapter Setup

```javascript
import { createDatabase } from '@nebula-db/nebula-db';
import { MySQLAdapter } from '@nebula-db/adapter-mysql';

const adapter = new MySQLAdapter({
  host: MYSQL_HOST,
  port: parseInt(MYSQL_PORT),
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE
});

const db = createDatabase({ adapter, options: {} });
```

### Collection with Schema

```javascript
const users = db.collection('users', {
  schema: {
    id: { type: 'string', optional: true },
    name: { type: 'string' },
    email: { type: 'string' },
    age: { type: 'number', optional: true },
    active: { type: 'boolean' },
    createdAt: { type: 'date' }
  }
});
```

### Filtered Queries

```javascript
// Find active users
const activeUsers = await users.find({ active: true });

// Find users over 25 using comparison operators
const olderUsers = await users.find({ age: { $gt: 25 } });
```

### Update Documents

```javascript
await users.update(
  { name: 'Charlie Brown' },
  { $set: { active: true } }
);
```

## Expected Output

```
=== NebulaDB MySQL Adapter Demo ===
ℹ️  Connecting to MySQL at localhost:3306
ℹ️  Database: nebula_db_demo
--------------------------------------------------

=== Creating Sample Users ===
ℹ️  Inserting sample users into MySQL...
✅ Inserted: Alice Johnson
✅ Inserted: Bob Smith
✅ Inserted: Charlie Brown
✅ Inserted: Diana Prince

=== Querying Users ===
ℹ️  Finding all users...
✅ Found 4 users
ℹ️  Finding active users...
✅ Found 3 active users
ℹ️  Finding users over 25...
✅ Found 3 users over 25

=== Updating Users ===
ℹ️  Updating Charlie Brown to active...
✅ Updated user

=== Deleting Users ===
ℹ️  Deleting Bob Smith...
✅ User deleted
✅ 3 users remaining
--------------------------------------------------
✅ MySQL adapter demo completed successfully!
```

## Next Steps

- Try the [PostgreSQL example](../postgresql-example) for another SQL option
- Try the [MongoDB example](../mongodb-example) for document-oriented storage
- Explore the [NebulaDB docs](https://github.com/Nom-nom-hub/NebulaDB)

---

*Documentation adapted from [@HirenGajjar](https://github.com/HirenGajjar)'s contribution ([PR #36](https://github.com/Nom-nom-hub/NebulaDB/pull/36)).*
