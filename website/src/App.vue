<template>
  <div class="min-h-screen flex flex-col">
    <header class="bg-white shadow-sm sticky top-0 z-10">
      <nav class="container mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <img src="/logo.svg" alt="NebulaDB Logo" class="w-10 h-10" />
          <span class="text-xl font-bold text-nebula-900">NebulaDB</span>
        </div>
        <div class="hidden md:flex space-x-6">
          <a href="#features" class="text-nebula-600 hover:text-nebula-900">Features</a>
          <a href="#examples" class="text-nebula-600 hover:text-nebula-900">Examples</a>
          <a href="#docs" class="text-nebula-600 hover:text-nebula-900">Docs</a>
          <a href="https://github.com/nebula-db/nebula-db" target="_blank" class="text-nebula-600 hover:text-nebula-900">GitHub</a>
        </div>
        <div>
          <a href="#demo" class="btn btn-primary">Try Demo</a>
        </div>
      </nav>
    </header>

    <main>
      <!-- Hero Section -->
      <section class="bg-gradient-to-b from-nebula-100 to-white py-20">
        <div class="container mx-auto px-4">
          <div class="flex flex-col md:flex-row items-center">
            <div class="md:w-1/2 mb-10 md:mb-0">
              <h1 class="text-4xl md:text-5xl font-bold mb-4">
                Fast. Flexible. Serverless.
              </h1>
              <p class="text-xl text-nebula-600 mb-8">
                The embedded database for the modern stack.
              </p>
              <p class="text-nebula-600 mb-8 max-w-lg">
                NebulaDB is a reactive, TypeScript-first, schema-optional, embeddable NoSQL database that runs in the browser, Node.js, and Edge environments.
              </p>
              <div class="flex space-x-4">
                <a href="#getting-started" class="btn btn-primary">Get Started</a>
                <a href="https://github.com/nebula-db/nebula-db" target="_blank" class="btn btn-outline">GitHub</a>
              </div>
            </div>
            <div class="md:w-1/2">
              <div class="code-block">
                <pre><code>import { createDb } from '@nebula/core';
import { MemoryAdapter } from '@nebula/adapter-memory';

// Create a database with in-memory adapter
const db = createDb({ adapter: new MemoryAdapter() });

// Create a collection
const users = db.collection('users');

// Insert documents
await users.insert({ name: 'Alice', age: 30 });
await users.insert({ name: 'Bob', age: 25 });

// Query documents
const result = await users.find({ age: { $gt: 20 } });
console.log(result);

// Subscribe to changes
users.subscribe({ age: { $gt: 30 } }, (result) => {
  console.log('Users over 30:', result);
});</code></pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section id="features" class="py-20">
        <div class="container mx-auto px-4">
          <h2 class="text-3xl font-bold text-center mb-12">Features</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="card">
              <div class="text-accent-blue text-4xl mb-4">🚀</div>
              <h3 class="text-xl font-semibold mb-2">Blazing Fast</h3>
              <p class="text-nebula-600">In-memory operations with optional persistence for maximum performance.</p>
            </div>
            <div class="card">
              <div class="text-accent-purple text-4xl mb-4">🔄</div>
              <h3 class="text-xl font-semibold mb-2">Reactive</h3>
              <p class="text-nebula-600">Live queries that update in real-time when your data changes.</p>
            </div>
            <div class="card">
              <div class="text-accent-green text-4xl mb-4">📐</div>
              <h3 class="text-xl font-semibold mb-2">TypeScript-First</h3>
              <p class="text-nebula-600">Full type safety with your data for a better developer experience.</p>
            </div>
            <div class="card">
              <div class="text-accent-red text-4xl mb-4">🧩</div>
              <h3 class="text-xl font-semibold mb-2">Modular</h3>
              <p class="text-nebula-600">Use only what you need with adapters and plugins for maximum flexibility.</p>
            </div>
            <div class="card">
              <div class="text-accent-blue text-4xl mb-4">🌐</div>
              <h3 class="text-xl font-semibold mb-2">Universal</h3>
              <p class="text-nebula-600">Works in browsers, Node.js, and Edge environments without modification.</p>
            </div>
            <div class="card">
              <div class="text-accent-purple text-4xl mb-4">🔌</div>
              <h3 class="text-xl font-semibold mb-2">Extensible</h3>
              <p class="text-nebula-600">Create custom adapters and plugins to extend functionality.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Getting Started Section -->
      <section id="getting-started" class="py-20 bg-nebula-100">
        <div class="container mx-auto px-4">
          <h2 class="text-3xl font-bold text-center mb-12">Getting Started</h2>
          <div class="max-w-3xl mx-auto">
            <div class="card mb-8">
              <h3 class="text-xl font-semibold mb-4">Installation</h3>
              <div class="code-block mb-4">
                <pre><code># Install core package
npm install @nebula/core

# Install adapters as needed
npm install @nebula/adapter-memory
npm install @nebula/adapter-localstorage
npm install @nebula/adapter-indexeddb
npm install @nebula/adapter-filesystem

