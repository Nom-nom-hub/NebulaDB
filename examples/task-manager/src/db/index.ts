import { createDatabase, MemoryAdapter } from '@nebula-db/nebula-db';

// Define our Task type
export interface Task {
  id?: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt?: Date;
  dueDate?: Date;
  tags: string[];
}

// Create the database with memory adapter (could be switched to IndexedDB for persistence)
const db = createDatabase({
  adapter: new MemoryAdapter(),
  options: {
    // Adapter-specific options
  }
});

// Create a tasks collection with schema and indexes
export const tasks = db.collection<Task>('tasks', {
  schema: {
    id: { type: 'string', optional: true },
    title: { type: 'string' },
    description: { type: 'string' },
    status: { type: 'string' },
    priority: { type: 'string' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date', optional: true },
    dueDate: { type: 'date', optional: true },
    tags: { type: 'array' }
  },
  indexes: ['status', 'priority', 'dueDate']
});

// Export the database instance
export default db;

// Helper function to add sample tasks
export async function addSampleTasks() {
  // Check if we already have tasks
  const existingTasks = await tasks.find({});
  if (existingTasks.length > 0) {
    return; // Don't add sample tasks if we already have some
  }

  // Sample tasks
  const sampleTasks: Omit<Task, 'id'>[] = [
    {
      title: 'Learn NebulaDB',
      description: 'Study the documentation and examples',
      status: 'in-progress',
      priority: 'high',
      createdAt: new Date(),
      tags: ['learning', 'database']
    },
    {
      title: 'Build a demo app',
      description: 'Create a task manager to showcase NebulaDB features',
      status: 'in-progress',
      priority: 'high',
      createdAt: new Date(),
      tags: ['development', 'react']
    },
    {
      title: 'Write tests',
      description: 'Create unit tests for the application',
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      tags: ['testing', 'quality']
    },
    {
      title: 'Deploy application',
      description: 'Deploy the application to a hosting service',
      status: 'pending',
      priority: 'low',
      createdAt: new Date(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      tags: ['deployment', 'devops']
    }
  ];

  // Insert sample tasks
  for (const task of sampleTasks) {
    await tasks.insert(task);
  }
}
