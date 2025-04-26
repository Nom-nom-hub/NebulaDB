import { useEffect, useState } from 'react';
import { Task, tasks, addSampleTasks } from './db';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';
import TaskFilter from './components/TaskFilter';
import './App.css';

function App() {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: 'all',
    priority: 'all',
    searchTerm: ''
  });

  // Load tasks on component mount
  useEffect(() => {
    const initializeData = async () => {
      await addSampleTasks();
      setLoading(false);
    };

    initializeData();
  }, []);

  // Set up reactive query for tasks
  useEffect(() => {
    const subscription = tasks.findReactive({}).subscribe(results => {
      setAllTasks(results);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Apply filters whenever allTasks or filter changes
  useEffect(() => {
    let filtered = [...allTasks];

    // Filter by status
    if (filter.status !== 'all') {
      filtered = filtered.filter(task => task.status === filter.status);
    }

    // Filter by priority
    if (filter.priority !== 'all') {
      filtered = filtered.filter(task => task.priority === filter.priority);
    }

    // Filter by search term
    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      filtered = filtered.filter(
        task => 
          task.title.toLowerCase().includes(term) || 
          task.description.toLowerCase().includes(term) ||
          task.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    setFilteredTasks(filtered);
  }, [allTasks, filter]);

  // Add a new task
  const handleAddTask = async (task: Omit<Task, 'id'>) => {
    await tasks.insert(task);
  };

  // Update a task
  const handleUpdateTask = async (task: Task) => {
    if (task.id) {
      await tasks.update({ id: task.id }, { $set: { ...task, updatedAt: new Date() } });
    }
  };

  // Delete a task
  const handleDeleteTask = async (taskId: string) => {
    await tasks.remove({ id: taskId });
  };

  // Update task status
  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    await tasks.update({ id: taskId }, { $set: { status: newStatus, updatedAt: new Date() } });
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>NebulaDB Task Manager</h1>
        <p className="subtitle">Powered by NebulaDB's reactive queries</p>
      </header>

      <main>
        <div className="app-container">
          <div className="sidebar">
            <TaskForm onAddTask={handleAddTask} />
            <TaskFilter filter={filter} setFilter={setFilter} />
            <div className="stats">
              <h3>Statistics</h3>
              <p>Total Tasks: {allTasks.length}</p>
              <p>Pending: {allTasks.filter(t => t.status === 'pending').length}</p>
              <p>In Progress: {allTasks.filter(t => t.status === 'in-progress').length}</p>
              <p>Completed: {allTasks.filter(t => t.status === 'completed').length}</p>
            </div>
          </div>

          <div className="content">
            <TaskList 
              tasks={filteredTasks} 
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>
      </main>

      <footer>
        <p>
          This demo showcases NebulaDB's reactive queries, type safety, and CRUD operations.
          Changes are automatically reflected in real-time across the UI.
        </p>
      </footer>
    </div>
  );
}

export default App;
