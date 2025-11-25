import { signal, effect } from '@preact/signals-core';
import { v4 as uuidv4 } from 'uuid';
import {
  Document,
  Query,
  UpdateOperation,
  CollectionOptions,
  SubscriptionCallback,
  ICollection,
  Plugin,
  IndexType,
  IndexDefinition
} from './types';
import { matchDocument, applyUpdate } from './optimized-query';
// Import the enhanced indexing system
import { EnhancedIndexManager, IndexType as EnhancedIndexType, IndexDefinition as EnhancedIndexDefinition } from './enhanced-indexing';
// Import the memory manager
import { MemoryManager } from './memory-manager';
// Import concurrency controls
import { ReadWriteLock, TaskQueue } from './concurrency';
// Import query cache
import { QueryCache } from './query-cache';
// Import document compression
import { DocumentCompression, CompressionOptions } from './document-compression';
// Import adaptive concurrency
import { AdaptiveConcurrencyControl, AdaptiveConcurrencyOptions } from './adaptive-concurrency';
// These imports will be used in future implementations
// import { NestedPropertyIndex } from './index/nested-property-index';
// import { QueryProcessor } from './query/query-processor';

export class Collection implements ICollection {
  name: string;
  private documents: Document[];
  private memoryManager = new MemoryManager();
  private options: CollectionOptions;
  private plugins: Plugin[];
  private documentSignal = signal<Document[]>([]);
  private subscriptions: Map<string, { query: Query, callback: SubscriptionCallback }> = new Map();
  private indexManager = new EnhancedIndexManager();
  private queryHistory: Query[] = [];
  private batchOperationInProgress = false;
  private pendingSignalUpdate = false;
  private _disposeHandlers: Map<string, () => void> = new Map();

  // Concurrency controls
  private lock = new ReadWriteLock();
  private taskQueue: TaskQueue;
  private adaptiveConcurrency: AdaptiveConcurrencyControl | null = null;

  // Query cache
  private queryCache: QueryCache;

  // Document compression
  private compression: DocumentCompression;

  constructor(name: string, initialDocs: Document[] = [], options: CollectionOptions = {}, plugins: Plugin[] = []) {
    this.name = name;
    this.options = options;
    this.plugins = plugins;

    // Initialize query cache
    const queryCacheOptions = options.queryCache || { enabled: true };
    this.queryCache = new QueryCache({
      maxSize: queryCacheOptions.maxSize || 100,
      ttlMs: queryCacheOptions.ttlMs || 30000
    });

    // Initialize document compression
    this.compression = new DocumentCompression(options.compression || { enabled: false });

    // Initialize concurrency controls
    const concurrencyOptions = options.concurrency || { enabled: false };
    if (concurrencyOptions.enabled) {
      this.adaptiveConcurrency = new AdaptiveConcurrencyControl({
        initialConcurrency: concurrencyOptions.initialConcurrency,
        minConcurrency: concurrencyOptions.minConcurrency,
        maxConcurrency: concurrencyOptions.maxConcurrency,
        samplingWindow: concurrencyOptions.samplingWindow,
        targetLatency: concurrencyOptions.targetLatency,
        adjustmentFactor: concurrencyOptions.adjustmentFactor
      });
      this.taskQueue = new TaskQueue(1); // Will be managed by adaptive concurrency
    } else {
      this.taskQueue = new TaskQueue(4); // Fixed concurrency
    }

    // Process initial documents (decompress if needed)
    const processedDocs = initialDocs.map(doc => {
      return this.compression.isCompressed(doc) ? this.compression.decompress(doc) : doc;
    });

    this.documents = [...processedDocs];
    this.documentSignal.value = this.documents;

    // Initialize memory manager with initial documents
    this.memoryManager.setAll(processedDocs);

    // Create default indexes if specified in options
    if (options.indexes) {
      for (const indexDef of options.indexes) {
        // Convert from types.IndexDefinition to enhanced-indexing.IndexDefinition
        const enhancedDefinition: EnhancedIndexDefinition = {
          name: indexDef.name,
          fields: indexDef.fields,
          type: indexDef.type === 'single' ? IndexType.SINGLE :
                indexDef.type === 'compound' ? IndexType.COMPOUND :
                indexDef.type === 'unique' ? IndexType.UNIQUE :
                indexDef.type === 'text' ? IndexType.TEXT : IndexType.SINGLE
        };
        this.createEnhancedIndex(enhancedDefinition);
      }
    }

    // Add initial documents to indexes
    if (processedDocs.length > 0) {
      this.indexManager.rebuild(processedDocs);
    }

    // Notify plugins about collection creation
    this.plugins.forEach(plugin => {
      if (plugin.onCollectionCreate) {
        plugin.onCollectionCreate(this);
      }
    });
  }

