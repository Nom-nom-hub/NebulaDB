# Plugins Guide

NebulaDB's plugin system allows you to extend its functionality with custom behaviors. Plugins can intercept and modify database operations at various points in the lifecycle.

## Available Plugins

NebulaDB comes with several built-in plugins:

### Validation Plugin

The Validation Plugin uses [Zod](https://github.com/colinhacks/zod) to validate documents before they're inserted or updated.

```typescript
import { createDb } from '@nebula/core';
import { MemoryAdapter } from '@nebula/adapter-memory';
import { createValidationPlugin } from '@nebula/plugin-validation';
import { z } from 'zod';

// Define schemas for your collections
const userSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(50),
  email: z.string().email().optional(),
  age: z.number().int().positive().optional()
});

// Create the validation plugin
const validationPlugin = createValidationPlugin({
  schemas: {
    users: userSchema
  },
  strict: false // Set to true to require schemas for all collections
});

// Create a database with the validation plugin
const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [validationPlugin]
});

// This will validate against the schema
const users = db.collection('users');
await users.insert({ name: 'Alice', email: 'alice@example.com' }); // Valid
await users.insert({ name: 'B', email: 'not-an-email' }); // Error: Validation failed
```

### Encryption Plugin

The Encryption Plugin encrypts sensitive data before saving it and decrypts it when loading.

```typescript
import { createDb } from '@nebula/core';
import { MemoryAdapter } from '@nebula/adapter-memory';
import { createEncryptionPlugin } from '@nebula/plugin-encryption';

// Create the encryption plugin
const encryptionPlugin = createEncryptionPlugin({
  encryptionKey: 'your-secret-key',
  fields: {
    users: ['email', 'password', 'ssn'] // Fields to encrypt in the users collection
  },
  encryptAll: false // Set to true to encrypt all string fields except 'id'
});

// Create a database with the encryption plugin
const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [encryptionPlugin]
});

// The specified fields will be automatically encrypted/decrypted
const users = db.collection('users');
await users.insert({
  name: 'Alice',
  email: 'alice@example.com', // Will be encrypted
  password: 'secret123' // Will be encrypted
});
```

### Versioning Plugin

The Versioning Plugin tracks document versions and maintains a history of changes.

```typescript
import { createDb } from '@nebula/core';
import { MemoryAdapter } from '@nebula/adapter-memory';
import { createVersioningPlugin } from '@nebula/plugin-versioning';

// Create the versioning plugin
const versioningPlugin = createVersioningPlugin({
  versionField: '_version', // Field to store version number
  timestampField: '_updatedAt', // Field to store update timestamp
  historyCollectionSuffix: '_history', // Suffix for history collections
  maxVersions: 10 // Maximum number of versions to keep (0 = unlimited)
});

// Create a database with the versioning plugin
const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [versioningPlugin]
});

// Documents will automatically track versions
const users = db.collection('users');
const user = await users.insert({ name: 'Alice' }); // _version: 1
await users.update({ id: user.id }, { $set: { name: 'Alicia' } }); // _version: 2

// Access history
const userHistory = db.collection('users_history');
const versions = await userHistory.find({ _originalId: user.id });
console.log(versions); // All versions of the document
```

## Creating Custom Plugins

You can create your own plugins by implementing the `Plugin` interface:

```typescript
import { Plugin, Document, Query, UpdateOperation } from '@nebula/core';

// Create a logging plugin
const loggingPlugin: Plugin = {
  name: 'logging',
  
  onInit(db) {
    console.log('Database initialized');
  },
  
  onCollectionCreate(collection) {
    console.log(`Collection created: ${collection.name}`);
  },
  
  async onBeforeInsert(collection, doc) {
    console.log(`Inserting into ${collection}:`, doc);
    return doc;
  },
  
  onAfterInsert(collection, doc) {
    console.log(`Inserted into ${collection}:`, doc);
  },
  
  async onBeforeUpdate(collection, query, update) {
    console.log(`Updating in ${collection}:`, { query, update });
    return [query, update];
  },
  
  onAfterUpdate(collection, query, update, affectedDocs) {
    console.log(`Updated in ${collection}:`, { query, update, affectedDocs });
  },
  
  async onBeforeDelete(collection, query) {
    console.log(`Deleting from ${collection}:`, query);
    return query;
  },
  
  onAfterDelete(collection, query, deletedDocs) {
    console.log(`Deleted from ${collection}:`, { query, deletedDocs });
  },
  
  async onBeforeQuery(collection, query) {
    console.log(`Querying ${collection}:`, query);
    return query;
  },
  
  async onAfterQuery(collection, query, results) {
    console.log(`Query results from ${collection}:`, { query, count: results.length });
    return results;
  }
};

// Use your custom plugin
const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [loggingPlugin]
});
```

### Example: Timestamps Plugin

Here's an example of a custom plugin that adds creation and update timestamps to documents:

```typescript
import { Plugin, Document } from '@nebula/core';

export function createTimestampsPlugin(options = {}): Plugin {
  const {
    createdAtField = 'createdAt',
    updatedAtField = 'updatedAt'
  } = options;
  
  return {
    name: 'timestamps',
    
    async onBeforeInsert(collection, doc) {
      const now = new Date().toISOString();
      return {
        ...doc,
        [createdAtField]: now,
        [updatedAtField]: now
      };
    },
    
    async onBeforeUpdate(collection, query, update) {
      const now = new Date().toISOString();
      
      // Create or update the $set operation
      const newUpdate = { ...update };
      if (!newUpdate.$set) {
        newUpdate.$set = {};
      }
      
      newUpdate.$set[updatedAtField] = now;
      
      return [query, newUpdate];
    }
  };
}
```

## Combining Plugins

You can use multiple plugins together. The plugins are executed in the order they are provided:

```typescript
const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [
    createTimestampsPlugin(),
    createValidationPlugin({ schemas }),
    createEncryptionPlugin({ encryptionKey }),
    loggingPlugin
  ]
});
```

## Best Practices

### Plugin Order

The order of plugins matters. For example:

1. Put validation plugins early to reject invalid documents before processing
2. Put transformation plugins (like timestamps) before validation
3. Put encryption plugins after validation but before saving
4. Put logging plugins at the beginning or end depending on whether you want to log raw or processed data

### Error Handling

Plugins should handle errors gracefully and not break the application:

```typescript
async onBeforeInsert(collection, doc) {
  try {
    // Do something that might fail
    return processedDoc;
  } catch (error) {
    console.error('Plugin error:', error);
    // Return the original document to continue the operation
    return doc;
  }
}
```

### Performance Considerations

Be mindful of performance, especially in hooks that run frequently:

- Keep plugin operations lightweight
- Use async operations judiciously
- Consider caching results for expensive operations
