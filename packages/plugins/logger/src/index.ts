import { Plugin, Document, Query, UpdateOperation } from '@nebula/core';

/**
 * Log level
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

/**
 * Default console logger
 */
export class ConsoleLogger implements Logger {
  debug(message: string, ...args: any[]): void {
    console.debug(`[NebulaDB] ${message}`, ...args);
  }

  info(message: string, ...args: any[]): void {
    console.info(`[NebulaDB] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[NebulaDB] ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[NebulaDB] ${message}`, ...args);
  }
}

/**
 * Options for the logger plugin
 */
export interface LoggerPluginOptions {
  /**
   * Minimum log level to output
   */
  level?: LogLevel;

  /**
   * Custom logger implementation
   */
  logger?: Logger;

  /**
   * Whether to log query parameters
   */
  logQueryParams?: boolean;

  /**
   * Whether to log document contents
   */
  logDocuments?: boolean;

  /**
   * Whether to log performance metrics
   */
  logPerformance?: boolean;
}

/**
 * Create a logging plugin for NebulaDB
 */
export function createLoggerPlugin(options: LoggerPluginOptions = {}): Plugin {
  const {
    level = LogLevel.INFO,
    logger = new ConsoleLogger(),
    logQueryParams = true,
    logDocuments = false,
    logPerformance = true
  } = options;

  // Check if a log level should be output
  function shouldLog(messageLevel: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const configIndex = levels.indexOf(level);
    const messageIndex = levels.indexOf(messageLevel);

    return messageIndex >= configIndex;
  }

  // Format a query for logging
  function formatQuery(query: Query): any {
    if (!logQueryParams) {
      return '[Query]';
    }

    return query;
  }

  // Format a document for logging
  function formatDoc(doc: Document): any {
    if (!logDocuments) {
      return { id: doc.id };
    }

    return doc;
  }

  // Format documents for logging
  function formatDocs(docs: Document[]): any {
    if (!logDocuments) {
      return `[${docs.length} documents]`;
    }

    return docs;
  }

  // Performance tracking
  const timers = new Map<string, number>();

  function startTimer(operation: string, collection: string): string {
    const id = `${operation}:${collection}:${Date.now()}`;
    timers.set(id, performance.now());
    return id;
  }

  function endTimer(id: string): number {
    const start = timers.get(id);
    if (start === undefined) {
      return 0;
    }

    const duration = performance.now() - start;
    timers.delete(id);
    return duration;
  }

  return {
    name: 'logger',

    onInit(): void {
      if (shouldLog(LogLevel.INFO)) {
        logger.info('Database initialized');
      }
    },

    onCollectionCreate(collection: any): void {
      if (shouldLog(LogLevel.INFO)) {
        logger.info(`Collection created: ${collection.name}`);
      }
    },

    async onBeforeInsert(collection: string, doc: Document): Promise<Document> {
      const timerId = startTimer('insert', collection);

      if (shouldLog(LogLevel.DEBUG)) {
        logger.debug(`Inserting into ${collection}:`, formatDoc(doc));
      }

      // Store timer ID in document for retrieval in onAfterInsert
      return {
        ...doc,
        __timer_id__: timerId
      };
    },

    onAfterInsert(collection: string, doc: Document): void {
      const timerId = doc.__timer_id__;
      delete doc.__timer_id__;

      if (shouldLog(LogLevel.INFO)) {
        logger.info(`Inserted document into ${collection} with ID: ${doc.id}`);
      }

      if (logPerformance && shouldLog(LogLevel.DEBUG) && timerId) {
        const duration = endTimer(timerId);
        logger.debug(`Insert operation on ${collection} took ${duration.toFixed(2)}ms`);
      }
    },

    async onBeforeUpdate(collection: string, query: Query, update: UpdateOperation): Promise<[Query, UpdateOperation]> {
      const timerId = startTimer('update', collection);

      if (shouldLog(LogLevel.DEBUG)) {
        logger.debug(`Updating in ${collection}:`, {
          query: formatQuery(query),
          update: logQueryParams ? update : '[Update]'
        });
      }

      // Store timer ID in query for retrieval in onAfterUpdate
      return [
        { ...query, __timer_id__: timerId },
        update
      ];
    },

    onAfterUpdate(collection: string, query: Query, update: UpdateOperation, affectedDocs: Document[]): void {
      const timerId = query.__timer_id__;
      delete query.__timer_id__;

      if (shouldLog(LogLevel.INFO)) {
        logger.info(`Updated ${affectedDocs.length} documents in ${collection}`);
      }

      if (logPerformance && shouldLog(LogLevel.DEBUG) && timerId) {
        const duration = endTimer(timerId);
        logger.debug(`Update operation on ${collection} took ${duration.toFixed(2)}ms`);
      }
    },

    async onBeforeDelete(collection: string, query: Query): Promise<Query> {
      const timerId = startTimer('delete', collection);

      if (shouldLog(LogLevel.DEBUG)) {
        logger.debug(`Deleting from ${collection}:`, formatQuery(query));
      }

      // Store timer ID in query for retrieval in onAfterDelete
      return { ...query, __timer_id__: timerId };
    },

    onAfterDelete(collection: string, query: Query, deletedDocs: Document[]): void {
      const timerId = query.__timer_id__;
      delete query.__timer_id__;

      if (shouldLog(LogLevel.INFO)) {
        logger.info(`Deleted ${deletedDocs.length} documents from ${collection}`);
      }

      if (logPerformance && shouldLog(LogLevel.DEBUG) && timerId) {
        const duration = endTimer(timerId);
        logger.debug(`Delete operation on ${collection} took ${duration.toFixed(2)}ms`);
      }
    },

    async onBeforeQuery(collection: string, query: Query): Promise<Query> {
      const timerId = startTimer('query', collection);

      if (shouldLog(LogLevel.DEBUG)) {
        logger.debug(`Querying ${collection}:`, formatQuery(query));
      }

      // Store timer ID in query for retrieval in onAfterQuery
      return { ...query, __timer_id__: timerId };
    },

    async onAfterQuery(collection: string, query: Query, results: Document[]): Promise<Document[]> {
      const timerId = query.__timer_id__;
      delete query.__timer_id__;

      if (shouldLog(LogLevel.DEBUG)) {
        logger.debug(`Query results from ${collection}:`, {
          query: formatQuery(query),
          count: results.length,
          results: formatDocs(results)
        });
      }

      if (logPerformance && shouldLog(LogLevel.DEBUG) && timerId) {
        const duration = endTimer(timerId);
        logger.debug(`Query operation on ${collection} took ${duration.toFixed(2)}ms`);
      }

      return results;
    }
  };
}
