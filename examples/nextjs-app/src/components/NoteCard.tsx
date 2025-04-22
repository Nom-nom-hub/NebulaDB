'use client';

import { Note } from '@/lib/nebula/hooks';
import Link from 'next/link';

interface NoteCardProps {
  note: Note;
  onDelete: (id: string) => void;
}

export function NoteCard({ note, onDelete }: NoteCardProps) {
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow dark:bg-nebula-800">
      <h3 className="mb-2 text-lg font-semibold text-nebula-900 dark:text-white">
        {note.title}
      </h3>
      
      <p className="mb-4 text-nebula-600 line-clamp-2 dark:text-nebula-300">
        {note.content}
      </p>
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-nebula-500 dark:text-nebula-400">
          Updated: {formatDate(note.updatedAt)}
        </span>
        
        <div className="flex space-x-2">
          <Link
            href={`/notes/${note.id}`}
            className="px-3 py-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600"
          >
            Edit
          </Link>
          
          <button
            onClick={() => onDelete(note.id)}
            className="px-3 py-1 text-xs text-white bg-red-500 rounded hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
