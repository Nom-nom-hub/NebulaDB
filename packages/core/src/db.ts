import { Collection } from './collection';
import {
  Database as IDatabase,
  ICollection,
  DbOptions,
  CollectionOptions,
  Adapter,
  Plugin
} from './types';

/**
 * Core Database class for NebulaDB.
 *
 * Manages collections, adapters, and plugins. Provides the main entry point
 * for all database operations including creating/retrieving collections and
 * persisting data through adapters.
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
export class Database implements IDatabase {
  /** Map of collection names to their instances */
  collections: Map<string, ICollection> = new Map();

  /** The storage adapter used for persistence */
  adapter: Adapter;

  /** Array of plugins registered with this database */
  plugins: Plugin[];

  /**
   * Creates a new Database instance.
   *
   * @param options - Configuration options including adapter and optional plugins
   * @param options.adapter - Storage adapter for persisting data
   * @param options.plugins - Optional array of plugins to register
   */
  constructor(options: DbOptions) {
    this.adapter = options.adapter;
    this.plugins = options.plugins || [];

    // Notify plugins about database initialization
    this.plugins.forEach(plugin => {
      if (plugin.onInit) {
        plugin.onInit(this);
      }
    });

    // Load data from adapter (async, but we don't wait for it)
    // This allows the database to be used immediately
    this.loadFromAdapter().catch(err => {
      console.error('Failed to load data from adapter during initialization:', err);
    });
  }

  /**
   * Get or create a collection by name.
   *
   * If a collection with the given name already exists, it is returned.
   * Otherwise, a new collection is created with the specified options.
   *
   * @param name - Name of the collection
   * @param options - Optional collection configuration (indexes, compression, etc.)
   * @returns The requested or newly created collection
   */
  collection(name: string, options: CollectionOptions = {}): ICollection {
    if (this.collections.has(name)) {
      return this.collections.get(name)!;
    }

    const collection = new Collection(name, [], options, this.plugins);
    this.collections.set(name, collection);
    return collection;
  }

  /**
   * Load data from the adapter into memory.
   *
   * Iterates over all collections stored in the adapter and populates
   * the in-memory collections with the loaded documents.
   *
   * @internal
   */
  private async loadFromAdapter(): Promise<void> {
    try {
      const data = await this.adapter.load();

      // Create collections and populate with data
      Object.entries(data).forEach(([collectionName, documents]) => {
        const collection = this.collection(collectionName) as Collection;
        collection.setAll(documents);
      });
    } catch (error) {
      console.error('Failed to load data from adapter:', error);
    }
  }

  /**
   * Persist all collections and their documents to the configured adapter.
   *
   * Collects all documents from every collection and passes them to the
   * adapter's `save` method for storage.
   *
   * @returns A promise that resolves when all data has been saved
   *
   * @example
   * ```typescript
   * await db.save();
   * console.log('All data persisted');
   * ```
   */
  async save(): Promise<void> {
    const data: Record<string, any[]> = {};

    // Collect data from all collections
    this.collections.forEach((collection, name) => {
      if (collection instanceof Collection) {
        data[name] = collection.getAll();
      }
    });

    try {
      await this.adapter.save(data);
    } catch (error) {
      console.error('Failed to save data to adapter:', error);
    }
  }
}

/**
 * Create a new NebulaDB database instance.
 *
 * This is the recommended entry point for creating a database.
 *
 * @param options - Configuration options for the database
 * @param options.adapter - Storage adapter for persistence (required)
 * @param options.plugins - Optional array of plugins to enable
 * @returns A new Database instance ready for use
 *
 * @example
 * ```typescript
 * import { createDb } from '@nebula-db/core';
 * import { MemoryAdapter } from '@nebula-db/adapter-memory';
 *
 * const db = createDb({
 *   adapter: new MemoryAdapter(),
 *   plugins: []
 * });
 *
 * const users = db.collection('users');
 * await users.insert({ name: 'Alice', age: 30 });
 * ```
 */
export function createDb(options: DbOptions): Database {
  return new Database(options);
}
