import { useState, useEffect, useCallback } from 'react';
import { useNebulaDb } from '../context/NebulaContext';

// Task interface
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export function useTasks() {
  const { db, loading: dbLoading, error: dbError } = useNebulaDb();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load tasks
  useEffect(() => {
    if (dbLoading || !db) return;

    const tasksCollection = db.collection('tasks');
    
    // Subscribe to tasks
    const unsubscribe = tasksCollection.subscribe({}, (results) => {
      // Sort tasks by creation date (newest first)
      const sortedTasks = [...results].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      setTasks(sortedTasks as Task[]);
      setLoading(false);
    });

    // Cleanup subscription
    return () => {
      unsubscribe();
    };
  }, [db, dbLoading]);

  // Add a task
  const addTask = useCallback(async (title: string) => {
    if (!db) return null;

    try {
      const tasksCollection = db.collection('tasks');
      
      const task = await tasksCollection.insert({
        title,
        completed: false,
        createdAt: new Date().toISOString()
      });
      
      await db.save();
      return task as Task;
    } catch (err) {
      console.error('Failed to add task:', err);
      setError(err instanceof Error ? err : new Error('Failed to add task'));
      return null;
    }
  }, [db]);

  // Toggle task completion
  const toggleTask = useCallback(async (id: string) => {
    if (!db) return;

    try {
      const tasksCollection = db.collection('tasks');
      
      // Find the task
      const task = await tasksCollection.findOne({ id });
      
      if (!task) {
        throw new Error(`Task with ID ${id} not found`);
      }
      
      // Toggle completion status
      await tasksCollection.update(
        { id },
        { $set: { completed: !task.completed } }
      );
      
      await db.save();
    } catch (err) {
      console.error('Failed to toggle task:', err);
      setError(err instanceof Error ? err : new Error('Failed to toggle task'));
    }
  }, [db]);

  // Delete a task
  const deleteTask = useCallback(async (id: string) => {
    if (!db) return;

    try {
      const tasksCollection = db.collection('tasks');
      
      await tasksCollection.delete({ id });
      await db.save();
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError(err instanceof Error ? err : new Error('Failed to delete task'));
    }
  }, [db]);

  // Clear completed tasks
  const clearCompleted = useCallback(async () => {
    if (!db) return;

    try {
      const tasksCollection = db.collection('tasks');
      
      await tasksCollection.delete({ completed: true });
      await db.save();
    } catch (err) {
      console.error('Failed to clear completed tasks:', err);
      setError(err instanceof Error ? err : new Error('Failed to clear completed tasks'));
    }
  }, [db]);

  return {
    tasks,
    loading: loading || dbLoading,
    error: error || dbError,
    addTask,
    toggleTask,
    deleteTask,
    clearCompleted
  };
}
