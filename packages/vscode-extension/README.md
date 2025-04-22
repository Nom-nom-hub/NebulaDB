# NebulaDB Tools for VS Code

This extension provides tools for working with NebulaDB in Visual Studio Code.

## Features

- **Schema Preview**: View and explore your NebulaDB schemas
- **Plugin Explorer**: Browse and manage NebulaDB plugins
- **DevTools Integration**: Open and interact with NebulaDB DevTools

## Schema Preview

The Schema Preview feature allows you to visualize your NebulaDB schemas directly in VS Code. It automatically detects collections, fields, and indexes in your code.

To open the Schema Preview:

1. Open a TypeScript or JavaScript file containing NebulaDB code
2. Right-click and select "NebulaDB: Show Schema Preview"
3. Or use the command palette (Ctrl+Shift+P) and search for "NebulaDB: Show Schema Preview"

## Plugin Explorer

The Plugin Explorer helps you manage and understand your NebulaDB plugins. It shows all installed plugins and their hooks.

To use the Plugin Explorer:

1. Click on the NebulaDB icon in the Activity Bar
2. Expand the "Plugins" view

## DevTools Integration

The DevTools integration allows you to open and interact with NebulaDB DevTools directly in VS Code.

To open DevTools:

1. Use the command palette (Ctrl+Shift+P) and search for "NebulaDB: Open DevTools"
2. Make sure the DevTools server is running (usually on port 3333)

## Configuration

You can configure the extension in your VS Code settings:

```json
{
  "nebulaDB.devtools.port": 3333,
  "nebulaDB.schemaPreview.enabled": true
}
```

## Requirements

- Visual Studio Code 1.60.0 or higher
- NebulaDB installed in your project

## Extension Settings

This extension contributes the following settings:

* `nebulaDB.devtools.port`: Port to use for NebulaDB DevTools (default: 3333)
* `nebulaDB.schemaPreview.enabled`: Enable schema preview (default: true)

## Known Issues

- Schema detection may not work with all code styles
- DevTools integration requires the DevTools server to be running

## Release Notes

### 0.1.0

Initial release of NebulaDB Tools for VS Code

## License

MIT