  /**
   * Insert a document into the collection
   */
  async insert(doc: Omit<Document, 'id'> & { id?: string }): Promise<Document> {
    // Use write lock for insert operations
    return this.lock.withWriteLock(async () => {
    // Generate ID if not provided
    const newDoc: Document = {
      ...doc,
      id: doc.id || uuidv4()
    };

    // Run through plugins' onBeforeInsert hooks
    let processedDoc = { ...newDoc };
    for (const plugin of this.plugins) {
      if (plugin.onBeforeInsert) {
        processedDoc = await plugin.onBeforeInsert(this.name, processedDoc);
      }
    }

    // Apply compression if enabled
    const compressedDoc = this.compression.compress(processedDoc);

    // Add to documents array and memory manager
    this.documents.push(compressedDoc);
    this.memoryManager.add(compressedDoc);

    // Invalidate query cache
    this.queryCache.invalidate();

    // Add to indexes
    this.indexManager.addDocument(processedDoc);

    // Run through plugins' onAfterInsert hooks
    for (const plugin of this.plugins) {
      if (plugin.onAfterInsert) {
        plugin.onAfterInsert(this.name, processedDoc);
      }
    }

    // Update signal to trigger reactivity - do this after all processing
    // This ensures that subscribers are notified only once per operation
    if (this.batchOperationInProgress) {
      this.pendingSignalUpdate = true;
    } else {
      this.documentSignal.value = [...this.documents];
    }

    return processedDoc;
    });
  }

  /**
   * Find documents matching a query
   */
  async find(query: Query = {}): Promise<Document[]> {
    // Use read lock for query operations
    return this.lock.withReadLock(async () => {
      // Check query cache first
      const cachedResults = this.queryCache.get(query);
      if (cachedResults !== null) {
        return cachedResults;
      }

      // Track query for index optimization
      if (Object.keys(query).length > 0) {
        this.queryHistory.push({ ...query });

        // If we have enough query history, analyze and create indexes
        if (this.queryHistory.length >= 10) {
          this.indexManager.analyzeAndCreateIndexes(this.documents, this.queryHistory);
          this.queryHistory = [];
        }
      }

      // Run through plugins' onBeforeQuery hooks
      let processedQuery = { ...query };
      for (const plugin of this.plugins) {
        if (plugin.onBeforeQuery) {
          processedQuery = await plugin.onBeforeQuery(this.name, processedQuery);
        }
      }

      // Use indexes to filter documents if possible
      let results = this.indexManager.findDocuments(processedQuery, this.documents);

      // Run through plugins' onAfterQuery hooks
      for (const plugin of this.plugins) {
        if (plugin.onAfterQuery) {
          results = await plugin.onAfterQuery(this.name, processedQuery, results);
        }
      }

      // Decompress results if needed
      const decompressedResults = results.map(doc => {
        return this.compression.isCompressed(doc) ? this.compression.decompress(doc) : doc;
      });

      // Cache the decompressed results
      this.queryCache.set(query, decompressedResults);

      return decompressedResults;
    });
  }

