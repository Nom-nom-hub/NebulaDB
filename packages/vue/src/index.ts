import { ref, onMounted, onUnmounted, Ref } from 'vue';
import { createDb, Database, Document, Collection, Adapter } from '@nebula-db/core';

export function useNebulaDB(options: { adapter: Adapter; name?: string }): Database {
  return createDb({
    adapter: options.adapter,
    name: options.name
  });
}

export function useCollection<T extends Document = any>(
  db: Database,
  collectionName: string,
  live = true
) {
  const documents = ref<T[]>([]) as Ref<T[]>;
  const loading = ref(true);
  const error = ref<Error | null>(null);
  let collection: Collection | null = null;
  let unsubscribe: (() => void) | null = null;

  onMounted(async () => {
    collection = db.collection(collectionName);

    try {
      loading.value = true;
      documents.value = await collection.find({}) as T[];
      error.value = null;
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }

    if (live) {
      unsubscribe = collection.subscribe((docs) => {
        documents.value = docs as T[];
      });
    }
  });

  onUnmounted(() => {
    if (unsubscribe) unsubscribe();
  });

  return {
    documents,
    loading,
    error,
    insert: async (doc: Partial<T>) => collection?.insert(doc),
    update: async (query: any, update: Partial<T>) => collection?.update(query, update),
    remove: async (query: any) => collection?.delete(query),
    find: async (query: any = {}) => collection?.find(query) as T[],
    findOne: async (query: any) => collection?.findOne(query) as T | null
  };
}

export function useLiveQuery<T extends Document = any>(
  db: Database,
  collectionName: string,
  query: any = {}
) {
  const documents = ref<T[]>([]) as Ref<T[]>;
  const loading = ref(true);
  const error = ref<Error | null>(null);

  onMounted(async () => {
    const collection = db.collection(collectionName);

    try {
      loading.value = true;
      documents.value = await collection.find(query) as T[];
      error.value = null;
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }

    collection.subscribe((docs) => {
      documents.value = docs as T[];
    });
  });

  return { documents, loading, error };
}

export function useDocument<T extends Document = any>(
  db: Database,
  collectionName: string,
  documentId: string
) {
  const document = ref<T | null>(null) as Ref<T | null>;
  const loading = ref(true);
  const error = ref<Error | null>(null);
  let collection: Collection | null = null;
  let unsubscribe: (() => void) | null = null;

  onMounted(async () => {
    collection = db.collection(collectionName);

    try {
      loading.value = true;
      document.value = await collection.findOne({ id: documentId }) as T;
      error.value = null;
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }

    unsubscribe = collection.subscribe(
      (docs) => {
        const found = docs.find((d) => d.id === documentId);
        if (found) document.value = found as T;
      },
      { id: documentId }
    );
  });

  onUnmounted(() => {
    if (unsubscribe) unsubscribe();
  });

  return {
    document,
    loading,
    error,
    update: async (update: Partial<T>) => collection?.update({ id: documentId }, update),
    remove: async () => collection?.delete({ id: documentId })
  };
}

export { createDb };
export type { Database, Document, Collection, Adapter } from '@nebula-db/core';