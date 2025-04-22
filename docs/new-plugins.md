# New Plugins Guide

This guide covers the additional plugins available for NebulaDB.

## Cache Plugin

The Cache Plugin improves query performance by caching query results.

### Installation

```bash
npm install @nebula/plugin-cache
```

### Usage

```typescript
import { createDb } from '@nebula/core';
import { MemoryAdapter } from '@nebula/adapter-memory';
import { createCachePlugin } from '@nebula/plugin-cache';

// Create the cache plugin
const cachePlugin = createCachePlugin({
  maxCacheSize: 100, // Maximum number of cached queries per collection
  ttl: 60000, // Cache TTL in milliseconds (1 minute)
  excludeCollections: ['logs'], // Collections to exclude from caching
  cacheEmptyResults: true // Whether to cache empty results
});

// Create a database with the cache plugin
const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [cachePlugin]
});

// Use the database normally - queries will be automatically cached
const users = db.collection('users');
const result1 = await users.find({ age: { $gt: 30 } }); // This query is executed
const result2 = await users.find({ age: { $gt: 30 } }); // This query uses the cache
```

### How It Works

1. When a query is executed, the plugin checks if the same query has been cached
2. If a cache hit occurs, the cached results are returned without executing the query
3. If a cache miss occurs, the query is executed and the results are cached
4. When data in a collection changes (insert, update, delete), the cache for that collection is invalidated
5. Cache entries expire after the configured TTL

### Benefits

- **Improved Performance**: Frequently executed queries return results faster
- **Reduced Load**: Less processing required for repeated queries
- **Configurable**: Customize caching behavior per your application's needs

### Considerations

- **Memory Usage**: Caching consumes additional memory
- **Stale Data**: If TTL is too high, cached results might become stale
- **Write-Heavy Workloads**: Less beneficial for write-heavy workloads

## Logger Plugin

The Logger Plugin provides detailed logging of database operations.

### Installation

```bash
npm install @nebula/plugin-logger
```

### Usage

```typescript
import { createDb } from '@nebula/core';
import { MemoryAdapter } from '@nebula/adapter-memory';
import { createLoggerPlugin, LogLevel } from '@nebula/plugin-logger';

// Create the logger plugin
const loggerPlugin = createLoggerPlugin({
  level: LogLevel.DEBUG, // Minimum log level
  logQueryParams: true, // Log query parameters
  logDocuments: false, // Don't log document contents
  logPerformance: true // Log performance metrics
});

// Create a database with the logger plugin
const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [loggerPlugin]
});

// Use the database - operations will be logged
const users = db.collection('users');
await users.insert({ name: 'Alice', age: 30 });
// [NebulaDB] Inserted document into users with ID: 1234-5678-90ab-cdef

await users.find({ age: { $gt: 25 } });
// [NebulaDB] Query operation on users took 1.23ms
```

### Custom Logger

You can provide a custom logger implementation:

```typescript
import { createLoggerPlugin, Logger } from '@nebula/plugin-logger';

// Create a custom logger
class MyCustomLogger implements Logger {
  debug(message: string, ...args: any[]): void {
    // Custom debug implementation
  }
  
  info(message: string, ...args: any[]): void {
    // Custom info implementation
  }
  
  warn(message: string, ...args: any[]): void {
    // Custom warn implementation
  }
  
  error(message: string, ...args: any[]): void {
    // Custom error implementation
  }
}

// Use the custom logger
const loggerPlugin = createLoggerPlugin({
  logger: new MyCustomLogger()
});
```

### Log Levels

- **DEBUG**: Detailed information for debugging
- **INFO**: General information about operations
- **WARN**: Warnings that don't prevent operation
- **ERROR**: Errors that might prevent operation

## Migration Plugin

The Migration Plugin helps manage schema changes and data migrations.

### Installation

```bash
npm install @nebula/plugin-migration
```

### Usage

```typescript
import { createDb } from '@nebula/core';
import { FileSystemAdapter } from '@nebula/adapter-filesystem';
import { createMigrationPlugin } from '@nebula/plugin-migration';

// Define migrations
const migrations = [
  {
    version: 1,
    name: 'Add email to users',
    async up(db) {
      const users = db.collection('users');
      const allUsers = await users.find();
      
      for (const user of allUsers) {
        if (!user.email) {
          await users.update(
            { id: user.id },
            { $set: { email: `${user.name.toLowerCase()}@example.com` } }
          );
        }
      }
    },
    async down(db) {
      const users = db.collection('users');
      await users.update(
        {},
        { $unset: { email: true } }
      );
    }
  },
  {
    version: 2,
    name: 'Add createdAt to posts',
    async up(db) {
      const posts = db.collection('posts');
      const allPosts = await posts.find();
      
      for (const post of allPosts) {
        if (!post.createdAt) {
          await posts.update(
            { id: post.id },
            { $set: { createdAt: new Date().toISOString() } }
          );
        }
      }
    }
  }
];

// Create the migration plugin
const migrationPlugin = createMigrationPlugin({
  migrations,
  migrationCollection: '_migrations', // Collection to store migration history
  autoApply: true, // Apply migrations automatically on startup
  throwOnError: true, // Throw an error if a migration fails
  logger: console.log // Custom logger function
});

// Create a database with the migration plugin
const db = createDb({
  adapter: new FileSystemAdapter('data.json'),
  plugins: [migrationPlugin]
});

// Migrations will be applied automatically on startup
// You can also apply or revert migrations manually:

// Apply pending migrations
await migrationPlugin.applyMigrations();

// Revert all migrations
await migrationPlugin.revertMigrations();

// Revert to a specific version
await migrationPlugin.revertMigrations(1); // Revert to version 1
```

### Migration Structure

Each migration should have:

- **version**: A unique number identifying the migration
- **name**: A descriptive name
- **up**: Function to apply the migration
- **down** (optional): Function to revert the migration

### Benefits

- **Versioned Changes**: Track and apply changes in order
- **Reversible**: Revert changes if needed
- **Automated**: Apply migrations automatically on startup
- **Tracked**: Keep a history of applied migrations
