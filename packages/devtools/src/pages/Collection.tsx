import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { Document } from '@nebula/core';
import { DatabaseSnapshot } from '../types';
import { CollectionViewer } from '../components/CollectionViewer';
import { QueryBuilder } from '../components/QueryBuilder';
import { DocumentViewer } from '../components/DocumentViewer';

interface CollectionProps {
  socket: Socket | null;
  snapshot: DatabaseSnapshot | null;
}

export function Collection({ socket, snapshot }: CollectionProps) {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [queryResults, setQueryResults] = useState<Document[] | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  
  // Get collection documents from snapshot
  const documents = snapshot?.collections[name || ''] || [];
  
  // Handle document edit
  const handleEditDocument = (doc: Document) => {
    setSelectedDocument(doc);
  };
  
  // Handle document update
  const handleUpdateDocument = (updatedDoc: Document) => {
    socket?.emit('command', 'update_document', {
      collection: name,
      id: updatedDoc.id,
      document: updatedDoc
    });
    
    setSelectedDocument(null);
  };
  
  // Handle document delete
  const handleDeleteDocument = (doc: Document) => {
    if (window.confirm(`Are you sure you want to delete document ${doc.id}?`)) {
      socket?.emit('command', 'delete_document', {
        collection: name,
        id: doc.id
      });
    }
  };
  
  // Handle collection delete
  const handleDeleteCollection = () => {
    if (window.confirm(`Are you sure you want to delete collection ${name}?`)) {
      socket?.emit('command', 'delete_collection', { name });
      navigate('/collections');
    }
  };
  
  // Handle query execution
  const handleExecuteQuery = (collection: string, query: any) => {
    setIsQuerying(true);
    
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-nebula-900 dark:text-white">
          Collection: {name}
        </h1>
        
        <button
          onClick={handleDeleteCollection}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Delete Collection
        </button>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {/* Query Builder */}
        <div className="mb-6">
          <QueryBuilder
            collections={[name || '']}
            onExecuteQuery={handleExecuteQuery}
            results={queryResults || undefined}
            loading={isQuerying}
          />
        </div>
        
        {/* Collection Viewer */}
        <div className="mb-6">
          <CollectionViewer
            name={name || ''}
            documents={documents}
            onEdit={handleEditDocument}
            onDelete={handleDeleteDocument}
          />
        </div>
        
        {/* Document Viewer */}
        {selectedDocument && (
          <div className="mb-6">
            <DocumentViewer
              document={selectedDocument}
              onEdit={handleUpdateDocument}
            />
          </div>
        )}
      </div>
    </div>
  );
}
