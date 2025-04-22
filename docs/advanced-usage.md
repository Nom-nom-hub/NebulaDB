# Advanced Usage Guide

This guide covers advanced usage patterns and techniques for NebulaDB.

## Optimizing Performance

### Indexing

NebulaDB now includes a powerful built-in indexing system with B-tree implementation for efficient queries:

```typescript
// Create a collection with indexes
const users = db.collection('users', {
  indexes: [
    // Single field indexes
    { name: 'email_idx', fields: ['email'], type: 'unique' },
    { name: 'age_idx', fields: ['age'], type: 'single' },

    // Compound index for queries that filter on both fields
    { name: 'name_age_idx', fields: ['name', 'age'], type: 'compound' },

    // Partial index for active users only
    {
      name: 'active_users_idx',
      fields: ['lastActive'],
      type: 'single',
      options: {
        partial: { filter: { active: true } }
      }
    },

    // Index with expiry (for TTL collections)
    {
      name: 'session_expiry_idx',
      fields: ['createdAt'],
      type: 'single',
      options: {
        expireAfterSeconds: 3600 // Expire after 1 hour
      }
    }
  ]
});

// Queries will automatically use the appropriate index
async function findUserByEmail(email) {
  // Uses email_idx automatically
  return await users.findOne({ email });
}

async function findUsersByAge(age) {
  // Uses age_idx automatically
  return await users.find({ age });
}

async function findUsersByNameAndAge(name, age) {
  // Uses name_age_idx automatically
  return await users.find({ name, age });
}

async function findActiveUsers() {
  // Uses active_users_idx automatically
  return await users.find({ active: true });
}
```

### Batch Operations

NebulaDB now includes built-in batch operations for better performance with large datasets:

```typescript
// Instead of this
for (const item of items) {
  await collection.insert(item);
}

// Or this
const promises = items.map(item => collection.insert(item));
await Promise.all(promises);

// Use the built-in batch operations
await collection.insertBatch(items);

// Batch updates
await collection.updateBatch(
  [{ id: '1' }, { id: '2' }, { id: '3' }],
  [{ $set: { processed: true } }, { $set: { processed: false } }, { $inc: { count: 1 } }]
);

// Batch deletes
await collection.deleteBatch([{ id: '1' }, { id: '2' }]);
```

### Selective Loading

If you have large collections, consider loading only what you need:

```typescript
// Custom adapter that loads collections on demand
class SelectiveAdapter extends FileSystemAdapter {
  private loadedCollections = new Set();

  async loadCollection(name) {
    // Load just one collection from disk
    const data = await super.load();
    return data[name] || [];
  }

  async load() {
    // Only load collections that have been accessed
    const data = {};
    for (const name of this.loadedCollections) {
      data[name] = await this.loadCollection(name);
    }
    return data;
  }

  markCollectionAccessed(name) {
    this.loadedCollections.add(name);
  }
}

// Usage
const adapter = new SelectiveAdapter('data.json');
const db = createDb({ adapter });

// Override collection method to track access
const originalCollection = db.collection;
db.collection = function(name, options) {
  adapter.markCollectionAccessed(name);
  return originalCollection.call(this, name, options);
};
```

## Working with Relationships

NebulaDB doesn't have built-in relationships, but you can implement them:

### One-to-Many Relationships

```typescript
// Define collections
const users = db.collection('users');
const posts = db.collection('posts');

// Create a user
const user = await users.insert({
  name: 'Alice',
  email: 'alice@example.com'
});

// Create posts with user reference
await posts.insert({
  title: 'First Post',
  content: 'Hello world!',
  userId: user.id // Reference to user
});

await posts.insert({
  title: 'Second Post',
  content: 'Another post',
  userId: user.id
});

// Query posts by user
const userPosts = await posts.find({ userId: user.id });
```

### Many-to-Many Relationships

```typescript
// Define collections
const users = db.collection('users');
const tags = db.collection('tags');
const userTags = db.collection('userTags'); // Junction table

// Create users and tags
const alice = await users.insert({ name: 'Alice' });
const bob = await users.insert({ name: 'Bob' });

const tagDev = await tags.insert({ name: 'developer' });
const tagAdmin = await tags.insert({ name: 'admin' });

// Create relationships
await userTags.insert({ userId: alice.id, tagId: tagDev.id });
await userTags.insert({ userId: alice.id, tagId: tagAdmin.id });
await userTags.insert({ userId: bob.id, tagId: tagDev.id });

// Query users with a specific tag
async function getUsersByTag(tagId) {
  const relationships = await userTags.find({ tagId });
  const userIds = relationships.map(rel => rel.userId);
  return await users.find({ id: { $in: userIds } });
}

// Query tags for a specific user
async function getTagsForUser(userId) {
  const relationships = await userTags.find({ userId });
  const tagIds = relationships.map(rel => rel.tagId);
  return await tags.find({ id: { $in: tagIds } });
}
```

## Transactions

NebulaDB doesn't have built-in transactions, but you can implement a simple version:

```typescript
async function transaction(operations) {
  // Save the current state
  const snapshot = {};
  for (const [collectionName, collection] of db.collections.entries()) {
    if (collection instanceof Collection) {
      snapshot[collectionName] = collection.getAll();
    }
  }

  try {
    // Execute operations
    const result = await operations();

    // Save changes
    await db.save();

    return result;
  } catch (error) {
    // Restore from snapshot on error
    for (const [collectionName, docs] of Object.entries(snapshot)) {
      const collection = db.collection(collectionName);
      if (collection instanceof Collection) {
        collection.setAll(docs);
      }
    }

    throw error;
  }
}

// Usage
await transaction(async () => {
  // All operations here will be rolled back if any fails
  await users.insert({ name: 'Alice' });
  await posts.insert({ title: 'Post', userId: 'invalid-id' }); // This will fail
});
```

