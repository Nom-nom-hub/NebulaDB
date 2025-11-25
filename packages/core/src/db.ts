import { Collection } from './collection';
import {
  Database as IDatabase,
  ICollection,
  DbOptions,
  CollectionOptions,
  Adapter,
  Plugin
} from './types';

export class Database implements IDatabase {
  collections: Map<string, ICollection> = new Map();
  adapter: Adapter;
  plugins: Plugin[];

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
   * Get or create a collection
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
   * Load data from the adapter
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
   * Save data to the adapter
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
 * Create a new database instance
 */
export function createDb(options: DbOptions): Database {
  return new Database(options);
}
