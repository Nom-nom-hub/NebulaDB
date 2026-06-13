/**
 * NebulaDB Core
 *
 * High-performance, reactive, TypeScript-first embedded NoSQL database.
 *
 * @module @nebula-db/core
 *
 * @example
 * ```typescript
 * import { createDb } from '@nebula-db/core';
 * import { MemoryAdapter } from '@nebula-db/adapter-memory';
 *
 * const db = createDb({ adapter: new MemoryAdapter() });
 * const users = db.collection('users');
 * await users.insert({ name: 'Alice' });
 * ```
 */

// Export main database functionality
export { createDb, Database } from './db';
export { Collection } from './collection';
export { matchDocument, applyUpdate } from './optimized-query';
export { EnhancedIndexManager as IndexManager, IndexType } from './enhanced-indexing';

// Export adapters (browser-safe)
export { MemoryAdapter } from './memory-adapter';

// Export performance & optimization tools
export { QueryOptimizer } from './query-optimizer';
export { AdaptiveWorkerPool, BrowserWorkerPool, NodeWorkerPool, createWorkerPool } from './worker-pool';
export { PerformanceProfiler, getProfiler } from './performance-profiler';

// Query plan and execution types
export type {
  QueryPlan,
  QueryPredicate,
  ExecutionStep,
  FieldStats
} from './query-optimizer';

// Worker pool types
export type {
  WorkerTask,
  WorkerResult,
  PoolStats
} from './worker-pool';

// Performance profiling types
export type {
  OperationMetrics,
  ProfileSummary,
  ProfileReport
} from './performance-profiler';

// Core database types
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
  PluginHookContext,
  SubscriptionCallback,
  ICollection
} from './types';
