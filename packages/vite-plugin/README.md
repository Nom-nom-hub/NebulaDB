# NebulaDB Vite Plugin

A Vite plugin that automatically injects a NebulaDB instance into your application.

## Installation

```bash
npm install @nebula/vite-plugin
```

## Usage

Add the plugin to your `vite.config.js` or `vite.config.ts` file:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import nebulaDBPlugin from '@nebula/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    nebulaDBPlugin({
      adapter: 'indexeddb',
      adapterOptions: {
        name: 'my-app-db'
      },
      plugins: [
        { name: 'validation' },
        { name: 'cache', options: { maxCacheSize: 100 } }
      ],
      collections: ['users', 'posts', 'comments'],
      devtools: true
    })
  ]
});
```

Then import the NebulaDB instance in your application:

```typescript
import db from 'virtual:nebula-db';

// Use the database
const users = db.collection('users');
await users.insert({ name: 'Alice' });
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `virtualModuleName` | `string` | `'virtual:nebula-db'` | The virtual module name to use for importing NebulaDB |
| `adapter` | `string` | `'memory'` | The adapter to use (`'memory'`, `'localstorage'`, `'indexeddb'`, `'filesystem'`, `'sqlite'`, `'redis'`) |
| `adapterOptions` | `object` | `{}` | Options for the adapter |
| `plugins` | `array` | `[]` | Plugins to use |
| `devtools` | `boolean` | `false` | Whether to enable DevTools |
| `devtoolsOptions` | `object` | `{}` | Options for DevTools |
| `collections` | `array` | `[]` | Collections to create |

### Adapter Options

#### LocalStorage Adapter

```typescript
{
  name: 'my-app-db' // Storage key prefix
}
```

#### IndexedDB Adapter

```typescript
{
  name: 'my-app-db', // Database name
  storeName: 'collections', // Object store name
  version: 1 // Database version
}
```

#### FileSystem Adapter

```typescript
{
  path: 'data.json' // File path
}
```

#### SQLite Adapter

```typescript
{
  path: 'data.sqlite' // Database file path
}
```

#### Redis Adapter

```typescript
{
  host: 'localhost',
  port: 6379,
  password: 'your-password'
}
```

### Plugin Options

Each plugin can have its own options:

```typescript
{
  plugins: [
    { 
      name: 'validation',
      options: {
        // Validation plugin options
      }
    },
    { 
      name: 'cache',
      options: {
        maxCacheSize: 100,
        ttl: 60000
      }
    }
  ]
}
```

### DevTools Options

```typescript
{
  devtools: true,
  devtoolsOptions: {
    port: 3333,
    autoOpen: true
  }
}
```

## DevTools

When DevTools are enabled, you can access them at `/__nebula-devtools` in your application.

You can also access the DevTools instance in your application:

```typescript
import db, { nebulaDevtools } from 'virtual:nebula-db';

// Close DevTools
nebulaDevtools.close();
```

## License

MIT
