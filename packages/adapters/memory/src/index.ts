import { Adapter, Document } from '@nebula/core';

/**
 * In-memory adapter for NebulaDB
 * This adapter doesn't persist data between sessions
 */
export class MemoryAdapter implements Adapter {
  private data: Record<string, Document[]> = {};

  /**
   * Load data from memory
   */
  async load(): Promise<Record<string, Document[]>> {
    // Return a deep copy of the data to prevent external modifications
    return JSON.parse(JSON.stringify(this.data));
  }

  /**
   * Save data to memory
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    this.data = { ...data };
  }
}
