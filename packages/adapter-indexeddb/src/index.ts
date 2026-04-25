import type { Adapter, Document } from '@nebula-db/core';

declare const indexedDB: IDBFactory;

export class IndexedDBAdapter implements Adapter {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;

  constructor(dbName = 'nebula-db', storeName = 'documents') {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  async load(): Promise<Record<string, Document[]>> {
    const collections: Record<string, Document[]> = {};

    try {
      const db = await this.getDB();
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const docs = request.result as Document[];
          if (docs.length === 0) {
            resolve(collections);
            return;
          }

          const grouped: Record<string, Document[]> = {};
          for (const doc of docs) {
            const collection = (doc as any)._collection || 'default';
            if (!grouped[collection]) {
              grouped[collection] = [];
            }
            grouped[collection].push(doc);
          }
          resolve(grouped);
        };
        request.onerror = () => reject(new Error('Failed to load from IndexedDB'));
      });
    } catch (error) {
      throw new Error(`Failed to load from IndexedDB: ${error}`);
    }
  }

  async save(data: Record<string, Document[]>): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);

      store.clear();

      for (const [collectionName, docs] of Object.entries(data)) {
        for (const doc of docs) {
          const docWithCollection = { ...doc, _collection: collectionName };
          store.put(docWithCollection);
        }
      }

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new Error('Failed to save to IndexedDB'));
      });
    } catch (error) {
      throw new Error(`Failed to save to IndexedDB: ${error}`);
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export function createIndexedDBAdapter(
  dbName?: string,
  storeName?: string
): IndexedDBAdapter {
  return new IndexedDBAdapter(dbName, storeName);
}