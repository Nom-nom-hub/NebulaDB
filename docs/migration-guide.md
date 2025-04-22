# Migration Guide

This guide helps you migrate from other embedded databases to NebulaDB.

## Migrating from LokiJS

LokiJS is a document-oriented database similar to NebulaDB. Here's how to migrate:

### Concept Mapping

| LokiJS | NebulaDB | Notes |
|--------|----------|-------|
| `new Loki()` | `createDb()` | Database creation |
| `db.addCollection()` | `db.collection()` | Collection creation |
| `collection.insert()` | `collection.insert()` | Similar API |
| `collection.find()` | `collection.find()` | Similar query syntax |
| `collection.findOne()` | `collection.findOne()` | Similar API |
| `collection.update()` | `collection.update()` | NebulaDB uses MongoDB-style update operators |
| `collection.remove()` | `collection.delete()` | Different method name |
| `collection.chain()` | N/A | Use native JavaScript methods instead |
| `collection.ensureIndex()` | `collection.createIndex()` | Different API |
| `collection.observeChanges()` | `collection.subscribe()` | Different API |

### Example Migration

**LokiJS:**

```javascript
const loki = require('lokijs');
const db = new loki('example.db');

// Add a collection
const users = db.addCollection('users', { indices: ['email'] });

// Insert documents
users.insert({ name: 'Alice', email: 'alice@example.com', age: 30 });
users.insert({ name: 'Bob', email: 'bob@example.com', age: 25 });

// Query documents
const result = users.find({ age: { $gt: 25 } });

// Update a document
const alice = users.findOne({ name: 'Alice' });
alice.age = 31;
users.update(alice);

// Remove a document
users.remove(alice);

// Save the database
db.saveDatabase();
```

**NebulaDB:**

```javascript
import { createDb } from '@nebula/core';
import { FileSystemAdapter } from '@nebula/adapter-filesystem';

// Create a database
const db = createDb({
  adapter: new FileSystemAdapter('example.json')
});

// Create a collection
const users = db.collection('users');
users.createIndex({
  name: 'email_idx',
  fields: ['email'],
  type: 'unique'
});

// Insert documents
await users.insert({ name: 'Alice', email: 'alice@example.com', age: 30 });
await users.insert({ name: 'Bob', email: 'bob@example.com', age: 25 });

// Query documents
const result = await users.find({ age: { $gt: 25 } });

// Update a document
await users.update(
  { name: 'Alice' },
  { $set: { age: 31 } }
);

// Delete a document
await users.delete({ name: 'Alice' });

// Save the database
await db.save();
```

### Migration Script

Here's a script to help migrate data from LokiJS to NebulaDB:

```javascript
const loki = require('lokijs');
import { createDb } from '@nebula/core';
import { FileSystemAdapter } from '@nebula/adapter-filesystem';

async function migrateFromLokiJS(lokiPath, nebulaPath) {
  // Load LokiJS database
  const lokiDb = new loki(lokiPath);
  await new Promise(resolve => {
    lokiDb.loadDatabase({}, resolve);
  });
  
  // Create NebulaDB database
  const nebulaDb = createDb({
    adapter: new FileSystemAdapter(nebulaPath)
  });
  
  // Migrate each collection
  lokiDb.collections.forEach(async (lokiCollection) => {
    const collectionName = lokiCollection.name;
    const nebulaCollection = nebulaDb.collection(collectionName);
    
    // Create indexes
    if (lokiCollection.binaryIndices) {
      Object.keys(lokiCollection.binaryIndices).forEach(field => {
        nebulaCollection.createIndex({
          name: `${field}_idx`,
          fields: [field],
          type: 'single'
        });
      });
    }
    
    // Migrate documents
    const documents = lokiCollection.find();
    for (const doc of documents) {
      // Convert LokiJS document to NebulaDB document
      const { $loki, meta, ...data } = doc;
      await nebulaCollection.insert({
        ...data,
        id: $loki.toString(),
        createdAt: meta.created ? new Date(meta.created).toISOString() : undefined,
        updatedAt: meta.updated ? new Date(meta.updated).toISOString() : undefined
      });
    }
  });
  
  // Save the NebulaDB database
  await nebulaDb.save();
  
  console.log('Migration completed successfully!');
}

// Usage
migrateFromLokiJS('old-db.json', 'new-db.json');
```

