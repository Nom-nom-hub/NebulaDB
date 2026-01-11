import type { Adapter, Document } from '@nebula-db/core';

/**
 * Deno KV Adapter for NebulaDB
 * Uses Deno.kv() for persistent storage in Deno runtime
 * 
 * @example
 * ```typescript
 * import { DenoKvAdapter } from '@nebula-db/adapter-deno-kv';
 * import { createDb } from '@nebula-db/core';
 * 
 * const db = createDb({
 *   adapter: new DenoKvAdapter()
 * });
 * 
 * const users = db.collection('users');
 * await users.insert({ name: 'Alice' });
 * ```
 */
export class DenoKvAdapter implements Adapter {
  private kv: Deno.Kv;
  private prefix: string;
  private initialized = false;

  /**
   * Creates a new Deno KV adapter
   * @param path - Optional path to local KV store (if not using cloud)
   * @param prefix - Prefix for all keys (default: 'nebula-db')
   */
  constructor(path?: string, prefix = 'nebula-db') {
    this.prefix = prefix;
    // Kv will be initialized in init()
    // Using any type here since Deno.kv type may not be available in all environments
    this.kv = null as any;
  }

  /**
   * Initialize the adapter (open KV connection)
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // In Deno, Deno.kv() opens the default KV store
      this.kv = await (globalThis as any).Deno?.kv?.();
      if (!this.kv) {
        throw new Error('Deno.kv() is not available in this environment');
      }
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Deno KV: ${error}`);
    }
  }

  /**
   * Load all collections and documents from Deno KV
   */
  async load(): Promise<Record<string, Document[]>> {
    await this.init();

    const collections: Record<string, Document[]> = {};

    try {
      // List all keys with the prefix
      const prefix = [this.prefix];
      const entries = this.kv.list({ prefix });

      // Process all entries
      for await (const entry of entries) {
        const key = entry.key as string[];
        // Key format: [prefix, collectionName, docId]
        if (key.length >= 3) {
          const collectionName = key[1] as string;
          const docId = key[2] as string;
          const value = entry.value as Record<string, any>;

          if (!collections[collectionName]) {
            collections[collectionName] = [];
          }

          collections[collectionName].push({
            id: docId,
            ...value
          });
        }
      }
    } catch (error) {
      throw new Error(`Failed to load from Deno KV: ${error}`);
    }

    return collections;
  }

  /**
   * Save all collections and documents to Deno KV
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    await this.init();

    try {
      // First, delete all existing data with our prefix
      const prefix = [this.prefix];
      const entries = this.kv.list({ prefix });

      for await (const entry of entries) {
        await this.kv.delete(entry.key);
      }

      // Now save all new data
      for (const [collectionName, docs] of Object.entries(data)) {
        for (const doc of docs) {
          const { id, ...rest } = doc;
          const key = [this.prefix, collectionName, id];
          await this.kv.set(key, rest);
        }
      }
    } catch (error) {
      throw new Error(`Failed to save to Deno KV: ${error}`);
    }
  }

  /**
   * Close the KV connection
   */
  async close(): Promise<void> {
    if (this.kv) {
      await (this.kv as any).close?.();
      this.initialized = false;
    }
  }
}

/**
 * Create a Deno KV adapter instance
 */
export function createDenoKvAdapter(path?: string, prefix?: string): DenoKvAdapter {
  return new DenoKvAdapter(path, prefix);
}
