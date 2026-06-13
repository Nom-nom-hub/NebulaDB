import { Adapter, Document } from './types';

/**
 * In-memory storage adapter for NebulaDB.
 *
 * Stores all data in memory. Data is lost when the application restarts.
 * Best suited for testing, development, and short-lived processes.
 *
 * @example
 * ```typescript
 * import { MemoryAdapter, createMemoryAdapter } from '@nebula-db/adapter-memory';
 * import { createDb } from '@nebula-db/core';
 *
 * const db = createDb({ adapter: createMemoryAdapter() });
 * ```
 */
export class MemoryAdapter implements Adapter {
  private data: Record<string, Document[]> = {};

  /**
   * Load all collections and documents from memory.
   *
   * @returns A deep copy of the stored data to prevent external mutation
   */
  async load(): Promise<Record<string, Document[]>> {
    return JSON.parse(JSON.stringify(this.data));
  }

  /**
   * Save all collections and documents to memory.
   *
   * Stores a deep copy to prevent external modification of stored data.
   *
   * @param data - Record of collection names to document arrays
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    this.data = JSON.parse(JSON.stringify(data));
  }

  /**
   * Clear all data from memory.
   */
  clear(): void {
    this.data = {};
  }

  /**
   * Get the current data snapshot (for testing and debugging).
   *
   * @returns A deep copy of the current data
   */
  getData(): Record<string, Document[]> {
    return JSON.parse(JSON.stringify(this.data));
  }
} 