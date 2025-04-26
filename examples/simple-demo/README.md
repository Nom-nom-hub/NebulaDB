# NebulaDB Simple Demo

This demo showcases the power and flexibility of NebulaDB, a TypeScript-first embedded database with reactive queries.

## Features Demonstrated

1. **Database Creation** - Setting up a NebulaDB instance with a memory adapter
2. **Schema Definition** - Creating strongly-typed collections with schemas
3. **Indexing** - Setting up indexes for optimized queries
4. **CRUD Operations** - Insert, find, update, and delete operations
5. **Complex Queries** - Using query operators like `$lt`, `$gt`, `$contains`
6. **Reactive Queries** - Real-time updates when data changes
7. **Performance** - Benchmarking insert and query operations

## Running the Demo

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the demo:
   ```bash
   npm start
   ```

## What to Expect

The demo will:

1. Create a database with users and posts collections
2. Insert sample data
3. Perform various queries to demonstrate NebulaDB's capabilities
4. Show how reactive queries work
5. Benchmark performance with bulk operations
6. Display final database statistics

## Key NebulaDB Features

- **Type Safety** - Collections are strongly typed
- **Flexible Schema** - Define the structure of your data
- **Indexing** - Optimize query performance
- **Reactive Queries** - Get real-time updates
- **Query Operators** - Powerful filtering capabilities
- **Performance** - Fast operations even with large datasets

## Output Example

```
🚀 NebulaDB Demo Starting...

Step 1: Inserting users...
  ✅ Inserted user: John Doe with ID: 1234abcd
  ✅ Inserted user: Jane Smith with ID: 5678efgh
  ...

Step 7: Demonstrating reactive queries...
  🔄 Setting up a reactive query for active users...
  🔄 Making a change to trigger the reactive query...
  🔔 REACTIVE UPDATE: Now there are 4 active users
  ✅ Reactive query demonstration complete

...

📊 Final Database Stats:
  - Total Users: 1005
  - Total Posts: 3
  - Active Users: 904
  - Inactive Users: 101
  - Users over 30: 510

🎉 NebulaDB Demo Completed Successfully!
```
