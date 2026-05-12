# NebulaDB Redis Adapter Example

This example demonstrates how to use NebulaDB with the Redis adapter.

## Prerequisites

- Node.js 18+
- Redis server (local or cloud)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure your Redis connection:

```bash
export REDIS_HOST="localhost"
export REDIS_PORT="6379"
export REDIS_PASSWORD="yourpassword"
```

## Run

```bash
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| REDIS_HOST | Redis server host | localhost |
| REDIS_PORT | Redis server port | 6379 |
| REDIS_PASSWORD | Redis password | (empty) |

## Features Demonstrated

- Creating a database with Redis adapter
- Defining collections with schemas
- Storing session data with metadata
- Querying sessions by user ID
- Updating session tokens
- Deleting sessions

## Use Cases

The Redis adapter is ideal for:
- Session storage
- Caching
- Rate limiting
- Real-time data