# Install plugins as needed
npm install @nebula/plugin-validation
npm install @nebula/plugin-encryption
npm install @nebula/plugin-versioning</code></pre>
              </div>
            </div>
            <div class="card">
              <h3 class="text-xl font-semibold mb-4">Basic Usage</h3>
              <div class="code-block">
                <pre><code>import { createDb } from '@nebula/core';
import { LocalStorageAdapter } from '@nebula/adapter-localstorage';

// Create a database with localStorage adapter
const db = createDb({
  adapter: new LocalStorageAdapter('my-app')
});

// Create a collection
const todos = db.collection('todos');

// Insert a document
await todos.insert({
  title: 'Learn NebulaDB',
  completed: false,
  createdAt: new Date().toISOString()
});

// Query documents
const incompleteTodos = await todos.find({ completed: false });

// Update a document
await todos.update(
  { title: 'Learn NebulaDB' },
  { $set: { completed: true } }
);

// Subscribe to changes
todos.subscribe({ completed: true }, (completedTodos) => {
  console.log('Completed todos:', completedTodos);
});</code></pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Examples Section -->
      <section id="examples" class="py-20">
        <div class="container mx-auto px-4">
          <h2 class="text-3xl font-bold text-center mb-12">Examples</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div class="card">
              <h3 class="text-xl font-semibold mb-4">Todo App</h3>
              <p class="text-nebula-600 mb-4">A simple todo application using NebulaDB with localStorage persistence.</p>
              <div class="code-block mb-4">
                <pre><code>const todos = db.collection('todos');

// Add a new todo
async function addTodo(title) {
  return await todos.insert({
    title,
    completed: false,
    createdAt: new Date().toISOString()
  });
}

// Toggle todo completion
async function toggleTodo(id) {
  const todo = await todos.findOne({ id });
  if (todo) {
    await todos.update(
      { id },
      { $set: { completed: !todo.completed } }
    );
  }
}

// Get active todos
todos.subscribe(
  { completed: false },
  (activeTodos) => {
    renderTodoList(activeTodos);
  }
);</code></pre>
              </div>
              <a href="https://github.com/nebula-db/examples/todo" target="_blank" class="text-accent-blue hover:underline">View full example →</a>
            </div>
            <div class="card">
              <h3 class="text-xl font-semibold mb-4">Blog App</h3>
              <p class="text-nebula-600 mb-4">A blog application using NebulaDB with file system persistence.</p>
              <div class="code-block mb-4">
                <pre><code>const posts = db.collection('posts');
const comments = db.collection('comments');

// Create a new post
async function createPost(title, content, author) {
  return await posts.insert({
    title,
    content,
    author,
    createdAt: new Date().toISOString()
  });
}

// Add a comment to a post
async function addComment(postId, author, content) {
  return await comments.insert({
    postId,
    author,
    content,
    createdAt: new Date().toISOString()
  });
}

