import { useTasks } from './hooks/useTasks';
import { TaskForm } from './components/TaskForm';
import { TaskList } from './components/TaskList';

function App() {
  const {
    tasks,
    loading,
    error,
    addTask,
    toggleTask,
    deleteTask,
    clearCompleted
  } = useTasks();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container max-w-md p-4 mx-auto">
        <header className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <img src="/logo.svg" alt="NebulaDB Logo" className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">NebulaDB Tasks</h1>
          <p className="text-gray-600">A React example using NebulaDB with IndexedDB</p>
        </header>

        <main>
          <TaskForm onAddTask={addTask} />
          
          {loading ? (
            <div className="p-4 text-center">
              <div className="inline-block w-6 h-6 border-2 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
              <p className="mt-2 text-gray-600">Loading tasks...</p>
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">
              Error: {error.message}
            </div>
          ) : (
            <TaskList
              tasks={tasks}
              onToggle={toggleTask}
              onDelete={deleteTask}
              onClearCompleted={clearCompleted}
            />
          )}
        </main>
        
        <footer className="mt-8 text-center text-sm text-gray-500">
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
    </div>
  );
}

export default App;