## Migrating from PouchDB

PouchDB is a CouchDB-inspired database. Here's how to migrate:

### Concept Mapping

| PouchDB | NebulaDB | Notes |
|---------|----------|-------|
| `new PouchDB()` | `createDb()` | Database creation |
| Collections | Collections | PouchDB doesn't have collections, use document types |
| `db.put()` | `collection.insert()` | Different API |
| `db.get()` | `collection.findOne()` | Different API |
| `db.allDocs()` | `collection.find()` | Different API |
| `db.query()` | `collection.find()` | Different query syntax |
| `db.changes()` | `collection.subscribe()` | Different API |
| `db.replicate()` | N/A | No built-in replication in NebulaDB |
| `db.sync()` | N/A | No built-in sync in NebulaDB |

### Example Migration

**PouchDB:**

```javascript
const PouchDB = require('pouchdb');
const db = new PouchDB('example');

// Insert a document
db.put({
  _id: 'user:1',
  type: 'user',
  name: 'Alice',
  email: 'alice@example.com',
  age: 30
}).then(function (response) {
  // Handle response
});

// Get a document
db.get('user:1').then(function (doc) {
  console.log(doc);
});

// Query documents
db.allDocs({
  include_docs: true,
  startkey: 'user:',
  endkey: 'user:\ufff0'
}).then(function (result) {
  const users = result.rows.map(row => row.doc);
  console.log(users);
});

// Update a document
db.get('user:1').then(function (doc) {
  doc.age = 31;
  return db.put(doc);
});

// Delete a document
db.get('user:1').then(function (doc) {
  return db.remove(doc);
});
```

**NebulaDB:**

```javascript
import { createDb } from '@nebula/core';
import { IndexedDBAdapter } from '@nebula/adapter-indexeddb';

// Create a database
const db = createDb({
  adapter: new IndexedDBAdapter('example')
});

// Create collections for each document type
const users = db.collection('users');

// Insert a document
await users.insert({
  id: '1',
  name: 'Alice',
  email: 'alice@example.com',
  age: 30
});

// Get a document
const user = await users.findOne({ id: '1' });
console.log(user);

// Query documents
const allUsers = await users.find();
console.log(allUsers);

// Update a document
await users.update(
  { id: '1' },
  { $set: { age: 31 } }
);

// Delete a document
await users.delete({ id: '1' });
```

### Migration Script

Here's a script to help migrate data from PouchDB to NebulaDB:

```javascript
const PouchDB = require('pouchdb');
import { createDb } from '@nebula/core';
import { IndexedDBAdapter } from '@nebula/adapter-indexeddb';

async function migrateFromPouchDB(pouchDbName, nebulaDbName) {
  // Open PouchDB database
  const pouchDb = new PouchDB(pouchDbName);
  
  // Create NebulaDB database
  const nebulaDb = createDb({
    adapter: new IndexedDBAdapter(nebulaDbName)
  });
  
  // Get all documents from PouchDB
  const result = await pouchDb.allDocs({ include_docs: true });
  
  // Group documents by type
  const docsByType = {};
  
  for (const row of result.rows) {
    const doc = row.doc;
    
    // Skip design documents
    if (doc._id.startsWith('_design/')) continue;
    
    // Extract type from _id or use a default type
    let type = 'documents';
    if (doc.type) {
      type = doc.type;
    } else if (doc._id.includes(':')) {
      type = doc._id.split(':')[0];
    }
    
    if (!docsByType[type]) {
      docsByType[type] = [];
    }
    
    // Convert PouchDB document to NebulaDB document
    const { _id, _rev, type: docType, ...data } = doc;
    
    docsByType[type].push({
      id: _id.includes(':') ? _id.split(':')[1] : _id,
      ...data
    });
  }
  
  // Insert documents into NebulaDB collections
  for (const [type, docs] of Object.entries(docsByType)) {
    const collection = nebulaDb.collection(type);
    
    for (const doc of docs) {
      await collection.insert(doc);
    }
    
    console.log(`Migrated ${docs.length} documents to ${type} collection`);
  }
  
  // Save the NebulaDB database
  await nebulaDb.save();
  
  console.log('Migration completed successfully!');
}

// Usage
migrateFromPouchDB('old-db', 'new-db');
```

