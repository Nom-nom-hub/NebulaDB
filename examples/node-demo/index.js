// Import packages
import pkg1 from '@nebula-db/nebula-db';
const { createDatabase } = pkg1;

import pkg2 from '@nebula-db/adapter-memory';
const { MemoryAdapter } = pkg2;

import pkg3 from '@nebula-db/adapter-filesystem';
const { FilesystemAdapter } = pkg3;
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

// Console styling functions
const log = {
  title: (text) => console.log(chalk.bold.blue(`\n=== ${text} ===`)),
  info: (text) => console.log(chalk.cyan(`ℹ️ ${text}`)),
  success: (text) => console.log(chalk.green(`✅ ${text}`)),
  error: (text) => console.log(chalk.red(`❌ ${text}`)),
  warning: (text) => console.log(chalk.yellow(`⚠️ ${text}`)),
  data: (obj) => console.log(chalk.gray(JSON.stringify(obj, null, 2))),
  divider: () => console.log(chalk.gray('-'.repeat(50)))
};

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create a database with memory adapter
const db = createDatabase({
  adapter: new MemoryAdapter(),
  options: {}
});

// We could also use a filesystem adapter for persistence
// const db = createDatabase({
//   adapter: new FilesystemAdapter(path.join(__dirname, 'data')),
//   options: {}
// });

// Define the todos collection with schema
const todos = db.collection('todos', {
  schema: {
    id: { type: 'string', optional: true },
    title: { type: 'string' },
    completed: { type: 'boolean' },
    createdAt: { type: 'date' },
    tags: { type: 'array', optional: true }
  }
});

// Example usage
async function run() {
  try {
    log.title('NebulaDB Node.js Demo');
    log.info('Demonstrating NebulaDB in a Node.js environment');
    log.divider();

    // Insert some todos
    log.title('Creating and Inserting Data');
    log.info('Inserting sample todos...');
    await todos.insert({
      title: 'Learn NebulaDB',
      completed: false,
      createdAt: new Date(),
      tags: ['learning', 'database']
    });

    await todos.insert({
      title: 'Build an app with NebulaDB',
      completed: false,
      createdAt: new Date(),
      tags: ['coding', 'project']
    });

    log.success('Sample todos inserted successfully');

    // Find all todos
    log.title('Basic Queries');
    log.info('Finding all todos');
    const allTodos = await todos.find();
    log.success(`Found ${allTodos.length} todos:`);
    log.data(allTodos);

    // Find incomplete todos
    log.info('Finding incomplete todos');
    const incompleteTodos = await todos.find({ completed: false });
    log.success(`Found ${incompleteTodos.length} incomplete todos:`);
    log.data(incompleteTodos);

    // Find todos with specific tag
    log.info('Finding todos with "learning" tag');
    const learningTodos = await todos.find({ tags: { $contains: 'learning' } });
    log.success(`Found ${learningTodos.length} todos with learning tag:`);
    log.data(learningTodos);

    // Update a todo
    log.title('Updating Data');
    log.info('Updating a todo to mark it as completed');
    await todos.update(
      { title: 'Learn NebulaDB' },
      { $set: { completed: true } }
    );

    // Check the updated todo
    log.info('Fetching the updated todo');
    const updatedTodo = await todos.findOne({ title: 'Learn NebulaDB' });
    log.success('Todo updated successfully:');
    log.data(updatedTodo);

    // Delete a todo
    log.title('Deleting Data');
    log.info('Deleting a todo');
    await todos.delete({ title: 'Build an app with NebulaDB' });
    log.success('Todo deleted successfully');

    // Check remaining todos
    log.info('Fetching remaining todos');
    const remainingTodos = await todos.find();
    log.success(`${remainingTodos.length} todos remaining:`);
    log.data(remainingTodos);

    // With NebulaDB, changes are saved automatically
    log.divider();
    log.success('All operations completed successfully!');

  } catch (error) {
    log.error(`Demo failed with error: ${error.message}`);
    console.error(error);
  }
}

// Run the example
run();
