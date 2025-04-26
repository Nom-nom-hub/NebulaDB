# NebulaDB Web Demo

This is a bundled web demo that showcases NebulaDB's capabilities in a browser environment.

## Features

- **Task Management**: Create, read, update, and delete tasks with a clean user interface
- **Filtering & Searching**: Filter tasks by status, priority, and search terms
- **Real-time Updates**: The UI automatically updates when data changes
- **Database Operations Log**: See the database operations happening in real-time

## How to Run the Demo

1. Make sure you have Node.js installed
2. Build the project:
   ```bash
   npm run build
   ```
3. Serve the built files:
   ```bash
   cd dist
   python3 -m http.server 8085
   ```
4. Open your browser and navigate to http://localhost:8085

## How It Works

This demo uses webpack to bundle NebulaDB and its dependencies for use in the browser. The key components are:

1. **NebulaDB**: The core database library
2. **MemoryAdapter**: An in-memory storage adapter for NebulaDB
3. **Webpack**: Bundles the application for browser use

## Key Features Demonstrated

- **Database Creation**: Setting up a NebulaDB instance with a memory adapter
- **Schema Definition**: Creating a collection with a defined schema
- **CRUD Operations**: Insert, find, update, and delete operations
- **Query Filtering**: Using query operators for filtering data
- **UI Integration**: Integrating NebulaDB with a web UI

## Troubleshooting

If you encounter any issues:

1. Check the browser console for errors
2. Make sure all dependencies are installed (`npm install`)
3. Rebuild the project (`npm run build`)
4. Try a different port if 8085 is already in use

## Next Steps

After exploring this demo, you might want to:

1. Explore the [NebulaDB documentation](https://github.com/Nom-nom-hub/NebulaDB)
2. Try using different adapters (like IndexedDB for browser persistence)
3. Build your own application with NebulaDB
