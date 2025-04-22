# Adapters Guide

NebulaDB uses adapters to handle data persistence. This modular approach allows you to choose the storage mechanism that best fits your application's needs.

## Available Adapters

NebulaDB comes with several built-in adapters:

### Memory Adapter

The Memory Adapter stores data in memory only. Data is lost when the application restarts.

```typescript
import { createDb } from '@nebula/core';
import { MemoryAdapter } from '@nebula/adapter-memory';

const db = createDb({
  adapter: new MemoryAdapter()
});
```

**Use cases:**
- Testing and development
- Temporary data storage
- Applications where persistence isn't required
- In-memory caching

### LocalStorage Adapter

The LocalStorage Adapter persists data to the browser's localStorage.

```typescript
import { createDb } from '@nebula/core';
import { LocalStorageAdapter } from '@nebula/adapter-localstorage';

const db = createDb({
  adapter: new LocalStorageAdapter('my-app-data')
});
```

**Use cases:**
- Simple browser applications
- Offline-capable web apps
- Persisting user preferences
- Small to medium datasets (localStorage has size limitations)

### IndexedDB Adapter

The IndexedDB Adapter persists data to the browser's IndexedDB, which can handle larger datasets.

```typescript
import { createDb } from '@nebula/core';
import { IndexedDBAdapter } from '@nebula/adapter-indexeddb';

const db = createDb({
  adapter: new IndexedDBAdapter('my-app-db', 'collections', 1)
});
```

**Use cases:**
- Browser applications with larger data requirements
- Offline-first web applications
- Complex data structures
- Applications requiring better performance than localStorage

### FileSystem Adapter

The FileSystem Adapter persists data to the file system in Node.js environments.

```typescript
import { createDb } from '@nebula/core';
import { FileSystemAdapter } from '@nebula/adapter-filesystem';
import path from 'path';

const db = createDb({
  adapter: new FileSystemAdapter(path.join(__dirname, 'data.json'))
});
```

**Use cases:**
- Node.js applications
- Command-line tools
- Server-side applications
- Desktop applications with Electron

## Creating Custom Adapters

You can create your own adapters by implementing the `Adapter` interface:

```typescript
import { Adapter, Document } from '@nebula/core';

class CustomAdapter implements Adapter {
  async load(): Promise<Record<string, Document[]>> {
    // Load data from your storage mechanism
    // Return an object where keys are collection names and values are arrays of documents
    return {
      users: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' }
      ],
      posts: [
        { id: '1', title: 'Hello World' }
      ]
    };
  }

  async save(data: Record<string, Document[]>): Promise<void> {
    // Save data to your storage mechanism
    // 'data' is an object where keys are collection names and values are arrays of documents
    console.log('Saving data:', data);
  }
}

// Use your custom adapter
const db = createDb({
  adapter: new CustomAdapter()
});
```

### Example: Redis Adapter

Here's an example of a custom adapter that uses Redis for storage:

```typescript
import { Adapter, Document } from '@nebula/core';
import Redis from 'ioredis';

export class RedisAdapter implements Adapter {
  private redis: Redis;
  private key: string;

  constructor(redisOptions: Redis.RedisOptions = {}, key: string = 'nebula-db') {
    this.redis = new Redis(redisOptions);
    this.key = key;
  }

  async load(): Promise<Record<string, Document[]>> {
    try {
      const data = await this.redis.get(this.key);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Failed to load data from Redis:', error);
      return {};
    }
  }

  async save(data: Record<string, Document[]>): Promise<void> {
    try {
      await this.redis.set(this.key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save data to Redis:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
```

## Best Practices

### Choosing the Right Adapter

- **Browser applications**: Use `LocalStorageAdapter` for simple apps or `IndexedDBAdapter` for more complex ones
- **Node.js applications**: Use `FileSystemAdapter` or a custom adapter for your database
- **Testing**: Use `MemoryAdapter` for fast, isolated tests

### Error Handling

Always handle errors that might occur during loading or saving:

```typescript
try {
  await db.save();
  console.log('Data saved successfully');
} catch (error) {
  console.error('Failed to save data:', error);
  // Handle the error appropriately
}
```

### Adapter Lifecycle

Some adapters might need cleanup when your application shuts down:

```typescript
// Example with a custom adapter that has a close method
const customAdapter = new CustomAdapter();
const db = createDb({ adapter: customAdapter });

// When your application is shutting down
process.on('SIGINT', async () => {
  await db.save(); // Save any pending changes
  await customAdapter.close(); // Close connections
  process.exit(0);
});
```
