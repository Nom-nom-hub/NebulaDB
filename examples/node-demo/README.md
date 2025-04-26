# NebulaDB Node.js Demo

This is a Node.js application that demonstrates the core features of NebulaDB, a TypeScript-first embedded database with reactive queries.

## Features Demonstrated

This demo showcases:

1. **Database Creation** - Setting up a NebulaDB instance with a memory adapter
2. **Schema Definition** - Creating a collection with a defined schema
3. **CRUD Operations** - Insert, find, update, and delete operations
4. **Query Filtering** - Using query operators like `$contains`
5. **Error Handling** - Proper error handling for database operations

## Requirements

- Node.js v16 or higher
- npm or yarn

## Installation

```bash
# Clone the repository (if you haven't already)
git clone https://github.com/Nom-nom-hub/NebulaDB.git
cd NebulaDB/examples/node-demo

# Install dependencies
npm install
```

## Running the Demo

```bash
npm start
```

This will execute the demo script, which performs various operations with NebulaDB and logs the results to the console.

## Code Explanation

### Database Setup

```javascript
// Create a database with memory adapter
const db = createDatabase({
  adapter: new MemoryAdapter(),
  options: {}
});
```

### Collection Definition

```javascript
// Define the todos collection with schema
const todos = db.collection('todos', {
  schema: {
    id: { type: 'string', optional: true },
    title: { type: 'string' },
    completed: { type: 'boolean' },
    createdAt: { type: 'date' },
    tags: { type: 'array', optional: true }
  }
});
```

### Inserting Data

```javascript
await todos.insert({
  title: 'Learn NebulaDB',
  completed: false,
  createdAt: new Date(),
  tags: ['learning', 'database']
});
```

### Querying Data

```javascript
// Basic query
const allTodos = await todos.find();

// Query with filter
const incompleteTodos = await todos.find({ completed: false });

// Query with operator
const learningTodos = await todos.find({ tags: { $contains: 'learning' } });
```

### Updating Data

```javascript
await todos.update(
  { title: 'Learn NebulaDB' },
  { $set: { completed: true } }
);
```

### Deleting Data

```javascript
await todos.delete({ title: 'Build an app with NebulaDB' });
```

## Output

The demo produces colorful console output showing each operation and its result:

```
=== NebulaDB Node.js Demo ===
ℹ️ Demonstrating NebulaDB in a Node.js environment
--------------------------------------------------

=== Creating and Inserting Data ===
ℹ️ Inserting sample todos...
✅ Sample todos inserted successfully

=== Basic Queries ===
ℹ️ Finding all todos
✅ Found 2 todos:
[...]
```

## Next Steps

After running this demo, you might want to:

1. Explore the [NebulaDB documentation](https://github.com/Nom-nom-hub/NebulaDB)
2. Try using different adapters (like FilesystemAdapter for persistence)
3. Implement reactive queries in your own application
4. Build a more complex application with NebulaDB
