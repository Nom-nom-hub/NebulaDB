import { Document, Query, UpdateOperation } from '@nebula/core';

/**
 * DevTools options
 */
export interface DevtoolsOptions {
  /**
   * Port to run the DevTools server on
   */
  port?: number;
  
  /**
   * Whether to automatically open DevTools in browser
   */
  autoOpen?: boolean;
}

/**
 * Connection options
 */
export interface ConnectionOptions {
  /**
   * Port to connect to
   */
  port: number;
}

/**
 * Database event types
 */
export enum EventType {
  INIT = 'init',
  COLLECTION_CREATE = 'collection:create',
  COLLECTION_DROP = 'collection:drop',
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete',
  QUERY = 'query',
  SAVE = 'save',
  LOAD = 'load',
  ERROR = 'error'
}

/**
 * Base event interface
 */
export interface BaseEvent {
  type: EventType;
  timestamp: number;
}

/**
 * Init event
 */
export interface InitEvent extends BaseEvent {
  type: EventType.INIT;
  collections: string[];
}

/**
 * Collection create event
 */
export interface CollectionCreateEvent extends BaseEvent {
  type: EventType.COLLECTION_CREATE;
  collection: string;
}

/**
 * Collection drop event
 */
export interface CollectionDropEvent extends BaseEvent {
  type: EventType.COLLECTION_DROP;
  collection: string;
}

/**
 * Insert event
 */
export interface InsertEvent extends BaseEvent {
  type: EventType.INSERT;
  collection: string;
  document: Document;
}

/**
 * Update event
 */
export interface UpdateEvent extends BaseEvent {
  type: EventType.UPDATE;
  collection: string;
  query: Query;
  update: UpdateOperation;
  affectedCount: number;
}

/**
 * Delete event
 */
export interface DeleteEvent extends BaseEvent {
  type: EventType.DELETE;
  collection: string;
  query: Query;
  deletedCount: number;
}

/**
 * Query event
 */
export interface QueryEvent extends BaseEvent {
  type: EventType.QUERY;
  collection: string;
  query: Query;
  resultCount: number;
}

/**
 * Save event
 */
export interface SaveEvent extends BaseEvent {
  type: EventType.SAVE;
}

/**
 * Load event
 */
export interface LoadEvent extends BaseEvent {
  type: EventType.LOAD;
  collections: string[];
  documentCounts: Record<string, number>;
}

/**
 * Error event
 */
export interface ErrorEvent extends BaseEvent {
  type: EventType.ERROR;
  error: string;
  context?: any;
}

/**
 * Union of all event types
 */
export type Event =
  | InitEvent
  | CollectionCreateEvent
  | CollectionDropEvent
  | InsertEvent
  | UpdateEvent
  | DeleteEvent
  | QueryEvent
  | SaveEvent
  | LoadEvent
  | ErrorEvent;

/**
 * Database snapshot
 */
export interface DatabaseSnapshot {
  collections: Record<string, Document[]>;
  timestamp: number;
}

/**
 * Collection stats
 */
export interface CollectionStats {
  name: string;
  documentCount: number;
  averageDocumentSize: number;
  indexes: string[];
}

/**
 * Database stats
 */
export interface DatabaseStats {
  collections: CollectionStats[];
  totalDocuments: number;
  totalSize: number;
  lastSaved: number | null;
}
