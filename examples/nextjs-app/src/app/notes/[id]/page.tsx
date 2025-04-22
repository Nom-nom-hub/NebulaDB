'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotes, Note } from '@/lib/nebula/hooks';
import { NoteForm } from '@/components/NoteForm';
import Link from 'next/link';
import Image from 'next/image';

export default function NotePage({ params }: { params: { id: string } }) {
  const { getNote, updateNote, deleteNote, loading: notesLoading } = useNotes();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadNote() {
      try {
        const foundNote = await getNote(params.id);
        setNote(foundNote);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load note:', err);
        setError(err instanceof Error ? err : new Error('Failed to load note'));
        setLoading(false);
      }
    }

    if (!notesLoading) {
      loadNote();
    }
  }, [params.id, getNote, notesLoading]);

  const handleUpdateNote = async (title: string, content: string) => {
    if (!note) return;
    
    const updatedNote = await updateNote(note.id, title, content);
    if (updatedNote) {
      setNote(updatedNote);
    }
  };

  const handleDeleteNote = async () => {
    if (!note) return;
    
    await deleteNote(note.id);
    router.push('/');
  };

  if (loading || notesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-t-blue-500 border-nebula-200 rounded-full animate-spin dark:border-nebula-700"></div>
        <span className="ml-2 text-nebula-600 dark:text-nebula-400">Loading note...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="p-4 mb-4 text-red-500 bg-red-100 rounded-md dark:bg-red-900 dark:bg-opacity-20">
          Error: {error.message}
        </div>
        <Link href="/" className="text-blue-500 hover:underline">
          Back to Home
        </Link>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="p-4 mb-4 text-nebula-600 bg-nebula-100 rounded-md dark:bg-nebula-800 dark:text-nebula-400">
          Note not found
        </div>
        <Link href="/" className="text-blue-500 hover:underline">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center mb-8">
          <Link href="/" className="flex items-center">
            <Image src="/logo.svg" alt="NebulaDB Logo" width={40} height={40} className="mr-2" />
            <h1 className="text-2xl font-bold text-nebula-900 dark:text-white">
              NebulaDB Notes
            </h1>
          </Link>
        </header>

        <div className="p-6 bg-white rounded-lg shadow dark:bg-nebula-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-nebula-900 dark:text-white">
              Edit Note
            </h2>
            
            <div className="flex space-x-2">
              <Link
                href="/"
                className="px-3 py-1 text-sm text-nebula-600 bg-nebula-200 rounded hover:bg-nebula-300 dark:bg-nebula-700 dark:text-nebula-300 dark:hover:bg-nebula-600"
              >
                Cancel
              </Link>
              
              <button
                onClick={handleDeleteNote}
                className="px-3 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
          
          <NoteForm
            initialNote={note}
            onSubmit={handleUpdateNote}
            isEditing={true}
          />
        </div>
      </div>
    </main>
  );
}
