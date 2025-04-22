/**
 * NebulaDB - Fast, flexible, serverless embedded NoSQL database
 *
 * This is the main entry point for NebulaDB. It re-exports all the core functionality
 * and commonly used adapters and plugins.
 */

// Re-export everything from core
export * from '@nebula-db/core';

// Export adapters
export { MemoryAdapter } from '@nebula-db/adapter-memory';
export { LocalStorageAdapter } from '@nebula-db/adapter-localstorage';
export { IndexedDBAdapter } from '@nebula-db/adapter-indexeddb';
export { FileSystemAdapter } from '@nebula-db/adapter-filesystem';

// Export plugins
export { createValidationPlugin } from '@nebula-db/plugin-validation';

// Import all adapters and plugins for dynamic loading
import { LocalStorageAdapter as LocalStorageAdapterImport } from '@nebula-db/adapter-localstorage';
import { IndexedDBAdapter as IndexedDBAdapterImport } from '@nebula-db/adapter-indexeddb';
import { FileSystemAdapter as FileSystemAdapterImport } from '@nebula-db/adapter-filesystem';
import { createValidationPlugin as createValidationPluginImport } from '@nebula-db/plugin-validation';

/**
 * Create a database with sensible defaults
 */
import { createDb as createCoreDb, DbOptions } from '@nebula-db/core';
import { MemoryAdapter } from '@nebula-db/adapter-memory';

/**
 * Extended options for creating a database with defaults
 */
export interface CreateDbOptions extends Partial<DbOptions> {
  /**
   * Storage type to use
   * - 'memory': In-memory storage (default)
   * - 'localStorage': Browser localStorage
   * - 'indexedDB': Browser IndexedDB
   * - 'fileSystem': Node.js file system
   */
  storage?: 'memory' | 'localStorage' | 'indexedDB' | 'fileSystem';

  /**
   * Path for file system storage (only used with 'fileSystem' storage)
   */
  path?: string;

  /**
   * Enable schema validation
   */
  validation?: boolean;

  /**
   * Validation schemas (only used when validation is true)
   */
  validationSchemas?: Record<string, any>;
}

/**
 * Create a database with sensible defaults
 */
export function createDatabase(options: CreateDbOptions = {}) {
  const { storage = 'memory', path, validation, ...coreOptions } = options;

  // Set up adapter based on storage type
  let adapter;
  switch (storage) {
    case 'localStorage': {
      adapter = new LocalStorageAdapterImport();
      break;
    }
    case 'indexedDB': {
      adapter = new IndexedDBAdapterImport();
      break;
    }
    case 'fileSystem': {
      adapter = new FileSystemAdapterImport(path || './data');
      break;
    }
    case 'memory':
    default:
      adapter = new MemoryAdapter();
  }

  // Set up plugins
  const plugins = [];

  // Add validation plugin if requested
  if (validation) {
    plugins.push(createValidationPluginImport({
      schemas: options.validationSchemas || {},
      strict: false
    }));
  }

  // Create the database with the configured adapter and plugins
  return createCoreDb({
    adapter,
    plugins,
    ...coreOptions
  });
}

// Default export for convenience
export default {
  createDatabase
};
