'use client';

import { useNotes } from '@/lib/nebula/hooks';
import { NoteCard } from '@/components/NoteCard';
import { NoteForm } from '@/components/NoteForm';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { notes, loading, error, addNote, deleteNote } = useNotes();
  const router = useRouter();

  const handleAddNote = async (title: string, content: string) => {
    const note = await addNote(title, content);
    if (note) {
      router.push(`/notes/${note.id}`);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col items-center mb-8">
          <Image src="/logo.svg" alt="NebulaDB Logo" width={80} height={80} className="mb-4" />
          <h1 className="text-3xl font-bold text-center text-nebula-900 dark:text-white">
            NebulaDB Notes
          </h1>
          <p className="text-center text-nebula-600 dark:text-nebula-400">
            A Next.js example using NebulaDB with IndexedDB and SSR fallback
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-xl font-semibold text-nebula-900 dark:text-white">
              Create a New Note
            </h2>
            <NoteForm onSubmit={handleAddNote} />
          </div>

          <div>
            <h2 className="mb-4 text-xl font-semibold text-nebula-900 dark:text-white">
              Your Notes
            </h2>
            
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-2 border-t-blue-500 border-nebula-200 rounded-full animate-spin dark:border-nebula-700"></div>
                <span className="ml-2 text-nebula-600 dark:text-nebula-400">Loading notes...</span>
              </div>
            ) : error ? (
              <div className="p-4 text-red-500 bg-red-100 rounded-md dark:bg-red-900 dark:bg-opacity-20">
                Error: {error.message}
              </div>
            ) : notes.length === 0 ? (
              <div className="p-8 text-center text-nebula-500 bg-nebula-100 rounded-md dark:bg-nebula-800 dark:text-nebula-400">
                No notes yet. Create your first note!
              </div>
            ) : (
              <div className="space-y-4">
                {notes.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onDelete={deleteNote}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        
        <footer className="mt-12 text-center text-sm text-nebula-500 dark:text-nebula-400">
          <p>Data is stored in your browser using IndexedDB</p>
          <p className="mt-1">
            <a
              href="https://github.com/nebula-db/nebula-db"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              NebulaDB on GitHub
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
