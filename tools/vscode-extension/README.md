# NebulaDB VS Code Extension

The official VS Code extension for NebulaDB - a TypeScript-first embedded database optimized for modern development.

## Features

This extension provides several features to enhance your development experience with NebulaDB:

### Code Snippets

Quickly insert common NebulaDB code patterns with these snippets:

- `ndb-create-db`: Create a new NebulaDB database instance
- `ndb-collection`: Create a new collection
- `ndb-insert`: Insert a document
- `ndb-find`: Find documents
- `ndb-update`: Update documents
- `ndb-delete`: Delete documents
- `ndb-reactive`: Create a reactive query
- `ndb-example`: Insert a complete NebulaDB usage example

### Commands

Access NebulaDB functionality through the Command Palette (Ctrl+Shift+P or Cmd+Shift+P):

- **NebulaDB: Create Configuration File** - Creates a `nebula.config.ts` file in your project
- **NebulaDB: Initialize Project** - Sets up a basic NebulaDB project structure
- **NebulaDB: Open Documentation** - Opens the NebulaDB documentation

### NebulaDB Explorer

View your database collections in the Explorer sidebar.

## Requirements

- Visual Studio Code 1.60.0 or higher
- Node.js 14.0.0 or higher

## Getting Started

1. Install the extension from the VS Code Marketplace
2. Open a TypeScript or JavaScript project
3. Run the "NebulaDB: Initialize Project" command to set up your project
4. Start using the snippets in your code files

## Using the Extension

### Creating a New NebulaDB Project

1. Open the Command Palette (Ctrl+Shift+P or Cmd+Shift+P)
2. Run "NebulaDB: Initialize Project"
3. This will create:
   - `nebula.config.ts` - Configuration file for your database
   - `db.ts` - Database initialization file

### Using Snippets

In any TypeScript or JavaScript file, type one of the snippet prefixes (e.g., `ndb-find`) and press Tab to insert the snippet.

## Release Notes

### 0.1.0

Initial release of the NebulaDB VS Code Extension with:
- Code snippets for common operations
- Project initialization commands
- Basic collection explorer

## About NebulaDB

NebulaDB is a TypeScript-first embedded database with:
- Reactive queries
- Plugin architecture
- Multiple storage adapters (Memory, IndexedDB, SQLite, Redis)
- Type-safe API

Visit the [NebulaDB GitHub repository](https://github.com/Nom-nom-hub/NebulaDB) for more information.
