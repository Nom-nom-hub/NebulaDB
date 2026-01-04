import { InMemoryAdapter } from './in-memory-adapter';
import type { NebulaDatabase, Collection, Document } from './types';

export async function createBrowserDatabase(): Promise<NebulaDatabase> {
  const adapter = new InMemoryAdapter();

  return {
    collection: (name: string) => createBrowserCollection(adapter, name),
    close: () => {}, // In-memory, no close needed
  };
}

function createBrowserCollection(adapter: InMemoryAdapter, name: string): Collection<any> {
  return {
    insert: async (doc: any) => {
      const data = await adapter.load();
      if (!data[name]) data[name] = [];
      const docWithId = { id: (doc as any).id || generateId(), ...doc } as Document;
      data[name].push(docWithId);
      await adapter.save(data);
      return docWithId;
    },

    find: async (query?: any) => {
      const data = await adapter.load();
      const docs = data[name] || [];
      if (!query) return docs;
      return docs.filter(doc => matchesQuery(doc, query));
    },

    findOne: async (query: any) => {
      const data = await adapter.load();
      const docs = data[name] || [];
      const doc = docs.find(d => matchesQuery(d, query));
      return doc || null;
    },

    update: async (query: any, update: Partial<any>) => {
      const data = await adapter.load();
      const docs = data[name] || [];
      const doc = docs.find(d => matchesQuery(d, query));
      if (!doc) return null;
      Object.assign(doc, update);
      await adapter.save(data);
      return doc;
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