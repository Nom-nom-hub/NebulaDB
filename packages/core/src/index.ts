// Export main database functionality
export { createDb, Database } from './db';
export { Collection } from './collection';
export { matchDocument, applyUpdate } from './optimized-query';
export { EnhancedIndexManager as IndexManager, IndexType } from './enhanced-indexing';

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
  IDatabase
} from './types';
