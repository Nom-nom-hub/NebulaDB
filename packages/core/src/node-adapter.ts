import { LocalstorageAdapter } from './localstorage';
import type { NebulaDatabase, Collection, Document } from './types';

export async function createNodeDatabase(): Promise<NebulaDatabase> {
  const adapter = new LocalstorageAdapter();
  await adapter.load(); // Load initial data

  return {
    collection: (name: string) => createNodeCollection(adapter, name),
    close: () => adapter.close(),
  };
}

function createNodeCollection<T = any>(adapter: LocalstorageAdapter, name: string): Collection<T> {
  return {
    insert: async (doc: T) => {
      const data = await adapter.load();
      if (!data[name]) data[name] = [];
      const docWithId = { id: (doc as any).id || generateId(), ...doc } as Document;
      data[name].push(docWithId);
      await adapter.save(data);
      return docWithId as T;
    },

    find: async (query?: any) => {
      const data = await adapter.load();
      const docs = data[name] || [];
      if (!query) return docs as T[];
      // Simple filtering
      return docs.filter(doc => matchesQuery(doc, query)) as T[];
    },

    findOne: async (query: any) => {
      const data = await adapter.load();
      const docs = data[name] || [];
      const doc = docs.find(d => matchesQuery(d, query));
      return doc as T || null;
    },

    update: async (query: any, update: Partial<T>) => {
      const data = await adapter.load();
      const docs = data[name] || [];
      const doc = docs.find(d => matchesQuery(d, query));
      if (!doc) return null;
      Object.assign(doc, update);
      await adapter.save(data);
      return doc as T;
    },

    delete: async (query: any) => {
      const data = await adapter.load();
      const docs = data[name] || [];
      const index = docs.findIndex(d => matchesQuery(d, query));
      if (index === -1) return false;
      docs.splice(index, 1);
      await adapter.save(data);
      return true;
    },
  };
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function matchesQuery(doc: Document, query: any): boolean {
  for (const [key, value] of Object.entries(query)) {
    if (doc[key] !== value) return false;
  }
  return true;
}
