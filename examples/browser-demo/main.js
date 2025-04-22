import { createDb } from '@nebula/core';
import { LocalStorageAdapter } from '@nebula/adapter-localstorage';

// Create a database with localStorage adapter
const db = createDb({
  adapter: new LocalStorageAdapter('nebula-todo-app')
});

// Get the todos collection
const todos = db.collection('todos');

// DOM elements
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoList = document.getElementById('todo-list');

// Load and render todos
async function loadTodos() {
  const allTodos = await todos.find();
  renderTodos(allTodos);
}

// Render todos to the DOM
function renderTodos(todoItems) {
  todoList.innerHTML = '';
  
  if (todoItems.length === 0) {
    todoList.innerHTML = '<li>No todos yet. Add one above!</li>';
    return;
  }
  
  todoItems.forEach(todo => {
    const li = document.createElement('li');
    li.dataset.id = todo.id;
    
    if (todo.completed) {
      li.classList.add('completed');
    }
    
    li.innerHTML = `
      <span>${todo.title}</span>
      <div class="actions">
        <button class="toggle">${todo.completed ? 'Undo' : 'Complete'}</button>
        <button class="delete">Delete</button>
      </div>
    `;
    
    // Add event listeners
    li.querySelector('.toggle').addEventListener('click', () => toggleTodo(todo.id, todo.completed));
    li.querySelector('.delete').addEventListener('click', () => deleteTodo(todo.id));
    
    todoList.appendChild(li);
  });
}

// Add a new todo
async function addTodo(title) {
  await todos.insert({
    title,
    completed: false,
    createdAt: new Date().toISOString()
  });
  
  await db.save();
  await loadTodos();
}

// Toggle todo completion status
async function toggleTodo(id, currentStatus) {
  await todos.update(
    { id },
    { $set: { completed: !currentStatus } }
  );
  
  await db.save();
  await loadTodos();
}

// Delete a todo
async function deleteTodo(id) {
  await todos.delete({ id });
  await db.save();
  await loadTodos();
}

// Event listeners
todoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = todoInput.value.trim();
  
  if (title) {
    await addTodo(title);
    todoInput.value = '';
  }
});

// Set up live query subscription
todos.subscribe({}, (results) => {
  renderTodos(results);
});

// Initial load
loadTodos();
