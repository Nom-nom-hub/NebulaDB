import { Adapter, Document } from '@nebula/core';

/**
 * LocalStorage adapter for NebulaDB
 * This adapter persists data in the browser's localStorage
 */
export class LocalStorageAdapter implements Adapter {
  private storageKey: string;

  /**
   * Create a new LocalStorageAdapter
   * @param storageKey The key to use for storing data in localStorage
   */
  constructor(storageKey: string = 'nebula-db') {
    this.storageKey = storageKey;
  }

  /**
   * Load data from localStorage
   */
  async load(): Promise<Record<string, Document[]>> {
    if (typeof localStorage === 'undefined') {
      throw new Error('LocalStorage is not available in this environment');
    }

    try {
      const storedData = localStorage.getItem(this.storageKey);
      if (!storedData) {
        return {};
      }
      return JSON.parse(storedData);
    } catch (error) {
      console.error('Failed to load data from localStorage:', error);
      return {};
    }
  }

  /**
   * Save data to localStorage
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    if (typeof localStorage === 'undefined') {
      throw new Error('LocalStorage is not available in this environment');
    }

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save data to localStorage:', error);
      throw error;
    }
  }
}
