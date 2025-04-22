# New Adapters Guide

This guide covers the additional storage adapters available for NebulaDB.

## SQLite Adapter

The SQLite Adapter persists data to a SQLite database file, providing a robust storage solution for Node.js applications.

### Installation

```bash
npm install @nebula/adapter-sqlite
```

### Usage

```typescript
import { createDb } from '@nebula/core';
import { SQLiteAdapter } from '@nebula/adapter-sqlite';
import path from 'path';

// Create a database with SQLite adapter
const db = createDb({
  adapter: new SQLiteAdapter(path.join(__dirname, 'data.sqlite'))
});

// Use the database normally
const users = db.collection('users');
await users.insert({ name: 'Alice', age: 30 });
```

### Options

The SQLite adapter accepts the following options:

```typescript
// With options
const adapter = new SQLiteAdapter(
  'data.sqlite', // Database file path
  {
    readonly: false, // Open database in read-only mode
    fileMustExist: false, // Throw error if database doesn't exist
    timeout: 5000, // Timeout for acquiring a database lock (ms)
    verbose: console.log // Function for SQLite's verbose mode
  }
);
```

### Benefits

- **Persistent Storage**: Data is stored in a SQLite database file
- **Transactional**: All operations are wrapped in transactions
- **Reliable**: SQLite is known for its reliability and durability
- **Portable**: SQLite database files can be easily backed up or moved

### Considerations

- **Node.js Only**: This adapter only works in Node.js environments
- **Performance**: For very large datasets, consider using a dedicated database
- **Concurrency**: SQLite has limitations with concurrent write operations

## Redis Adapter

The Redis Adapter persists data to a Redis server, providing a fast and scalable storage solution.

### Installation

```bash
npm install @nebula/adapter-redis
```

### Usage

```typescript
import { createDb } from '@nebula/core';
import { RedisAdapter } from '@nebula/adapter-redis';

// Create a database with Redis adapter
const db = createDb({
  adapter: new RedisAdapter(
    {
      host: 'localhost',
      port: 6379,
      password: 'your-password'
    },
    'nebula:' // Key prefix
  )
});

// Use the database normally
const users = db.collection('users');
await users.insert({ name: 'Alice', age: 30 });

// Don't forget to close the connection when done
await db.adapter.close();
```

### Redis Connection Options

The Redis adapter accepts all options supported by ioredis:

```typescript
// With more options
const adapter = new RedisAdapter({
  host: 'redis-server',
  port: 6379,
  password: 'your-password',
  db: 0, // Redis database index
  keyPrefix: 'app:', // Key prefix for all Redis keys
  retryStrategy: (times) => Math.min(times * 50, 2000), // Retry strategy
  connectTimeout: 10000, // Connection timeout
  maxRetriesPerRequest: 3 // Max retries per request
});
```

### Benefits

- **Speed**: Redis is an in-memory database with excellent performance
- **Scalability**: Can handle large datasets and high throughput
- **Persistence**: Redis offers various persistence options
- **Distributed**: Can be used in a distributed environment

### Considerations

- **Memory Usage**: Redis keeps all data in memory
- **External Dependency**: Requires a Redis server
- **Network Latency**: Performance depends on network conditions
- **Connection Management**: Need to manage Redis connections

## Comparing Adapters

| Feature | Memory | LocalStorage | IndexedDB | FileSystem | SQLite | Redis |
|---------|--------|--------------|-----------|------------|--------|-------|
| Persistence | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Browser Support | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Node.js Support | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Edge Support | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Transaction Support | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Scalability | Low | Low | Medium | Medium | Medium | High |
| Speed | Very Fast | Fast | Medium | Medium | Fast | Very Fast |
| Size Limit | Memory | ~5MB | Large | Disk | Disk | Memory |
| External Dependencies | None | None | None | None | None | Redis Server |

## Choosing the Right Adapter

- **Memory Adapter**: For testing, temporary data, or in-memory caching
- **LocalStorage Adapter**: For simple browser applications with small datasets
- **IndexedDB Adapter**: For browser applications with larger datasets
- **FileSystem Adapter**: For simple Node.js applications
- **SQLite Adapter**: For Node.js applications requiring reliable storage
- **Redis Adapter**: For applications requiring high performance and scalability

## Creating Custom Adapters

You can create your own adapters by implementing the `Adapter` interface:

```typescript
import { Adapter, Document } from '@nebula/core';

class CustomAdapter implements Adapter {
  async load(): Promise<Record<string, Document[]>> {
    // Load data from your storage mechanism
    // Return an object where keys are collection names and values are arrays of documents
  }

  async save(data: Record<string, Document[]>): Promise<void> {
    // Save data to your storage mechanism
    // 'data' is an object where keys are collection names and values are arrays of documents
  }
}
```

### Example: MongoDB Adapter

```typescript
import { Adapter, Document } from '@nebula/core';
import { MongoClient, Db } from 'mongodb';

export class MongoDBAdapter implements Adapter {
  private client: MongoClient;
  private db: Db | null = null;
  private dbName: string;
  
  constructor(uri: string, dbName: string) {
    this.client = new MongoClient(uri);
    this.dbName = dbName;
  }
  
  private async connect(): Promise<Db> {
    if (!this.db) {
      await this.client.connect();
      this.db = this.client.db(this.dbName);
    }
    return this.db;
  }
  
  async load(): Promise<Record<string, Document[]>> {
    const db = await this.connect();
    const result: Record<string, Document[]> = {};
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    
    // For each collection, get all documents
    for (const collection of collections) {
      const collectionName = collection.name;
      if (collectionName.startsWith('system.')) continue;
      
      const docs = await db.collection(collectionName).find().toArray();
      result[collectionName] = docs.map(doc => {
        const { _id, ...rest } = doc;
        return { id: _id.toString(), ...rest };
      });
    }
    
    return result;
  }
  
  async save(data: Record<string, Document[]>): Promise<void> {
    const db = await this.connect();
    
    // For each collection
    for (const [collectionName, documents] of Object.entries(data)) {
      const collection = db.collection(collectionName);
      
      // Clear existing data
      await collection.deleteMany({});
      
      // Insert new documents
      if (documents.length > 0) {
        await collection.insertMany(documents);
      }
    }
  }
  
  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }
}
```
