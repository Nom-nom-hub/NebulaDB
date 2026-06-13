/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from 'vitest';

// Mock indexedDB - use a synchronous approach to avoid timeout issues
const mockStore: Record<string, any[]> = {};
let openCallbacks: { onsuccess?: () => void; onerror?: () => void; onupgradeneeded?: (e: any) => void } | null = null;

const mockIndexedDB = {
  open: (_name: string, _version?: number) => {
    openCallbacks = {};
    const request = {
      get result() { return mockDB; },
      set onsuccess(fn: any) { openCallbacks!.onsuccess = fn; },
      set onerror(fn: any) { openCallbacks!.onerror = fn; },
      set onupgradeneeded(fn: any) { openCallbacks!.onupgradeneeded = fn; }
    };
    // Fire success synchronously to avoid timeout
    queueMicrotask(() => {
      if (openCallbacks?.onupgradeneeded) {
        openCallbacks.onupgradeneeded({ target: request });
      }
      if (openCallbacks?.onsuccess) {
        openCallbacks.onsuccess();
      }
    });
    return request;
  }
};

const mockDB = {
  objectStoreNames: {
    contains: (_name: string) => true
  },
  transaction: (storeName: string | string[], _mode?: string) => {
    const name = Array.isArray(storeName) ? storeName[0] : storeName;
    const pendingOps: (() => void)[] = [];
    const tx: any = {
      objectStore: () => ({
        getAll: () => {
          const req: any = {};
          pendingOps.push(() => {
            req.result = mockStore[name] || [];
            if (req.onsuccess) req.onsuccess();
          });
          return req;
        },
        put: (value: any) => {
          pendingOps.push(() => {
            if (!mockStore[name]) mockStore[name] = [];
            const idx = mockStore[name].findIndex((d: any) => d.id === value.id);
            if (idx >= 0) mockStore[name][idx] = value;
            else mockStore[name].push(value);
          });
          const req: any = {};
          pendingOps.push(() => { if (req.onsuccess) req.onsuccess(); });
          return req;
        },
        clear: () => {
          pendingOps.push(() => {
            mockStore[name] = [];
          });
          const req: any = {};
          pendingOps.push(() => { if (req.onsuccess) req.onsuccess(); });
          return req;
        }
      }),
      oncomplete: null as (() => void) | null,
      onerror: null as (() => void) | null
    };
    // Fire oncomplete AFTER all pending store operations resolve
    queueMicrotask(() => {
      // Execute all pending ops first
      for (const op of pendingOps) op();
      // Then fire oncomplete
      if (tx.oncomplete) tx.oncomplete();
    });
    return tx;
  },
  close: () => {}
};

Object.defineProperty(globalThis, 'indexedDB', {
  value: mockIndexedDB,
  writable: true
});

import { IndexedDBAdapter, createIndexedDBAdapter } from '../src/index';

describe('IndexedDBAdapter', () => {
  let adapter: IndexedDBAdapter;

  beforeEach(() => {
    Object.keys(mockStore).forEach(key => delete mockStore[key]);
    adapter = createIndexedDBAdapter('test-db', 'documents');
  });

  describe('constructor and factory', () => {
    it('should create adapter with default options', () => {
      expect(adapter).toBeInstanceOf(IndexedDBAdapter);
    });

    it('should create adapter with custom db name', () => {
      const a = createIndexedDBAdapter('custom-db', 'store');
      expect(a).toBeInstanceOf(IndexedDBAdapter);
    });
  });

  describe('save', () => {
    it('should save data to IndexedDB', async () => {
      await adapter.save({ users: [{ id: '1', name: 'Alice' }] });

      expect(mockStore['documents']).toBeDefined();
      expect(mockStore['documents']).toHaveLength(1);
      expect(mockStore['documents'][0].name).toBe('Alice');
      expect(mockStore['documents'][0]._collection).toBe('users');
    });

    it('should save multiple documents', async () => {
      await adapter.save({
        users: [
          { id: '1', name: 'Alice' },
          { id: '2', name: 'Bob' }
        ]
      });

      expect(mockStore['documents']).toHaveLength(2);
    });

    it('should tag documents with collection name', async () => {
      await adapter.save({
        users: [{ id: '1', name: 'Alice' }],
        posts: [{ id: '2', title: 'Hello' }]
      });

      const allDocs = mockStore['documents'];
      expect(allDocs.filter((d: any) => d._collection === 'users')).toHaveLength(1);
      expect(allDocs.filter((d: any) => d._collection === 'posts')).toHaveLength(1);
    });

    it('should clear store before saving', async () => {
      mockStore['documents'] = [{ id: 'old', name: 'Old', _collection: 'users' }];

      await adapter.save({ users: [{ id: 'new', name: 'New' }] });

      expect(mockStore['documents']).toHaveLength(1);
      expect(mockStore['documents'][0].name).toBe('New');
    });
  });

  describe('load', () => {
    it('should return empty object when no data', async () => {
      const data = await adapter.load();
      expect(data).toEqual({});
    });

    it('should load saved data grouped by collection', async () => {
      mockStore['documents'] = [
        { id: '1', name: 'Alice', _collection: 'users' },
        { id: '2', name: 'Bob', _collection: 'users' },
        { id: '3', title: 'Post', _collection: 'posts' }
      ];

      const data = await adapter.load();
      expect(data.users).toHaveLength(2);
      expect(data.posts).toHaveLength(1);
    });

    it('should handle documents without _collection', async () => {
      mockStore['documents'] = [{ id: '1', name: 'NoCollection' }];

      const data = await adapter.load();
      expect(data.default).toHaveLength(1);
    });
  });

  describe('close', () => {
    it('should close without error', async () => {
      await adapter.close();
    });
  });
});
