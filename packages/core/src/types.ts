/**
 * Base document interface
 * Represents a single document in a collection.
 */
export interface Document {
  /** Unique identifier for the document */
  id: string | number;
  /** Convert the document to JSON */
  toJSON?(): any;
  [key: string]: any;
}

/**
 * Query operators for filtering documents
 */
export type QueryOperator =
  | '$eq'
  | '$ne'
  | '$gt'
  | '$gte'
  | '$lt'
  | '$lte'
  | '$in'
  | '$nin'
  | '$regex'
  | '$exists';

/**
 * Logical operators for combining conditions
 */
export type LogicalOperator = '$and' | '$or' | '$not';

/**
 * Update operators for modifying documents
 */
export type UpdateOperator = '$set' | '$unset' | '$inc' | '$push' | '$pull';

/**
 * Query condition for a single field
 */
export type QueryCondition = {
  [K in QueryOperator]?: any;
} | {
  [key: string]: any;
};

/**
 * Logical query combining multiple conditions
 */
export type LogicalQuery = {
  $and?: Array<QueryCondition | LogicalQuery>;
  $or?: Array<QueryCondition | LogicalQuery>;
  $not?: QueryCondition | LogicalQuery;
};

/**
 * Complete query object
 */
export type Query = {
  [key: string]: QueryCondition | any;
} | LogicalQuery;

/**
 * Update operation for modifying documents
 */
export type UpdateOperation = {
  [K in UpdateOperator]?: {
    [key: string]: any;
  };
};

/**
 * Index type enum for consistency
 */
export enum IndexType {
  SINGLE = 'single',
  COMPOUND = 'compound',
  UNIQUE = 'unique',
  TEXT = 'text',
  MULTI = 'multi'
}

/**
 * Index definition for collection
 */
export interface IndexDefinition {
  /** Name of the index */
  name: string;
  /** Fields included in the index */
  fields: string[];
  /** Type of the index */
  type: IndexType;
}

/**
 * Compression options for documents
 */
export interface CompressionOptions {
  enabled: boolean;
  threshold: number; // Size in bytes above which to compress
  level: number; // Compression level (1-9)
  fields?: string[]; // Specific fields to compress, if empty compress the whole document
}

/**
 * Adaptive concurrency options
 */
export interface AdaptiveConcurrencyOptions {
  enabled: boolean;
  initialConcurrency?: number;
  minConcurrency?: number;
  maxConcurrency?: number;
  samplingWindow?: number;
  targetLatency?: number;
  adjustmentFactor?: number;
}

/**
 * Options for collection operations
 * @template S - Schema type for documents (default: any)
 */
export interface CollectionOptions<S = any> {
  /** Optional schema for validation */
  schema?: S;
  /** Optional indexes */
  indexes?: IndexDefinition[];
  /** Optional compression settings */
  compression?: Partial<CompressionOptions>;
  /** Optional query cache settings */
  queryCache?: {
    enabled: boolean;
    maxSize?: number;
    ttlMs?: number;
  };
  /** Optional adaptive concurrency settings */
  concurrency?: AdaptiveConcurrencyOptions;
}

/**
 * Options for creating a database
 */
export interface DbOptions {
  adapter: Adapter;
  plugins?: Plugin[];
}

/**
 * Storage adapter interface
 */
export interface Adapter {
  /**
   * Load all data from the storage backend.
   */
  load(): Promise<Record<string, Document[]>>;
  /**
   * Save all data to the storage backend.
   */
  save(data: Record<string, Document[]>): Promise<void>;
}

/**
 * Plugin interface with lifecycle hooks
 */
export interface Plugin {
  name: string;
  onInit?(db: Database): void | Promise<void>;
  onCollectionCreate?(collection: ICollection): void | Promise<void>;
  onBeforeInsert?(collection: string, doc: Document): Document | Promise<Document>;
  onAfterInsert?(collection: string, doc: Document): void | Promise<void>;
  onBeforeUpdate?(collection: string, query: Query, update: UpdateOperation): [Query, UpdateOperation] | Promise<[Query, UpdateOperation]>;
  onAfterUpdate?(collection: string, query: Query, update: UpdateOperation, affectedDocs: Document[]): void | Promise<void>;
  onBeforeDelete?(collection: string, query: Query): Query | Promise<Query>;
  onAfterDelete?(collection: string, query: Query, deletedDocs: Document[]): void | Promise<void>;
  onBeforeQuery?(collection: string, query: Query): Query | Promise<Query>;
  onAfterQuery?(collection: string, query: Query, results: Document[]): Document[] | Promise<Document[]>;
  [key: string]: any; // Allow additional properties for plugin-specific methods
}

