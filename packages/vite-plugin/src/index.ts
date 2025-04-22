import { Plugin } from 'vite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Options for the NebulaDB Vite plugin
 */
export interface NebulaDBPluginOptions {
  /**
   * The virtual module name to use for importing NebulaDB
   * @default 'virtual:nebula-db'
   */
  virtualModuleName?: string;
  
  /**
   * The adapter to use
   * @default 'memory'
   */
  adapter?: 'memory' | 'localstorage' | 'indexeddb' | 'filesystem' | 'sqlite' | 'redis';
  
  /**
   * Adapter options
   */
  adapterOptions?: Record<string, any>;
  
  /**
   * Plugins to use
   */
  plugins?: Array<{
    name: string;
    options?: Record<string, any>;
  }>;
  
  /**
   * Whether to enable DevTools
   * @default false
   */
  devtools?: boolean;
  
  /**
   * DevTools options
   */
  devtoolsOptions?: {
    port?: number;
    autoOpen?: boolean;
  };
  
  /**
   * Collections to create
   */
  collections?: string[];
}

/**
 * Create a Vite plugin for NebulaDB
 */
export default function nebulaDBPlugin(options: NebulaDBPluginOptions = {}): Plugin {
  const {
    virtualModuleName = 'virtual:nebula-db',
    adapter = 'memory',
    adapterOptions = {},
    plugins = [],
    devtools = false,
    devtoolsOptions = {},
    collections = []
  } = options;
  
  const resolvedVirtualModuleName = `\0${virtualModuleName}`;
  
  return {
    name: 'vite-plugin-nebula-db',
    
    resolveId(id) {
      if (id === virtualModuleName) {
        return resolvedVirtualModuleName;
      }
      return null;
    },
    
    load(id) {
      if (id === resolvedVirtualModuleName) {
        // Generate the virtual module code
        return generateVirtualModule(adapter, adapterOptions, plugins, devtools, devtoolsOptions, collections);
      }
      return null;
    },
    
    configureServer(server) {
      // Add middleware for DevTools if enabled
      if (devtools) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/__nebula-devtools')) {
            // Serve DevTools UI
            const devtoolsPath = resolve(__dirname, '../node_modules/@nebula/devtools/dist/index.html');
            try {
              const html = readFileSync(devtoolsPath, 'utf-8');
              res.setHeader('Content-Type', 'text/html');
              res.end(html);
            } catch (error) {
              console.error('Failed to serve NebulaDB DevTools:', error);
              res.statusCode = 500;
              res.end('Failed to serve NebulaDB DevTools');
            }
            return;
          }
          next();
        });
      }
    }
  };
}

/**
 * Generate the virtual module code
 */
function generateVirtualModule(
  adapter: string,
  adapterOptions: Record<string, any>,
  plugins: Array<{ name: string; options?: Record<string, any> }>,
  devtools: boolean,
  devtoolsOptions: Record<string, any>,
  collections: string[]
): string {
  // Import statements
  let code = `
    import { createDb } from '@nebula/core';
  `;
  
  // Import adapter
  switch (adapter) {
    case 'memory':
      code += `import { MemoryAdapter } from '@nebula/core';\n`;
      break;
    case 'localstorage':
    case 'indexeddb':
    case 'filesystem':
    case 'sqlite':
    case 'redis':
      code += `import { ${adapter.charAt(0).toUpperCase() + adapter.slice(1)}Adapter } from '@nebula/adapter-${adapter}';\n`;
      break;
  }
  
  // Import plugins
  plugins.forEach(plugin => {
    code += `import { create${plugin.name.charAt(0).toUpperCase() + plugin.name.slice(1)}Plugin } from '@nebula/plugin-${plugin.name}';\n`;
  });
  
  // Import DevTools if enabled
  if (devtools) {
    code += `import { initDevtools } from '@nebula/devtools';\n`;
  }
  
  // Create adapter instance
  code += `\n// Create adapter instance\n`;
  switch (adapter) {
    case 'memory':
      code += `const adapter = new MemoryAdapter();\n`;
      break;
    case 'localstorage':
      code += `const adapter = new LocalStorageAdapter(${JSON.stringify(adapterOptions.name || 'nebula-db')});\n`;
      break;
    case 'indexeddb':
      code += `const adapter = new IndexedDBAdapter(
        ${JSON.stringify(adapterOptions.name || 'nebula-db')},
        ${JSON.stringify(adapterOptions.storeName || 'collections')},
        ${JSON.stringify(adapterOptions.version || 1)}
      );\n`;
      break;
    case 'filesystem':
      code += `const adapter = new FileSystemAdapter(${JSON.stringify(adapterOptions.path || 'data.json')});\n`;
      break;
    case 'sqlite':
      code += `const adapter = new SQLiteAdapter(${JSON.stringify(adapterOptions.path || 'data.sqlite')});\n`;
      break;
    case 'redis':
      code += `const adapter = new RedisAdapter(${JSON.stringify(adapterOptions)});\n`;
      break;
  }
  
  // Create plugin instances
  if (plugins.length > 0) {
    code += `\n// Create plugin instances\n`;
    code += `const dbPlugins = [\n`;
    
    plugins.forEach(plugin => {
      const pluginName = plugin.name;
      const pluginOptions = plugin.options || {};
      
      code += `  create${pluginName.charAt(0).toUpperCase() + pluginName.slice(1)}Plugin(${JSON.stringify(pluginOptions)}),\n`;
    });
    
    code += `];\n`;
  }
  
  // Create database
  code += `\n// Create database\n`;
  code += `const db = createDb({\n`;
  code += `  adapter,\n`;
  if (plugins.length > 0) {
    code += `  plugins: dbPlugins,\n`;
  }
  code += `});\n`;
  
  // Create collections
  if (collections.length > 0) {
    code += `\n// Create collections\n`;
    collections.forEach(collection => {
      code += `db.collection(${JSON.stringify(collection)});\n`;
    });
  }
  
  // Initialize DevTools if enabled
  if (devtools) {
    code += `\n// Initialize DevTools\n`;
    code += `const devtools = initDevtools(db, ${JSON.stringify(devtoolsOptions)});\n`;
  }
  
  // Export
  code += `\n// Export database\n`;
  code += `export default db;\n`;
  
  if (devtools) {
    code += `export const nebulaDevtools = devtools;\n`;
  }
  
  return code;
}

// Export types
export { NebulaDBPluginOptions };
