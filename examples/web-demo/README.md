# NebulaDB Web Demo

This is a simple web-based task manager application that demonstrates the power and flexibility of NebulaDB.

## Features

- **No Build Tools Required**: This demo uses NebulaDB directly from a CDN, so you can run it without any build tools or complex setup.
- **Task Management**: Create, read, update, and delete tasks with a clean user interface.
- **Filtering & Searching**: Filter tasks by status, priority, and search terms.
- **Real-time Updates**: The UI automatically updates when data changes.
- **Database Operations Log**: See the database operations happening in real-time.

## NebulaDB Features Showcased

- **In-Memory Database**: Uses NebulaDB's memory adapter for fast operations.
- **Schema Validation**: Ensures data integrity with a defined schema.
- **CRUD Operations**: Demonstrates all basic database operations.
- **Query Filtering**: Shows how to filter data with queries.
- **Error Handling**: Proper error handling for database operations.

## How to Run

Simply open the `index.html` file in a web browser. No server or build process is required!

```bash
# If you have Python installed, you can run a simple HTTP server
python -m http.server

# Then open http://localhost:8000 in your browser
```

## How It Works

1. The application loads NebulaDB from a CDN
2. It creates an in-memory database with a tasks collection
3. Sample tasks are added to demonstrate functionality
4. The UI allows you to interact with the database through a clean interface
5. All database operations are logged in real-time

## Key Code Snippets

### Creating the Database

```javascript
const db = NebulaDB.createDatabase({
  adapter: new NebulaDB.MemoryAdapter(),
  options: {}
});
```

### Defining a Collection with Schema

```javascript
const tasks = db.collection('tasks', {
  schema: {
    id: { type: 'string', optional: true },
    title: { type: 'string' },
    description: { type: 'string', optional: true },
    status: { type: 'string' },
    priority: { type: 'string' },
    tags: { type: 'array', optional: true },
    createdAt: { type: 'date' }
  }
});
```

### Querying Data

```javascript
// Build query based on filters
let query = {};
if (statusFilter !== 'all') {
  query.status = statusFilter;
}
if (priorityFilter !== 'all') {
  query.priority = priorityFilter;
}

// Execute query
tasks.find(query)
  .then(results => {
    // Process results
  });
```
