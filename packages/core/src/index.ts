// Export main database functionality
export { createDb, Database } from './db';
export { Collection } from './collection';
export { matchDocument, applyUpdate } from './optimized-query';
export { EnhancedIndexManager as IndexManager, IndexType } from './enhanced-indexing';

// Export adapters
export { MemoryAdapter } from './memory-adapter';
export { SQLiteAdapter } from './sqlite-adapter';

// Export performance tools (Phase 4)
export { QueryOptimizer } from './query-optimizer';
export { AdaptiveWorkerPool, BrowserWorkerPool, NodeWorkerPool, createWorkerPool } from './worker-pool';
export { PerformanceProfiler, getProfiler } from './performance-profiler';

export type {
  QueryPlan,
  QueryPredicate,
  ExecutionStep,
  FieldStats
} from './query-optimizer';

export type {
  WorkerTask,
  WorkerResult,
  PoolStats
} from './worker-pool';

export type {
  OperationMetrics,
  ProfileSummary,
  ProfileReport
} from './performance-profiler';

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
  ICollection
} from './types';
