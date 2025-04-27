/**
 * Base document interface
 */
export interface Document {
  id: string;
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
 * Index definition for collection
 */
export interface IndexDefinition {
  name: string;
  fields: string[];
  type: 'single' | 'compound' | 'unique' | 'text';
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
 */
export interface CollectionOptions {
  schema?: any; // Optional schema for validation
  indexes?: IndexDefinition[]; // Optional indexes
  compression?: Partial<CompressionOptions>; // Optional compression settings
  queryCache?: {
    enabled: boolean;
    maxSize?: number;
    ttlMs?: number;
  }; // Optional query cache settings
  concurrency?: AdaptiveConcurrencyOptions; // Optional adaptive concurrency settings
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
  load(): Promise<Record<string, Document[]>>;
  save(data: Record<string, Document[]>): Promise<void>;
}

/**
 * Plugin interface with lifecycle hooks
 */
export interface Plugin {
  name: string;
  onInit?(db: any): void;
  onCollectionCreate?(collection: any): void;
  onBeforeInsert?(collection: string, doc: Document): Document | Promise<Document>;
  onAfterInsert?(collection: string, doc: Document): void;
  onBeforeUpdate?(collection: string, query: Query, update: UpdateOperation): [Query, UpdateOperation] | Promise<[Query, UpdateOperation]>;
  onAfterUpdate?(collection: string, query: Query, update: UpdateOperation, affectedDocs: Document[]): void;
  onBeforeDelete?(collection: string, query: Query): Query | Promise<Query>;
  onAfterDelete?(collection: string, query: Query, deletedDocs: Document[]): void;
  onBeforeQuery?(collection: string, query: Query): Query | Promise<Query>;
  onAfterQuery?(collection: string, query: Query, results: Document[]): Document[] | Promise<Document[]>;
}

/**
 * Subscription callback function type
 */
export type SubscriptionCallback = (docs: Document[]) => void;

/**
 * Collection interface
 */
export interface ICollection {
  name: string;
  insert(doc: Omit<Document, 'id'> & { id?: string }): Promise<Document>;
  insertBatch(docs: (Omit<Document, 'id'> & { id?: string })[]): Promise<Document[]>;
  find(query?: Query): Promise<Document[]>;
  findOne(query: Query): Promise<Document | null>;
  update(query: Query, update: UpdateOperation): Promise<number>;
  updateOne(query: Query, update: UpdateOperation): Promise<boolean>;
  delete(query: Query): Promise<number>;
  deleteOne(query: Query): Promise<boolean>;
  count(query?: Query): Promise<number>;
  subscribe(query: Query, callback: SubscriptionCallback): string;
  unsubscribe(id: string): void;
  createIndex(definition: IndexDefinition): void;
  dropIndex(name: string): void;
  getIndexes(): IndexDefinition[];
  refresh(): Promise<void>;
  // Batch operations
  insertBatch(docs: (Omit<Document, 'id'> & { id?: string })[]): Promise<Document[]>;
  updateBatch(queries: Query[], updates: UpdateOperation[]): Promise<number>;
  deleteBatch(queries: Query[]): Promise<number>;

  // Memory management
  optimize(): void;
  processInChunks<T>(processor: (docs: Document[]) => Promise<T[]>, chunkSize?: number): Promise<T[]>;

  // Batch control
  beginBatch(): void;
  endBatch(): void;

  // Compression control
  setCompressionOptions(options: Partial<CompressionOptions>): void;
  getCompressionOptions(): CompressionOptions;
  recompressAll(): Promise<number>;

  // Concurrency control
  setAdaptiveConcurrencyOptions(options: Partial<AdaptiveConcurrencyOptions>): void;
  getAdaptiveConcurrencyStats(): { enabled: boolean, stats?: any };
}

/**
 * Database interface
 */
export interface Database {
  collection(name: string): ICollection;
  // Add other necessary methods
}