## Migrating from Lowdb

Lowdb is a small JSON database. Here's how to migrate:

### Concept Mapping

| Lowdb | NebulaDB | Notes |
|-------|----------|-------|
| `new Low()` | `createDb()` | Database creation |
| `db.data.users` | `db.collection('users')` | Collection access |
| `db.data.users.push()` | `collection.insert()` | Different API |
| `db.data.users.find()` | `collection.findOne()` | Different API |
| `db.data.users.filter()` | `collection.find()` | Different API |
| `db.write()` | `db.save()` | Similar API |
| N/A | `collection.subscribe()` | Lowdb doesn't have reactivity |

### Example Migration

**Lowdb:**

```javascript
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

// Create database
const adapter = new JSONFile('db.json');
const db = new Low(adapter);

// Read data
await db.read();

// Set default data
db.data ||= { users: [] };

// Add a user
db.data.users.push({
  id: '1',
  name: 'Alice',
  email: 'alice@example.com'
});

// Find a user
const user = db.data.users.find(u => u.id === '1');

// Update a user
const userIndex = db.data.users.findIndex(u => u.id === '1');
if (userIndex !== -1) {
  db.data.users[userIndex].name = 'Alicia';
}

// Remove a user
db.data.users = db.data.users.filter(u => u.id !== '1');

// Write data
await db.write();
```

**NebulaDB:**

```javascript
import { createDb } from '@nebula/core';
import { FileSystemAdapter } from '@nebula/adapter-filesystem';

// Create database
const db = createDb({
  adapter: new FileSystemAdapter('db.json')
});

// Create a collection
const users = db.collection('users');

// Add a user
await users.insert({
  id: '1',
  name: 'Alice',
  email: 'alice@example.com'
});

// Find a user
const user = await users.findOne({ id: '1' });

// Update a user
await users.update(
  { id: '1' },
  { $set: { name: 'Alicia' } }
);

// Remove a user
await users.delete({ id: '1' });

// Save the database
await db.save();
```

### Migration Script

Here's a script to help migrate data from Lowdb to NebulaDB:

```javascript
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
import { createDb } from '@nebula/core';
import { FileSystemAdapter } from '@nebula/adapter-filesystem';

async function migrateFromLowdb(lowdbPath, nebulaPath) {
  // Open Lowdb database
  const adapter = new JSONFile(lowdbPath);
  const lowDb = new Low(adapter);
  await lowDb.read();
  
  // Create NebulaDB database
  const nebulaDb = createDb({
    adapter: new FileSystemAdapter(nebulaPath)
  });
  
  // Migrate each collection
  for (const [collectionName, documents] of Object.entries(lowDb.data)) {
    if (!Array.isArray(documents)) continue;
    
    const collection = nebulaDb.collection(collectionName);
    
    // Insert documents
    for (const doc of documents) {
      // Ensure document has an id
      if (!doc.id) {
        doc.id = Math.random().toString(36).substr(2, 9);
      }
      
      await collection.insert(doc);
    }
    
    console.log(`Migrated ${documents.length} documents to ${collectionName} collection`);
  }
  
  // Save the NebulaDB database
  await nebulaDb.save();
  
  console.log('Migration completed successfully!');
}

// Usage
migrateFromLowdb('old-db.json', 'new-db.json');
```

## General Migration Tips

Regardless of which database you're migrating from, consider these tips:

1. **Plan Your Data Model**: Review your current data model and consider if any changes would be beneficial
2. **Migrate in Phases**: For large datasets, migrate one collection at a time
3. **Test Thoroughly**: Test your migration process with a subset of data first
4. **Validate Data**: Verify that all data was migrated correctly
5. **Update Queries**: Adapt your queries to NebulaDB's syntax
6. **Consider Indexing**: Add appropriate indexes for your common queries
7. **Update Application Code**: Update your application code to use NebulaDB's API
8. **Run in Parallel**: Consider running both databases in parallel during the transition

## Conclusion

Migrating to NebulaDB from another database requires some effort, but the benefits of NebulaDB's reactive queries, TypeScript integration, and modular architecture make it worthwhile. Use the provided migration scripts as a starting point and adapt them to your specific needs.
