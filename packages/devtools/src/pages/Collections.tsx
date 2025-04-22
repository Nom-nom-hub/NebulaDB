import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { DatabaseSnapshot } from '../types';

interface CollectionsProps {
  socket: Socket | null;
  snapshot: DatabaseSnapshot | null;
}

export function Collections({ socket, snapshot }: CollectionsProps) {
  const [newCollectionName, setNewCollectionName] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Get collections from snapshot
  const collections = snapshot 
    ? Object.entries(snapshot.collections).map(([name, docs]) => ({
        name,
        documentCount: docs.length,
        size: JSON.stringify(docs).length
      }))
    : [];
  
  // Handle creating a new collection
  const handleCreateCollection = () => {
    if (!newCollectionName.trim()) {
      setError('Collection name cannot be empty');
      return;
    }
    
    if (collections.some(c => c.name === newCollectionName)) {
      setError('Collection already exists');
      return;
    }
    
    // Send command to create collection
    socket?.emit('command', 'create_collection', { name: newCollectionName });
    
    // Clear form
    setNewCollectionName('');
    setError(null);
  };
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-nebula-900 dark:text-white">Collections</h1>
        
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newCollectionName}
            onChange={(e) => {
              setNewCollectionName(e.target.value);
              setError(null);
            }}
            placeholder="New collection name"
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-nebula-700 dark:border-nebula-600 dark:text-white"
          />
          <button
            onClick={handleCreateCollection}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Create
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md dark:bg-red-900 dark:bg-opacity-20 dark:text-red-400">
          {error}
        </div>
      )}
      
      {collections.length === 0 ? (
        <div className="bg-white dark:bg-nebula-800 rounded-lg shadow p-8 text-center">
          <p className="text-nebula-600 dark:text-nebula-400 mb-4">No collections found</p>
          <p className="text-nebula-500 dark:text-nebula-500">
            Create a new collection to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map(collection => (
            <Link
              key={collection.name}
              to={`/collections/${collection.name}`}
              className="bg-white dark:bg-nebula-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <h2 className="text-lg font-semibold text-nebula-900 dark:text-white mb-2">
                {collection.name}
              </h2>
              <div className="space-y-1">
                <p className="text-sm text-nebula-600 dark:text-nebula-300">
                  Documents: <span className="font-medium">{collection.documentCount}</span>
                </p>
                <p className="text-sm text-nebula-600 dark:text-nebula-300">
                  Size: <span className="font-medium">{(collection.size / 1024).toFixed(2)} KB</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
