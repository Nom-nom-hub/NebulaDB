import { Adapter, Document } from '@nebula/core';

/**
 * IndexedDB adapter for NebulaDB
 * This adapter persists data in the browser's IndexedDB
 */
export class IndexedDBAdapter implements Adapter {
  private dbName: string;
  private storeName: string;
  private version: number;

  /**
   * Create a new IndexedDBAdapter
   * @param dbName The name of the IndexedDB database
   * @param storeName The name of the object store
   * @param version The version of the database
   */
  constructor(dbName: string = 'nebula-db', storeName: string = 'collections', version: number = 1) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.version = version;
  }

  /**
   * Open a connection to the IndexedDB database
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not available in this environment'));
        return;
      }

      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (/* event */) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  /**
   * Load data from IndexedDB
   */
  async load(): Promise<Record<string, Document[]>> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.get('data');
        
        request.onerror = () => {
          reject(request.error);
        };
        
        request.onsuccess = () => {
          db.close();
          resolve(request.result || {});
        };
      });
    } catch (error) {
      console.error('Failed to load data from IndexedDB:', error);
      return {};
    }
  }

  /**
   * Save data to IndexedDB
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.put(data, 'data');
        
        request.onerror = () => {
          reject(request.error);
        };
        
        request.onsuccess = () => {
          db.close();
          resolve();
        };
      });
    } catch (error) {
      console.error('Failed to save data to IndexedDB:', error);
      throw error;
    }
  }
}