  /**
   * Find a single document matching a query
   */
  async findOne(query: Query): Promise<Document | null> {
    const results = await this.find(query);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Update documents matching a query
   */
  async update(query: Query, update: UpdateOperation): Promise<number> {
    // Use write lock for update operations
    return this.lock.withWriteLock(async () => {
    // Run through plugins' onBeforeUpdate hooks
    let [processedQuery, processedUpdate] = [query, update];
    for (const plugin of this.plugins) {
      if (plugin.onBeforeUpdate) {
        [processedQuery, processedUpdate] = await plugin.onBeforeUpdate(
          this.name,
          processedQuery,
          processedUpdate
        );
      }
    }

    // Find matching documents
    // const matchingDocs = this.documents.filter(doc => matchDocument(doc, processedQuery));

    // Update each matching document
    const updatedDocs: Document[] = [];
    this.documents = this.documents.map(doc => {
      if (matchDocument(doc, processedQuery)) {
        // Decompress document if needed before updating
        const decompressedDoc = this.compression.isCompressed(doc)
          ? this.compression.decompress(doc)
          : doc;

        const updatedDoc = applyUpdate(decompressedDoc, processedUpdate);

        // Apply compression if enabled
        const compressedDoc = this.compression.compress(updatedDoc);

        updatedDocs.push(updatedDoc);

        // Update document in indexes and memory manager
        this.indexManager.updateDocument(doc, compressedDoc);
        this.memoryManager.update(doc.id, compressedDoc);

        // Invalidate query cache
        this.queryCache.invalidate();

        return compressedDoc;
      }
      return doc;
    });

    // Run through plugins' onAfterUpdate hooks
    for (const plugin of this.plugins) {
      if (plugin.onAfterUpdate) {
        plugin.onAfterUpdate(this.name, processedQuery, processedUpdate, updatedDocs);
      }
    }

    // Update signal to trigger reactivity - do this after all processing
    // This ensures that subscribers are notified only once per operation
    if (this.batchOperationInProgress) {
      this.pendingSignalUpdate = true;
    } else {
      this.documentSignal.value = [...this.documents];
    }

    return updatedDocs.length;
    });
  }

  /**
   * Delete documents matching a query
   */
  async delete(query: Query): Promise<number> {
    // Use write lock for delete operations
    return this.lock.withWriteLock(async () => {
    // Run through plugins' onBeforeDelete hooks
    let processedQuery = { ...query };
    for (const plugin of this.plugins) {
      if (plugin.onBeforeDelete) {
        processedQuery = await plugin.onBeforeDelete(this.name, processedQuery);
      }
    }

    // Find matching documents before deletion
    const docsToDelete = this.documents.filter(doc => matchDocument(doc, processedQuery));

    // Remove documents from indexes and memory manager
    for (const doc of docsToDelete) {
      this.indexManager.removeDocument(doc);
      this.memoryManager.remove(doc.id);
    }

    // Invalidate query cache
    this.queryCache.invalidate();

    // Remove matching documents
    const initialLength = this.documents.length;
    this.documents = this.documents.filter(doc => !matchDocument(doc, processedQuery));

    // Run through plugins' onAfterDelete hooks
    for (const plugin of this.plugins) {
      if (plugin.onAfterDelete) {
        plugin.onAfterDelete(this.name, processedQuery, docsToDelete);
      }
    }

    // Update signal to trigger reactivity - do this after all processing
    // This ensures that subscribers are notified only once per operation
    if (this.batchOperationInProgress) {
      this.pendingSignalUpdate = true;
    } else {
      this.documentSignal.value = [...this.documents];
    }

    return initialLength - this.documents.length;
    });
  }

  /**
   * Delete a single document matching a query
   */
  async deleteOne(query: Query): Promise<boolean> {
    const deletedCount = await this.delete(query);
    return deletedCount > 0;
  }

  /**
   * Update a single document matching a query
   */
  async updateOne(query: Query, update: UpdateOperation): Promise<boolean> {
    const updatedCount = await this.update(query, update);
    return updatedCount > 0;
  }

  /**
   * Count documents matching a query
   */
  async count(query: Query = {}): Promise<number> {
    const results = await this.find(query);
    return results.length;
  }

  /**
   * Unsubscribe from changes
   */
  unsubscribe(id: string): void {
    // Remove subscription
    this.subscriptions.delete(id);

    // Call and remove dispose handler
    const dispose = this._disposeHandlers.get(id);
    if (dispose) {
      dispose();
      this._disposeHandlers.delete(id);
    }
  }

  /**
   * Subscribe to changes in documents matching a query
   */
  subscribe(query: Query, callback: SubscriptionCallback): string {
    const subscriptionId = uuidv4();
    this.subscriptions.set(subscriptionId, { query, callback });

    // Initial callback with current matching documents
    const matchingDocs = this.documents.filter(doc => matchDocument(doc, query));
    callback(matchingDocs);

    // Set up effect to track changes, but don't trigger it immediately
    // This prevents the double-call issue in the tests
    let isFirstRun = true;
    const dispose = effect(() => {
      // const docs = this.documentSignal.value;
      const subscription = this.subscriptions.get(subscriptionId);

      if (subscription && !isFirstRun) {
        const docs = this.documentSignal.value;
        const matchingDocs = docs.filter(doc => matchDocument(doc, subscription.query));
        subscription.callback(matchingDocs);
      }
      isFirstRun = false;
    });

    // Store the dispose function for later cleanup
    this._disposeHandlers = this._disposeHandlers || new Map();
    this._disposeHandlers.set(subscriptionId, dispose);

    // Return subscription ID
    return subscriptionId;
  }

  /**
   * Get all documents in the collection
   */
  getAll(): Document[] {
    return [...this.documents];
  }

  /**
   * Set all documents in the collection (used by adapters)
   */
  setAll(documents: Document[]): void {
    this.documents = [...documents];
    this.documentSignal.value = this.documents;

    // Update memory manager
    this.memoryManager.setAll(documents);

    // Rebuild indexes
    this.indexManager.rebuild(this.documents);
  }

  /**
   * Start a batch operation
   */
  beginBatch(): void {
    this.batchOperationInProgress = true;
  }

  /**
   * End a batch operation and apply pending updates
   */
  endBatch(): void {
    this.batchOperationInProgress = false;

    if (this.pendingSignalUpdate) {
      this.documentSignal.value = [...this.documents];
      this.pendingSignalUpdate = false;
    }
  }

  /**
   * Create an enhanced index on the collection (internal method)
   */
  private createEnhancedIndex(indexDef: EnhancedIndexDefinition): void {
    this.indexManager.createIndex(indexDef);
    // Rebuild the index with existing documents
    this.indexManager.rebuild(this.documents);
  }

  /**
   * Insert multiple documents in a batch
   */
  async insertBatch(docs: (Omit<Document, 'id'> & { id?: string })[]): Promise<Document[]> {
    if (!docs.length) return [];

    this.beginBatch();

    try {
      // Use task queue or adaptive concurrency to process inserts in parallel
      const tasks = docs.map(doc => () => this.insert(doc));
      const results: Document[] = [];

      if (this.adaptiveConcurrency) {
        // Use adaptive concurrency
        for (const task of tasks) {
          results.push(await this.adaptiveConcurrency.execute(task));
        }
      } else {
        // Use fixed concurrency task queue
        for (const task of tasks) {
          results.push(await this.taskQueue.add(task));
        }
      }

      return results;
    } finally {
      this.endBatch();
    }
  }

  /**
   * Update multiple documents in a batch
   */
  async updateBatch(queries: Query[], updates: UpdateOperation[]): Promise<number> {
    if (!queries.length || !updates.length || queries.length !== updates.length) {
      return 0;
    }

    this.beginBatch();

    try {
      // Optimize batch updates by processing them in a single operation when possible
      return this.lock.withWriteLock(async () => {
        // First, find all matching documents for all queries
        const matchingDocsByQuery: Map<number, Document[]> = new Map();
        const allMatchingDocs: Set<string> = new Set();

        // Process all queries in parallel to find matching documents
        await Promise.all(queries.map(async (query, index) => {
          // Run through plugins' onBeforeUpdate hooks
          let [processedQuery, processedUpdate] = [query, updates[index]];
          for (const plugin of this.plugins) {
            if (plugin.onBeforeUpdate) {
              [processedQuery, processedUpdate] = await plugin.onBeforeUpdate(
                this.name,
                processedQuery,
                processedUpdate
              );
            }
          }

          // Find matching documents
          const matchingDocs = this.documents.filter(doc => matchDocument(doc, processedQuery));
          matchingDocsByQuery.set(index, matchingDocs);

          // Track all matching document IDs
          matchingDocs.forEach(doc => allMatchingDocs.add(doc.id));
        }));

        // Create a map of document ID to document for quick lookup
        const docMap = new Map<string, Document>();
        this.documents.forEach(doc => docMap.set(doc.id, doc));

        // Apply updates to all matching documents
        const updatedDocs: Document[] = [];
        const updatedDocIds: Set<string> = new Set();

        // Process each query-update pair
        for (let i = 0; i < queries.length; i++) {
          const matchingDocs = matchingDocsByQuery.get(i) || [];
          const update = updates[i];

          for (const doc of matchingDocs) {
            // Skip if already updated by a previous query
            if (updatedDocIds.has(doc.id)) continue;

            const updatedDoc = applyUpdate(doc, update);
            updatedDocs.push(updatedDoc);
            updatedDocIds.add(doc.id);

            // Update document in indexes and memory manager
            this.indexManager.updateDocument(doc, updatedDoc);
            this.memoryManager.update(doc.id, updatedDoc);

            // Update in document map
            docMap.set(doc.id, updatedDoc);
          }
        }

        // Rebuild documents array from the map
        this.documents = Array.from(docMap.values());

        // Run through plugins' onAfterUpdate hooks
        for (let i = 0; i < queries.length; i++) {
          const matchingDocs = matchingDocsByQuery.get(i) || [];
          if (matchingDocs.length > 0) {
            for (const plugin of this.plugins) {
              if (plugin.onAfterUpdate) {
                plugin.onAfterUpdate(this.name, queries[i], updates[i], matchingDocs);
              }
            }
          }
        }

        // Update signal to trigger reactivity
        if (this.batchOperationInProgress) {
          this.pendingSignalUpdate = true;
        } else {
          this.documentSignal.value = [...this.documents];
        }

        return updatedDocs.length;
      });
    } finally {
      this.endBatch();
    }
  }

  /**
   * Delete multiple documents in a batch
   */
  async deleteBatch(queries: Query[]): Promise<number> {
    if (!queries.length) return 0;

    this.beginBatch();

    try {
      // Optimize batch deletes by processing them in a single operation
      return this.lock.withWriteLock(async () => {
        // Process all queries in parallel to find matching documents
        const matchingDocsByQuery: Document[][] = [];
        const allDocsToDelete: Set<string> = new Set();

        // Process queries in parallel
        await Promise.all(queries.map(async (query, index) => {
          // Run through plugins' onBeforeDelete hooks
          let processedQuery = { ...query };
          for (const plugin of this.plugins) {
            if (plugin.onBeforeDelete) {
              processedQuery = await plugin.onBeforeDelete(this.name, processedQuery);
            }
          }

          // Find matching documents
          const docsToDelete = this.documents.filter(doc => matchDocument(doc, processedQuery));
          matchingDocsByQuery[index] = docsToDelete;

          // Track all document IDs to delete
          docsToDelete.forEach(doc => allDocsToDelete.add(doc.id));
        }));

        // Remove documents from indexes and memory manager
        const docsToDelete = this.documents.filter(doc => allDocsToDelete.has(doc.id));
        for (const doc of docsToDelete) {
          this.indexManager.removeDocument(doc);
          this.memoryManager.remove(doc.id);
        }

        // Remove matching documents
        const initialLength = this.documents.length;
        this.documents = this.documents.filter(doc => !allDocsToDelete.has(doc.id));

        // Run through plugins' onAfterDelete hooks
        for (let i = 0; i < queries.length; i++) {
          const deletedDocs = matchingDocsByQuery[i] || [];
          if (deletedDocs.length > 0) {
            for (const plugin of this.plugins) {
              if (plugin.onAfterDelete) {
                plugin.onAfterDelete(this.name, queries[i], deletedDocs);
              }
            }
          }
        }

        // Update signal to trigger reactivity
        if (this.batchOperationInProgress) {
          this.pendingSignalUpdate = true;
        } else {
          this.documentSignal.value = [...this.documents];
        }

        return initialLength - this.documents.length;
      });
    } finally {
      this.endBatch();
    }
  }

  /**
   * Create an index on the collection
   */
  createIndex(definition: IndexDefinition): void {
    // Convert from types.IndexDefinition to enhanced-indexing.IndexDefinition
    const enhancedDefinition: EnhancedIndexDefinition = {
      name: definition.name,
      fields: definition.fields,
      type: definition.type === 'single' ? IndexType.SINGLE :
            definition.type === 'compound' ? IndexType.COMPOUND :
            definition.type === 'unique' ? IndexType.UNIQUE :
            definition.type === 'text' ? IndexType.TEXT : IndexType.SINGLE
    };

    this.indexManager.createIndex(enhancedDefinition);

    // Build the index with existing documents
    if (this.documents.length > 0) {
      this.indexManager.rebuild(this.documents);
    }
  }

  /**
   * Drop an index from the collection
   */
  dropIndex(name: string): boolean {
    return this.indexManager.dropIndex(name);
  }

  /**
    * Get all indexes on the collection
    */
  getIndexes(): IndexDefinition[] {
    return this.indexManager.getAllIndexes().map(index => {
      // Convert from enhanced-indexing.IndexType to types.IndexType
      let type: IndexType;

      switch (index.type) {
        case EnhancedIndexType.SINGLE:
          type = IndexType.SINGLE;
          break;
        case EnhancedIndexType.COMPOUND:
          type = IndexType.COMPOUND;
          break;
        case EnhancedIndexType.UNIQUE:
          type = IndexType.UNIQUE;
          break;
        case EnhancedIndexType.TEXT:
          type = IndexType.TEXT;
          break;
        default:
          type = IndexType.SINGLE;
      }

      return {
        name: index.name,
        fields: index.fields,
        type: type
      };
    });
  }

  /**
   * Optimize memory usage
   */
  optimize(): void {
    // Optimize memory manager
    this.memoryManager.optimize();
  }

  /**
   * Process documents in chunks to avoid blocking the main thread
   */
  async processInChunks<T>(
    processor: (docs: Document[]) => Promise<T[]>,
    chunkSize: number = 1000
  ): Promise<T[]> {
    return this.memoryManager.processInChunks(processor, chunkSize);
  }

  /**
   * Configure document compression
   */
  setCompressionOptions(options: Partial<CompressionOptions>): void {
    this.compression.setOptions(options);
  }

  /**
   * Get current compression options
   */
  getCompressionOptions(): CompressionOptions {
    return this.compression.getOptions();
  }

  /**
   * Configure adaptive concurrency
   */
  setAdaptiveConcurrencyOptions(options: Partial<AdaptiveConcurrencyOptions> & { enabled?: boolean }): void {
    if (options.enabled === false && this.adaptiveConcurrency) {
      // Disable adaptive concurrency
      this.adaptiveConcurrency = null;
      this.taskQueue = new TaskQueue(4); // Reset to fixed concurrency
      return;
    }

    if (options.enabled === true && !this.adaptiveConcurrency) {
      // Enable adaptive concurrency
      this.adaptiveConcurrency = new AdaptiveConcurrencyControl(options);
    } else if (this.adaptiveConcurrency) {
      // Update existing adaptive concurrency
      this.adaptiveConcurrency.setOptions(options);
    }
  }

  /**
   * Get adaptive concurrency statistics
   */
  getAdaptiveConcurrencyStats(): { enabled: boolean, stats?: any } {
    if (!this.adaptiveConcurrency) {
      return { enabled: false };
    }

    return {
      enabled: true,
      stats: this.adaptiveConcurrency.getStats()
    };
  }

  /**
   * Recompress all documents with current settings
   */
  async recompressAll(): Promise<number> {
    return this.lock.withWriteLock(async () => {
      let count = 0;

      // Process in chunks to avoid memory issues
      await this.processInChunks(async (docs) => {
        const results: Document[] = [];

        for (const doc of docs) {
          // Decompress if needed
          const decompressedDoc = this.compression.isCompressed(doc)
            ? this.compression.decompress(doc)
            : doc;

          // Recompress with current settings
          const compressedDoc = this.compression.compress(decompressedDoc);

          // Update in memory manager
          this.memoryManager.update(doc.id, compressedDoc);

          results.push(compressedDoc);
          count++;
        }

        return results;
      });

      // Update documents array
      this.documents = this.memoryManager.getAll();

      // Update signal
      this.documentSignal.value = [...this.documents];

      // Invalidate query cache
      this.queryCache.invalidate();

      return count;
    });
  }

  /**
   * Rebuilds all indexes for the collection
   */
  async rebuildIndexes(): Promise<void> {
    // Get all documents
    const documents = await this.find({});

    // Clear all indexes
    const indexes = this.indexManager.getAllIndexes();
    indexes.forEach((index: any) => index.clear());

    // Re-add all documents to indexes
    documents.forEach(doc => {
      indexes.forEach((index: any) => index.add(doc));
    });

    return Promise.resolve();
  }

  /**
   * Force a refresh of the collection's indexes
   * This ensures all indexes are up-to-date with the latest document changes
   * @returns Promise that resolves when the refresh is complete
   */
  async refresh(): Promise<void> {
    return this.lock.withWriteLock(async () => {
      // Get all indexes from the index manager
      const indexes = this.indexManager.getAllIndexes();

      // Clear all indexes
      for (const index of indexes) {
        index.clear();
      }

      // Re-add all documents to indexes
      for (const doc of this.documents) {
        for (const index of indexes) {
          index.add(doc);
        }
      }

      return Promise.resolve();
    });
  }

  /**
   * Rebuilds a specific index
   * @param indexName The name of the index to rebuild
   * @returns Promise that resolves when the index rebuild is complete
   */
  private async rebuildIndex(indexName: string): Promise<void> {
    const indexes = this.indexManager.getAllIndexes();
    const index = indexes.find(idx => idx.name === indexName);
    if (!index) return Promise.resolve();

    // Clear the index
    index.clear();

    // Re-index all documents
    const documents = await this.find({});
    for (const doc of documents) {
      index.add(doc);
    }

    return Promise.resolve();
  }
}