## Migrations

For schema migrations, you can create a plugin:

```typescript
function createMigrationPlugin(migrations) {
  return {
    name: 'migration',

    async onInit(db) {
      // Get or create the migrations collection
      const migrationsCollection = db.collection('_migrations');

      // Get applied migrations
      const applied = await migrationsCollection.find();
      const appliedVersions = new Set(applied.map(m => m.version));

      // Sort migrations by version
      const pendingMigrations = migrations
        .filter(m => !appliedVersions.has(m.version))
        .sort((a, b) => a.version - b.version);

      // Apply pending migrations
      for (const migration of pendingMigrations) {
        console.log(`Applying migration: ${migration.name} (${migration.version})`);

        try {
          await migration.up(db);

          // Mark migration as applied
          await migrationsCollection.insert({
            id: `migration-${migration.version}`,
            version: migration.version,
            name: migration.name,
            appliedAt: new Date().toISOString()
          });

          console.log(`Migration applied: ${migration.name}`);
        } catch (error) {
          console.error(`Migration failed: ${migration.name}`, error);
          throw error;
        }
      }
    }
  };
}

// Usage
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

const db = createDb({
  adapter: new FileSystemAdapter('data.json'),
  plugins: [createMigrationPlugin(migrations)]
});
```

## Working with Large Datasets

NebulaDB includes several features for efficiently working with large datasets:

### Memory Management

```typescript
// Configure document compression for large documents
const db = createDb({
  adapter: new MemoryAdapter(),
  compression: {
    enabled: true,
    threshold: 1024,  // Compress documents larger than 1KB
    level: 6,         // Compression level (1-9)
    fields: ['content', 'description']  // Only compress these fields
  }
});

// Process documents in chunks to avoid memory issues
await users.processInChunks(async (docs) => {
  // Process each chunk of documents (default chunk size is 1000)
  for (const doc of docs) {
    // Process each document
    console.log(doc.name);
  }
  return docs;
}, 500); // Custom chunk size
```

### Pagination

```typescript
async function getPage(collection, query, page, pageSize) {
  // Get all matching documents - uses indexes automatically
  const allDocs = await collection.find(query);

  // Calculate start and end indices
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  // Return the page
  return allDocs.slice(start, end);
}

// Usage
const page1 = await getPage(users, { active: true }, 1, 10);
const page2 = await getPage(users, { active: true }, 2, 10);
```

### Streaming

For processing large datasets without loading everything into memory:

```typescript
async function* streamCollection(collection, query, batchSize = 100) {
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const batch = await getPage(collection, query, page, batchSize);

    if (batch.length === 0) {
      hasMore = false;
    } else {
      for (const doc of batch) {
        yield doc;
      }
      page++;
    }
  }
}

// Usage
async function processLargeCollection() {
  for await (const doc of streamCollection(users, { active: true })) {
    // Process each document one at a time
    console.log(doc.name);
  }
}
```

### Optimizing Memory Usage

```typescript
// Optimize memory usage
users.optimize(); // Compact memory structures and rebalance indexes

// Get memory usage statistics
const stats = db.getStats();
console.log(`Documents: ${stats.documentCount}`);
console.log(`Memory usage: ${stats.memoryUsage} bytes`);
```

## Encryption at Rest

For sensitive data, you can encrypt the entire database:

```typescript
import { createDb } from '@nebula/core';
import { FileSystemAdapter } from '@nebula/adapter-filesystem';
import crypto from 'crypto';

class EncryptedFileSystemAdapter extends FileSystemAdapter {
  private encryptionKey: Buffer;

  constructor(filePath: string, encryptionKey: string) {
    super(filePath);
    // Create a key from the password
    this.encryptionKey = crypto.scryptSync(encryptionKey, 'salt', 32);
  }

  private encrypt(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(data: string): string {
    const [ivHex, encryptedData] = data.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async save(data: Record<string, any[]>): Promise<void> {
    const jsonData = JSON.stringify(data);
    const encryptedData = this.encrypt(jsonData);
    await super.save({ data: encryptedData });
  }

  async load(): Promise<Record<string, any[]>> {
    try {
      const encryptedData = await super.load();
      if (!encryptedData.data) return {};

      const jsonData = this.decrypt(encryptedData.data);
      return JSON.parse(jsonData);
    } catch (error) {
      console.error('Failed to decrypt data:', error);
      return {};
    }
  }
}

// Usage
const db = createDb({
  adapter: new EncryptedFileSystemAdapter('data.json', 'your-secret-password')
});
```

## Custom Query Operators

You can extend NebulaDB with custom query operators:

```typescript
import { matchDocument } from '@nebula/core';

// Add a custom operator for text search
const originalMatchOperator = matchOperator;
function matchOperator(value, operator, operand) {
  if (operator === '$text') {
    if (typeof value !== 'string' || typeof operand !== 'string') {
      return false;
    }
    return value.toLowerCase().includes(operand.toLowerCase());
  }

  return originalMatchOperator(value, operator, operand);
}

// Replace the original function
// Note: This is a hack and would require modifying the source code
// A better approach would be to make the query engine extensible

// Usage
const results = await users.find({
  bio: { $text: 'developer' }
});
```
