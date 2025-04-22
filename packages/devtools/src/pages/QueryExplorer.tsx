import { useState } from 'react';
import { Socket } from 'socket.io-client';
import { Document } from '@nebula/core';
import { DatabaseSnapshot } from '../types';
import { QueryBuilder } from '../components/QueryBuilder';
import { CollectionViewer } from '../components/CollectionViewer';

interface QueryExplorerProps {
  socket: Socket | null;
  snapshot: DatabaseSnapshot | null;
}

export function QueryExplorer({ socket, snapshot }: QueryExplorerProps) {
  const [queryResults, setQueryResults] = useState<Document[] | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  
  // Get collections from snapshot
  const collections = snapshot ? Object.keys(snapshot.collections) : [];
  
  // Handle query execution
  const handleExecuteQuery = (collection: string, query: any) => {
    setIsQuerying(true);
    setSelectedCollection(collection);
    
    socket?.emit('command', 'execute_query', { collection, query });
    
    // Listen for query results
    socket?.once('query_results', (data) => {
      if (data.collection === collection) {
        setQueryResults(data.results);
        setIsQuerying(false);
      }
    });
  };
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-nebula-900 dark:text-white mb-6">Query Explorer</h1>
      
      <div className="grid grid-cols-1 gap-6">
        {/* Query Builder */}
        <div className="mb-6">
          <QueryBuilder
            collections={collections}
            onExecuteQuery={handleExecuteQuery}
            loading={isQuerying}
          />
        </div>
        
        {/* Query Results */}
        {queryResults && (
          <div className="mb-6">
            <div className="bg-white dark:bg-nebula-800 rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-nebula-700">
                <h2 className="text-lg font-semibold text-nebula-900 dark:text-white">
                  Query Results ({queryResults.length} documents)
                </h2>
              </div>
              
              <div className="p-4">
                {queryResults.length === 0 ? (
                  <p className="text-nebula-500 dark:text-nebula-400">No documents match the query</p>
                ) : (
                  <CollectionViewer
                    name={selectedCollection}
                    documents={queryResults}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