/**
 * Subscription callback function type
 */
export type SubscriptionCallback = (docs: Document[]) => void;

/**
 * Collection interface
 */
export interface ICollection {
  /** Name of the collection */
  name: string;
  /** Insert a document (auto-generates id if not provided) */
  insert(doc: Omit<Document, 'id'> & { id?: string }): Promise<Document>;
  /** Insert multiple documents */
  insertBatch(docs: (Omit<Document, 'id'> & { id?: string })[]): Promise<Document[]>;
  /** Find documents matching a query */
  find(query?: Query): Promise<Document[]>;
  /** Find a single document matching a query */
  findOne(query: Query): Promise<Document | null>;
  /** Update documents matching a query */
  update(query: Query, update: UpdateOperation): Promise<number>;
  /** Update a single document matching a query */
  updateOne(query: Query, update: UpdateOperation): Promise<boolean>;
  /** Delete documents matching a query */
  delete(query: Query): Promise<number>;
  /** Delete a single document matching a query */
  deleteOne(query: Query): Promise<boolean>;
  /** Count documents matching a query */
  count(query?: Query): Promise<number>;
  /** Subscribe to changes matching a query */
  subscribe(query: Query, callback: SubscriptionCallback): string;
  /** Unsubscribe from changes */
  unsubscribe(id: string): void;
  /** Create a new index */
  createIndex(definition: IndexDefinition): void;
  /** Drop an index by name */
  dropIndex(name: string): void;
  /** Get all indexes */
  getIndexes(): IndexDefinition[];
  /** Refresh the collection (reload from storage) */
  refresh(): Promise<void>;
  /** Insert multiple documents (batch) */
  insertBatch(docs: (Omit<Document, 'id'> & { id?: string })[]): Promise<Document[]>;
  /** Update multiple documents (batch) */
  updateBatch(queries: Query[], updates: UpdateOperation[]): Promise<number>;
  /** Delete multiple documents (batch) */
  deleteBatch(queries: Query[]): Promise<number>;
  /** Optimize memory usage */
  optimize(): void;
  /** Process documents in chunks */
  processInChunks<T>(processor: (docs: Document[]) => Promise<T[]>, chunkSize?: number): Promise<T[]>;
  /** Begin a batch operation */
  beginBatch(): void;
  /** End a batch operation */
  endBatch(): void;
  /** Set compression options */
  setCompressionOptions(options: Partial<CompressionOptions>): void;
  /** Get current compression options */
  getCompressionOptions(): CompressionOptions;
  /** Recompress all documents */
  recompressAll(): Promise<number>;
  /** Set adaptive concurrency options */
  setAdaptiveConcurrencyOptions(options: Partial<AdaptiveConcurrencyOptions>): void;
  /** Get current concurrency stats */
  getAdaptiveConcurrencyStats(): { enabled: boolean, stats?: any };
}

/**
 * Database interface
 */
export interface Database {
  /** Get a collection by name */
  collection(name: string, options?: CollectionOptions): ICollection;
  /** Save data to the adapter */
  save(): Promise<void>;
  /** Load data from the adapter */
  load(): Promise<void>;
  /** Collections map */
  collections: Map<string, ICollection>;
  /** Adapter instance */
  adapter: Adapter;
  /** Plugin instances */
  plugins: Plugin[];
  /** Allow string indexing for dynamic property access */
  [key: string]: any;
}

/**
 * New Database interface for environment-specific adapters
 */
export interface NebulaDatabase {
  collection<T = any>(name: string, options?: CollectionOptions): Collection<T>;
  close(): Promise<void> | void;
}

/**
 * New Collection interface for environment-specific adapters
 */
export interface Collection<T = any> {
  insert(doc: T): Promise<T>;
  find(query?: any): Promise<T[]>;
  findOne(query: any): Promise<T | null>;
  update(query: any, update: Partial<T>): Promise<T | null>;
  delete(query: any): Promise<boolean>;
}

/**
 * Options for collection operations in new adapters
 */
export interface CollectionOptions {
  indexes?: IndexDefinition[];
}
