// Environment detection
export const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
export const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
export const isSSR = isNode && typeof window === 'undefined';

// Conditional exports
let createDatabase: any;

if (isBrowser) {
  // Browser-compatible version
  createDatabase = async () => {
    // Use IndexedDB or WebSQL for browser storage
    const { createBrowserDatabase } = await import('./browser-adapter');
    return createBrowserDatabase();
  };
} else if (isNode) {
  // Node.js version with better-sqlite3
  createDatabase = async () => {
    const { createNodeDatabase } = await import('./node-adapter');
    return createNodeDatabase();
  };
} else {
  throw new Error('Unsupported environment');
}

export { createDatabase };

// Export main database functionality
export { createDb, Database } from './db';
export { Collection } from './collection';
export { matchDocument, applyUpdate } from './optimized-query';
export { EnhancedIndexManager as IndexManager, IndexType } from './enhanced-indexing';

// Export utilities
export { toJSON } from './utils/toJSON';

// Export adapters
export { InMemoryAdapter } from './in-memory-adapter';
export { LocalstorageAdapter } from './localstorage';

// Export types
export type {
  Document,
  Query,
  QueryCondition,
  QueryOperator,
  LogicalOperator,
  UpdateOperator,
  UpdateOperation,
  IndexDefinition,
  CollectionOptions,
  DbOptions,
  Adapter,
  Plugin,
  SubscriptionCallback,
  ICollection,
  NebulaDatabase
} from './types';