// Get post with comments
async function getPostWithComments(postId) {
  const post = await posts.findOne({ id: postId });
  const postComments = await comments.find({ postId });
  return { ...post, comments: postComments };
}</code></pre>
              </div>
              <a href="https://github.com/nebula-db/examples/blog" target="_blank" class="text-accent-blue hover:underline">View full example →</a>
            </div>
          </div>
        </div>
      </section>

      <!-- Demo Section -->
      <section id="demo" class="py-20 bg-nebula-900 text-white">
        <div class="container mx-auto px-4">
          <h2 class="text-3xl font-bold text-center mb-12">Interactive Demo</h2>
          <div class="max-w-4xl mx-auto">
            <div class="bg-nebula-800 rounded-xl p-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 class="text-xl font-semibold mb-4">Code</h3>
                  <textarea
                    v-model="demoCode"
                    class="w-full h-64 bg-nebula-900 text-nebula-50 p-4 rounded-lg font-mono text-sm"
                    spellcheck="false"
                  ></textarea>
                  <button @click="runDemo" class="btn btn-primary mt-4">Run</button>
                </div>
                <div>
                  <h3 class="text-xl font-semibold mb-4">Result</h3>
                  <div class="w-full h-64 bg-nebula-900 text-nebula-50 p-4 rounded-lg font-mono text-sm overflow-auto">
                    <pre><code>{{ demoResult }}</code></pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Documentation Section -->
      <section id="docs" class="py-20">
        <div class="container mx-auto px-4">
          <h2 class="text-3xl font-bold text-center mb-12">Documentation</h2>
          <div class="max-w-4xl mx-auto">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <a href="https://github.com/nebula-db/nebula-db/blob/main/docs/README.md" target="_blank" class="card hover:shadow-lg transition-shadow">
                <h3 class="text-xl font-semibold mb-2">Getting Started</h3>
                <p class="text-nebula-600">Learn the basics of NebulaDB and how to use it in your projects.</p>
              </a>
              <a href="https://github.com/nebula-db/nebula-db/blob/main/docs/api-reference.md" target="_blank" class="card hover:shadow-lg transition-shadow">
                <h3 class="text-xl font-semibold mb-2">API Reference</h3>
                <p class="text-nebula-600">Detailed documentation of the NebulaDB API.</p>
              </a>
              <a href="https://github.com/nebula-db/nebula-db/blob/main/docs/examples.md" target="_blank" class="card hover:shadow-lg transition-shadow">
                <h3 class="text-xl font-semibold mb-2">Examples</h3>
                <p class="text-nebula-600">Example applications and code snippets.</p>
              </a>
              <a href="https://github.com/nebula-db/nebula-db/blob/main/docs/adapters.md" target="_blank" class="card hover:shadow-lg transition-shadow">
                <h3 class="text-xl font-semibold mb-2">Adapters</h3>
                <p class="text-nebula-600">Learn about the available storage adapters and how to create your own.</p>
              </a>
              <a href="https://github.com/nebula-db/nebula-db/blob/main/docs/plugins.md" target="_blank" class="card hover:shadow-lg transition-shadow">
                <h3 class="text-xl font-semibold mb-2">Plugins</h3>
                <p class="text-nebula-600">Extend NebulaDB with plugins for validation, encryption, and more.</p>
              </a>
              <a href="https://github.com/nebula-db/nebula-db/blob/main/docs/advanced-usage.md" target="_blank" class="card hover:shadow-lg transition-shadow">
                <h3 class="text-xl font-semibold mb-2">Advanced Usage</h3>
                <p class="text-nebula-600">Advanced patterns and techniques for using NebulaDB.</p>
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="bg-nebula-900 text-white py-12">
      <div class="container mx-auto px-4">
        <div class="flex flex-col md:flex-row justify-between">
          <div class="mb-8 md:mb-0">
            <div class="flex items-center space-x-2 mb-4">
              <img src="/logo.svg" alt="NebulaDB Logo" class="w-8 h-8" />
              <span class="text-lg font-bold">NebulaDB</span>
            </div>
            <p class="text-nebula-400 max-w-md">
              NebulaDB is a reactive, TypeScript-first, schema-optional, embeddable NoSQL database that runs in the browser, Node.js, and Edge environments.
            </p>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <h3 class="text-lg font-semibold mb-4">Resources</h3>
              <ul class="space-y-2">
                <li><a href="#docs" class="text-nebula-400 hover:text-white">Documentation</a></li>
                <li><a href="#examples" class="text-nebula-400 hover:text-white">Examples</a></li>
                <li><a href="https://github.com/nebula-db/nebula-db/blob/main/CHANGELOG.md" target="_blank" class="text-nebula-400 hover:text-white">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h3 class="text-lg font-semibold mb-4">Community</h3>
              <ul class="space-y-2">
                <li><a href="https://github.com/nebula-db/nebula-db" target="_blank" class="text-nebula-400 hover:text-white">GitHub</a></li>
                <li><a href="https://github.com/nebula-db/nebula-db/issues" target="_blank" class="text-nebula-400 hover:text-white">Issues</a></li>
                <li><a href="https://github.com/nebula-db/nebula-db/blob/main/CONTRIBUTING.md" target="_blank" class="text-nebula-400 hover:text-white">Contributing</a></li>
              </ul>
            </div>
            <div>
              <h3 class="text-lg font-semibold mb-4">Legal</h3>
              <ul class="space-y-2">
                <li><a href="https://github.com/nebula-db/nebula-db/blob/main/LICENSE" target="_blank" class="text-nebula-400 hover:text-white">License</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div class="border-t border-nebula-800 mt-12 pt-8 text-center text-nebula-400">
          <p>© {{ new Date().getFullYear() }} NebulaDB. Released under the MIT License.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { createDb, MemoryAdapter } from '@nebula/core';

const demoCode = ref(`// Create a database with in-memory adapter
const db = createDb({ adapter: new MemoryAdapter() });

// Create a collection
const users = db.collection('users');

// Insert documents
await users.insert({ name: 'Alice', age: 30 });
await users.insert({ name: 'Bob', age: 25 });
await users.insert({ name: 'Charlie', age: 35 });

// Query documents
const result = await users.find({ age: { $gt: 25 } });
console.log(result);`);

const demoResult = ref('// Run the code to see the result');

async function runDemo() {
  try {
    demoResult.value = '// Running...';
    
    // Create a new Function from the code string
    const asyncFunction = new Function('createDb', 'MemoryAdapter', `
      return (async () => {
        const logs = [];
        const originalConsoleLog = console.log;
        console.log = (...args) => {
          logs.push(args);
          originalConsoleLog(...args);
        };
        
        try {
          ${demoCode.value}
          return logs;
        } finally {
          console.log = originalConsoleLog;
        }
      })();
    `);
    
    // Execute the function
    const logs = await asyncFunction(createDb, MemoryAdapter);
    
    // Format the result
    demoResult.value = logs.map(args => {
      return args.map(arg => {
        if (typeof arg === 'object') {
          return JSON.stringify(arg, null, 2);
        }
        return String(arg);
      }).join(' ');
    }).join('\n');
    
  } catch (error) {
    demoResult.value = `// Error: ${error.message}`;
  }
}
</script>
