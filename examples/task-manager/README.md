# NebulaDB Task Manager

A demo application showcasing the power of NebulaDB - a TypeScript-first embedded database with reactive queries.

## Features

This demo application demonstrates:

- **Reactive Queries**: UI automatically updates when data changes
- **Type Safety**: Full TypeScript integration with type checking
- **CRUD Operations**: Create, read, update, and delete tasks
- **Filtering & Searching**: Filter tasks by status, priority, and search terms
- **Real-time Statistics**: Task counts update automatically

## NebulaDB Features Showcased

- **Type-Safe Collections**: Strongly typed schema for tasks
- **Reactive Data**: Real-time UI updates with reactive queries
- **Query Operators**: Filtering with query operators
- **Indexing**: Optimized queries with indexes
- **Memory Adapter**: In-memory database (can be swapped for persistence)

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser to the URL shown in the terminal (usually http://localhost:5173)

## Project Structure

- `src/db/index.ts` - NebulaDB setup and configuration
- `src/components/` - React components for the UI
- `src/App.tsx` - Main application component with reactive queries

## How It Works

The application uses NebulaDB's reactive queries to automatically update the UI when data changes:

```typescript
// Set up reactive query for tasks
useEffect(() => {
  const subscription = tasks.findReactive({}).subscribe(results => {
    setAllTasks(results);
  });

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

This creates a subscription that will automatically update the component state whenever the tasks collection changes, without having to manually refetch data.

## Learn More

- [NebulaDB GitHub Repository](https://github.com/Nom-nom-hub/NebulaDB)
- [NebulaDB Documentation](https://nom-nom-hub.github.io/NebulaDB/)
