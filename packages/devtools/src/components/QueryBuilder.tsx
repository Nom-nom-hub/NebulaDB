import { useState } from 'react';
import { Document, Query } from '@nebula/core';

interface QueryBuilderProps {
  collections: string[];
  onExecuteQuery: (collection: string, query: Query) => void;
  results?: Document[];
  loading?: boolean;
}

export function QueryBuilder({ collections, onExecuteQuery, results, loading = false }: QueryBuilderProps) {
  const [selectedCollection, setSelectedCollection] = useState<string>(collections[0] || '');
  const [queryString, setQueryString] = useState<string>('{}');
  const [error, setError] = useState<string | null>(null);
  
  // Handle query execution
  const handleExecute = () => {
    if (!selectedCollection) {
      setError('Please select a collection');
      return;
    }
    
    try {
      const query = JSON.parse(queryString);
      setError(null);
      onExecuteQuery(selectedCollection, query);
    } catch (err) {
      setError(`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  // Handle collection change
  const handleCollectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCollection(e.target.value);
  };
  
  // Handle query string change
  const handleQueryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQueryString(e.target.value);
    setError(null);
  };
  
  // Add query template
  const addQueryTemplate = (template: string) => {
    setQueryString(template);
  };
  
  return (
    <div className="bg-white dark:bg-nebula-800 rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-nebula-700">
        <h2 className="text-lg font-semibold text-nebula-900 dark:text-white">Query Builder</h2>
      </div>
      
      <div className="p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-nebula-700 dark:text-nebula-300 mb-1">
            Collection
          </label>
          <select
            value={selectedCollection}
            onChange={handleCollectionChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-nebula-700 dark:border-nebula-600 dark:text-white"
          >
            {collections.length === 0 ? (
              <option value="">No collections available</option>
            ) : (
              collections.map(collection => (
                <option key={collection} value={collection}>
                  {collection}
                </option>
              ))
            )}
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-nebula-700 dark:text-nebula-300 mb-1">
            Query (JSON)
          </label>
          <div className="mb-2 flex flex-wrap gap-2">
            <button
              onClick={() => addQueryTemplate('{}')}
              className="px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-nebula-700 dark:text-nebula-300 dark:hover:bg-nebula-600"
            >
              Empty
            </button>
            <button
              onClick={() => addQueryTemplate('{ "field": "value" }')}
              className="px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-nebula-700 dark:text-nebula-300 dark:hover:bg-nebula-600"
            >
              Equality
            </button>
            <button
              onClick={() => addQueryTemplate('{ "field": { "$gt": 10 } }')}
              className="px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-nebula-700 dark:text-nebula-300 dark:hover:bg-nebula-600"
            >
              Greater Than
            </button>
            <button
              onClick={() => addQueryTemplate('{ "field": { "$in": ["value1", "value2"] } }')}
              className="px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-nebula-700 dark:text-nebula-300 dark:hover:bg-nebula-600"
            >
              In Array
            </button>
            <button
              onClick={() => addQueryTemplate('{ "$or": [{ "field1": "value1" }, { "field2": "value2" }] }')}
              className="px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-nebula-700 dark:text-nebula-300 dark:hover:bg-nebula-600"
            >
              OR
            </button>
          </div>
          <textarea
            value={queryString}
            onChange={handleQueryChange}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono dark:bg-nebula-700 dark:border-nebula-600 dark:text-white"
            placeholder='{ "field": "value" }'
          />
          {error && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
        
        <button
          onClick={handleExecute}
          disabled={loading || !selectedCollection}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Executing...' : 'Execute Query'}
        </button>
      </div>
      
      {results && (
        <div className="p-4 border-t border-gray-200 dark:border-nebula-700">
          <h3 className="text-md font-semibold text-nebula-900 dark:text-white mb-2">
            Results ({results.length} documents)
          </h3>
          <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-96 dark:bg-nebula-700">
            <pre className="text-sm text-nebula-800 dark:text-nebula-200">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
