import { useState } from 'react';
import { Document } from '@nebula/core';
import ReactJson from 'react-json-view';

interface DocumentViewerProps {
  document: Document;
  onEdit?: (doc: Document) => void;
  readOnly?: boolean;
}

export function DocumentViewer({ document, onEdit, readOnly = false }: DocumentViewerProps) {
  const [editedDoc, setEditedDoc] = useState<Document>(document);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Handle JSON edit
  const handleEdit = (edit: any) => {
    try {
      setEditedDoc(edit.updated_src);
      setError(null);
      return true;
    } catch (err) {
      setError(`Invalid edit: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  };
  
  // Handle save
  const handleSave = () => {
    if (onEdit) {
      onEdit(editedDoc);
      setIsEditing(false);
    }
  };
  
  // Handle cancel
  const handleCancel = () => {
    setEditedDoc(document);
    setIsEditing(false);
    setError(null);
  };
  
  return (
    <div className="bg-white dark:bg-nebula-800 rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-nebula-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-nebula-900 dark:text-white">
          Document: {document.id}
        </h2>
        
        {!readOnly && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Edit
          </button>
        )}
        
        {isEditing && (
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      
      <div className="p-4">
        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md dark:bg-red-900 dark:bg-opacity-20 dark:text-red-400">
            {error}
          </div>
        )}
        
        <ReactJson
          src={isEditing ? editedDoc : document}
          name={null}
          theme={document.documentElement.classList.contains('dark') ? 'monokai' : 'rjv-default'}
          displayDataTypes={false}
          enableClipboard={true}
          onEdit={isEditing && onEdit ? handleEdit : undefined}
          onAdd={isEditing && onEdit ? handleEdit : undefined}
          onDelete={isEditing && onEdit ? handleEdit : undefined}
        />
      </div>
    </div>
  );
}
