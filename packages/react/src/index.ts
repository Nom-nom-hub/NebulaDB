import { useState, useEffect, useCallback, useRef } from 'react';
import { createDb, Database, Document, Collection } from '@nebula-db/core';
import { Adapter } from '@nebula-db/core';

export interface UseNebulaDBOptions {
  adapter: Adapter;
  name?: string;
}

export interface UseCollectionOptions {
  live?: boolean;
}

export function useNebulaDB(options: UseNebulaDBOptions): Database {
  const dbRef = useRef<Database | null>(null);

  if (!dbRef.current) {
    dbRef.current = createDb({
      adapter: options.adapter,
      name: options.name
    });
  }

  return dbRef.current;
}

export function useCollection<T extends Document = any>(
  db: Database,
  collectionName: string,
  options: UseCollectionOptions = {}
) {
  const [documents, setDocuments] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const collectionRef = useRef<Collection | null>(null);

  useEffect(() => {
    const collection = db.collection(collectionName);
    collectionRef.current = collection;

    const loadDocuments = async () => {
      try {
        setLoading(true);
        const docs = await collection.find({});
        setDocuments(docs as T[]);
        setError(null);
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();

    if (options.live !== false) {
      const unsubscribe = collection.subscribe((docs) => {
        setDocuments(docs as T[]);
      });

      return () => unsubscribe();
    }
  }, [db, collectionName]);

  const insert = useCallback(
    async (doc: Partial<T>) => {
      const result = await collectionRef.current?.insert(doc);
      return result;
    },
    [collectionName]
  );

  const update = useCallback(
    async (query: any, update: Partial<T>) => {
      const result = await collectionRef.current?.update(query, update);
      return result;
    },
    [collectionName]
  );

  const remove = useCallback(
    async (query: any) => {
      const result = await collectionRef.current?.delete(query);
      return result;
    },
    [collectionName]
  );

  const find = useCallback(
    async (query: any = {}) => {
      const result = await collectionRef.current?.find(query);
      return result as T[];
    },
    [collectionName]
  );

  const findOne = useCallback(
    async (query: any) => {
      const result = await collectionRef.current?.findOne(query);
      return result as T | null;
    },
    [collectionName]
  );

  return {
    documents,
    loading,
    error,
    insert,
    update,
    remove,
    find,
    findOne,
    collection: collectionRef.current
  };
}

export function useLiveQuery<T extends Document = any>(
  db: Database,
  collectionName: string,
  query: any = {},
  options: { initialValue?: T[] } = {}
) {
  const [documents, setDocuments] = useState<T[]>(options.initialValue || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const collectionRef = useRef<Collection | null>(null);

  useEffect(() => {
    const collection = db.collection(collectionName);
    collectionRef.current = collection;

    const runQuery = async () => {
      try {
        setLoading(true);
        const docs = await collection.find(query);
        setDocuments(docs as T[]);
        setError(null);
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    };

    runQuery();

    const unsubscribe = collection.subscribe((docs) => {
      setDocuments(docs as T[]);
    });

    return () => unsubscribe();
  }, [db, collectionName, JSON.stringify(query)]);

  return { documents, loading, error };
}

export function useDocument<T extends Document = any>(
  db: Database,
  collectionName: string,
  documentId: string
) {
  const [document, setDocument] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const collectionRef = useRef<Collection | null>(null);

  useEffect(() => {
    const collection = db.collection(collectionName);
    collectionRef.current = collection;

    const loadDocument = async () => {
      try {
        setLoading(true);
        const doc = await collection.findOne({ id: documentId });
        setDocument(doc as T);
        setError(null);
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    };

    loadDocument();

    const unsubscribe = collection.subscribe(
      (docs) => {
        const found = docs.find((d) => d.id === documentId);
        if (found) {
          setDocument(found as T);
        }
      },
      { id: documentId }
    );

    return () => unsubscribe();
  }, [db, collectionName, documentId]);

  const update = useCallback(
    async (update: Partial<T>) => {
      const result = await collectionRef.current?.update(
        { id: documentId },
        update
      );
      return result;
    },
    [collectionName, documentId]
  );

  const remove = useCallback(async () => {
    const result = await collectionRef.current?.delete({ id: documentId });
    return result;
  }, [collectionName, documentId]);

  return { document, loading, error, update, remove };
}

export { createDb };
export type { Database, Document, Collection, Adapter } from '@nebula-db/core';