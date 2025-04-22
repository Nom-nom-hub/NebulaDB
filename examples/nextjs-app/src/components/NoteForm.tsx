'use client';

import { useState, FormEvent } from 'react';
import { Note } from '@/lib/nebula/hooks';

interface NoteFormProps {
  initialNote?: Note;
  onSubmit: (title: string, content: string) => void;
  isEditing?: boolean;
}

export function NoteForm({ initialNote, onSubmit, isEditing = false }: NoteFormProps) {
  const [title, setTitle] = useState(initialNote?.title || '');
  const [content, setContent] = useState(initialNote?.content || '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (title.trim() && content.trim()) {
      onSubmit(title.trim(), content.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block mb-1 text-sm font-medium text-nebula-700 dark:text-nebula-300">
          Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-nebula-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-nebula-800 dark:border-nebula-700 dark:text-white"
          placeholder="Note title"
          required
        />
      </div>
      
      <div>
        <label htmlFor="content" className="block mb-1 text-sm font-medium text-nebula-700 dark:text-nebula-300">
          Content
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-32 px-3 py-2 border border-nebula-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-nebula-800 dark:border-nebula-700 dark:text-white"
          placeholder="Write your note here..."
          required
        />
      </div>
      
      <button
        type="submit"
        className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {isEditing ? 'Update Note' : 'Create Note'}
      </button>
    </form>
  );
}
