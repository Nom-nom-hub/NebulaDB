import { createDb } from '@nebula/core';
import { FileSystemAdapter } from '@nebula/adapter-filesystem';
import { createValidationPlugin } from '@nebula/plugin-validation';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create a schema for the todos collection
const todoSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),
  completed: z.boolean().default(false),
  createdAt: z.string().datetime().optional(),
  tags: z.array(z.string()).optional()
});

// Create a validation plugin
const validationPlugin = createValidationPlugin({
  schemas: {
    todos: todoSchema
  }
});

// Create a database with filesystem adapter and validation plugin
const db = createDb({
  adapter: new FileSystemAdapter(path.join(__dirname, 'data.json')),
  plugins: [validationPlugin]
});

// Get the todos collection
const todos = db.collection('todos');

// Example usage
async function run() {
  try {
    // Insert some todos
    console.log('Inserting todos...');
    await todos.insert({
      title: 'Learn NebulaDB',
      completed: false,
      createdAt: new Date().toISOString(),
      tags: ['learning', 'database']
    });
    
    await todos.insert({
      title: 'Build an app with NebulaDB',
      completed: false,
      createdAt: new Date().toISOString(),
      tags: ['coding', 'project']
    });
    
    // Find all todos
    console.log('\nAll todos:');
    const allTodos = await todos.find();
    console.log(allTodos);
    
    // Find incomplete todos
    console.log('\nIncomplete todos:');
    const incompleteTodos = await todos.find({ completed: false });
    console.log(incompleteTodos);
    
    // Find todos with specific tag
    console.log('\nTodos with "learning" tag:');
    const learningTodos = await todos.find({ tags: { $in: ['learning'] } });
    console.log(learningTodos);
    
    // Update a todo
    console.log('\nUpdating todo...');
    await todos.update(
      { title: 'Learn NebulaDB' },
      { $set: { completed: true } }
    );
    
    // Check the updated todo
    console.log('\nAfter update:');
    const updatedTodo = await todos.findOne({ title: 'Learn NebulaDB' });
    console.log(updatedTodo);
    
    // Delete a todo
    console.log('\nDeleting todo...');
    await todos.delete({ title: 'Build an app with NebulaDB' });
    
    // Check remaining todos
    console.log('\nRemaining todos:');
    const remainingTodos = await todos.find();
    console.log(remainingTodos);
    
    // Save the database
    await db.save();
    console.log('\nDatabase saved to disk.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
run();
