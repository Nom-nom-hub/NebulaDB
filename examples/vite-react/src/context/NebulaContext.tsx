import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createDb, IDatabase } from '@nebula/core';
import { IndexedDBAdapter } from '@nebula/adapter-indexeddb';

// Create context
interface NebulaContextType {
  db: IDatabase | null;
  loading: boolean;
  error: Error | null;
}

const NebulaContext = createContext<NebulaContextType>({
  db: null,
  loading: true,
  error: null
});

// Provider component
interface NebulaProviderProps {
  children: ReactNode;
}

export function NebulaProvider({ children }: NebulaProviderProps) {
  const [db, setDb] = useState<IDatabase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function initDatabase() {
      try {
        // Create database with IndexedDB adapter
        const database = createDb({
          adapter: new IndexedDBAdapter('nebula-react-example', 'collections', 1)
        });

        // Initialize collections
        database.collection('tasks');
        
        // Save initial state
        await database.save();
        
        setDb(database);
        setLoading(false);
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setLoading(false);
      }
    }

    initDatabase();

    // Cleanup function
    return () => {
      // Nothing to clean up for now
    };
  }, []);

  return (
    <NebulaContext.Provider value={{ db, loading, error }}>
      {children}
    </NebulaContext.Provider>
  );
}

// Custom hook to use the context
export function useNebulaDb() {
  const context = useContext(NebulaContext);
  
  if (context === undefined) {
    throw new Error('useNebulaDb must be used within a NebulaProvider');
  }
  
  return context;
}
