# Examples

This document provides examples of how to use NebulaDB in different scenarios.

## Basic CRUD Operations

```typescript
import { createDb } from '@nebula/core';
import { MemoryAdapter } from '@nebula/adapter-memory';

// Create a database
const db = createDb({ adapter: new MemoryAdapter() });
const users = db.collection('users');

// Create (Insert)
const alice = await users.insert({
  name: 'Alice',
  age: 30,
  email: 'alice@example.com'
});

console.log('Inserted user:', alice);

// Read (Find)
const allUsers = await users.find();
console.log('All users:', allUsers);

const user = await users.findOne({ name: 'Alice' });
console.log('Found user:', user);

// Update
await users.update(
  { id: alice.id },
  { $set: { age: 31 } }
);

const updatedUser = await users.findOne({ id: alice.id });
console.log('Updated user:', updatedUser);

// Delete
await users.delete({ id: alice.id });

const remainingUsers = await users.find();
console.log('Remaining users:', remainingUsers);
```

## Todo List Application

```typescript
import { createDb } from '@nebula/core';
import { LocalStorageAdapter } from '@nebula/adapter-localstorage';

// Create a database with localStorage persistence
const db = createDb({
  adapter: new LocalStorageAdapter('todo-app')
});

const todos = db.collection('todos');

// Add a new todo
async function addTodo(title) {
  return await todos.insert({
    title,
    completed: false,
    createdAt: new Date().toISOString()
  });
}

// Toggle todo completion status
async function toggleTodo(id) {
  const todo = await todos.findOne({ id });
  if (todo) {
    await todos.update(
      { id },
      { $set: { completed: !todo.completed } }
    );
  }
}

// Delete a todo
async function deleteTodo(id) {
  await todos.delete({ id });
}

// Get all todos
async function getAllTodos() {
  return await todos.find();
}

// Get active todos
async function getActiveTodos() {
  return await todos.find({ completed: false });
}

// Get completed todos
async function getCompletedTodos() {
  return await todos.find({ completed: true });
}

// Clear completed todos
async function clearCompletedTodos() {
  await todos.delete({ completed: true });
}

// Example usage
async function run() {
  // Add some todos
  await addTodo('Learn NebulaDB');
  await addTodo('Build a todo app');
  await addTodo('Write documentation');
  
  // Display all todos
  console.log('All todos:', await getAllTodos());
  
  // Toggle a todo
  const firstTodo = (await getAllTodos())[0];
  await toggleTodo(firstTodo.id);
  
  // Display active and completed todos
  console.log('Active todos:', await getActiveTodos());
  console.log('Completed todos:', await getCompletedTodos());
  
  // Clear completed todos
  await clearCompletedTodos();
  
  // Display remaining todos
  console.log('Remaining todos:', await getAllTodos());
}

run();
```

## Blog Application

```typescript
import { createDb } from '@nebula/core';
import { FileSystemAdapter } from '@nebula/adapter-filesystem';
import path from 'path';

// Create a database with file system persistence
const db = createDb({
  adapter: new FileSystemAdapter(path.join(__dirname, 'blog-data.json'))
});

// Define collections
const users = db.collection('users');
const posts = db.collection('posts');
const comments = db.collection('comments');

// User functions
async function createUser(userData) {
  return await users.insert({
    ...userData,
    createdAt: new Date().toISOString()
  });
}

async function getUserById(id) {
  return await users.findOne({ id });
}

// Post functions
async function createPost(userId, postData) {
  return await posts.insert({
    ...postData,
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

async function updatePost(id, postData) {
  await posts.update(
    { id },
    {
      $set: {
        ...postData,
        updatedAt: new Date().toISOString()
      }
    }
  );
  return await posts.findOne({ id });
}

async function deletePost(id) {
  // Delete the post
  await posts.delete({ id });
  
  // Delete associated comments
  await comments.delete({ postId: id });
}

async function getPostById(id) {
  return await posts.findOne({ id });
}

async function getPostsByUser(userId) {
  return await posts.find({ userId });
}

async function getAllPosts() {
  return await posts.find();
}

// Comment functions
async function createComment(userId, postId, content) {
  return await comments.insert({
    userId,
    postId,
    content,
    createdAt: new Date().toISOString()
  });
}

async function getCommentsByPost(postId) {
  return await comments.find({ postId });
}

// Get post with author and comments
async function getPostWithDetails(id) {
  const post = await getPostById(id);
  if (!post) return null;
  
  const author = await getUserById(post.userId);
  const postComments = await getCommentsByPost(id);
  
  // Get comment authors
  const commentUserIds = [...new Set(postComments.map(c => c.userId))];
  const commentAuthors = await Promise.all(
    commentUserIds.map(id => getUserById(id))
  );
  
  // Map user IDs to user objects
  const userMap = commentAuthors.reduce((map, user) => {
    map[user.id] = user;
    return map;
  }, {});
  
  // Add author to each comment
  const commentsWithAuthors = postComments.map(comment => ({
    ...comment,
    author: userMap[comment.userId]
  }));
  
  return {
    ...post,
    author,
    comments: commentsWithAuthors
  };
}

// Example usage
async function run() {
  // Create users
  const alice = await createUser({
    username: 'alice',
    email: 'alice@example.com',
    name: 'Alice Johnson'
  });
  
  const bob = await createUser({
    username: 'bob',
    email: 'bob@example.com',
    name: 'Bob Smith'
  });
  
  // Create posts
  const post1 = await createPost(alice.id, {
    title: 'Introduction to NebulaDB',
    content: 'NebulaDB is a flexible embedded database...'
  });
  
  const post2 = await createPost(bob.id, {
    title: 'Building Apps with NebulaDB',
    content: 'In this tutorial, we will build a simple app...'
  });
  
  // Add comments
  await createComment(bob.id, post1.id, 'Great introduction!');
  await createComment(alice.id, post2.id, 'Nice tutorial, very helpful.');
  
  // Get post with details
  const postWithDetails = await getPostWithDetails(post1.id);
  console.log(JSON.stringify(postWithDetails, null, 2));
  
  // Save the database
  await db.save();
}

run();
```

## Real-time Chat Application

```typescript
import { createDb } from '@nebula/core';
import { MemoryAdapter } from '@nebula/adapter-memory';

// Create a database
const db = createDb({ adapter: new MemoryAdapter() });

// Define collections
const users = db.collection('users');
const rooms = db.collection('rooms');
const messages = db.collection('messages');

// User functions
async function createUser(username) {
  return await users.insert({
    username,
    online: true,
    lastSeen: new Date().toISOString()
  });
}

async function setUserStatus(userId, online) {
  await users.update(
    { id: userId },
    {
      $set: {
        online,
        lastSeen: new Date().toISOString()
      }
    }
  );
}

// Room functions
async function createRoom(name, createdBy) {
  return await rooms.insert({
    name,
    createdBy,
    createdAt: new Date().toISOString(),
    participants: [createdBy]
  });
}

async function joinRoom(roomId, userId) {
  const room = await rooms.findOne({ id: roomId });
  if (!room) throw new Error('Room not found');
  
  if (!room.participants.includes(userId)) {
    await rooms.update(
      { id: roomId },
      { $push: { participants: userId } }
    );
  }
}

async function leaveRoom(roomId, userId) {
  const room = await rooms.findOne({ id: roomId });
  if (!room) throw new Error('Room not found');
  
  await rooms.update(
    { id: roomId },
    {
      $set: {
        participants: room.participants.filter(id => id !== userId)
      }
    }
  );
}

// Message functions
async function sendMessage(roomId, userId, content) {
  return await messages.insert({
    roomId,
    userId,
    content,
    timestamp: new Date().toISOString(),
    read: [userId]
  });
}

async function markMessageAsRead(messageId, userId) {
  const message = await messages.findOne({ id: messageId });
  if (!message) throw new Error('Message not found');
  
  if (!message.read.includes(userId)) {
    await messages.update(
      { id: messageId },
      { $push: { read: userId } }
    );
  }
}

async function getRoomMessages(roomId) {
  return await messages.find({ roomId });
}

// Subscribe to new messages in a room
function subscribeToRoomMessages(roomId, callback) {
  return messages.subscribe(
    { roomId },
    (roomMessages) => {
      // Sort messages by timestamp
      const sortedMessages = [...roomMessages].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
      callback(sortedMessages);
    }
  );
}

// Example usage
async function run() {
  // Create users
  const alice = await createUser('alice');
  const bob = await createUser('bob');
  
  // Create a room
  const room = await createRoom('General', alice.id);
  
  // Bob joins the room
  await joinRoom(room.id, bob.id);
  
  // Subscribe to messages
  const unsubscribe = subscribeToRoomMessages(room.id, (messages) => {
    console.log('New messages:', messages);
  });
  
  // Send messages
  await sendMessage(room.id, alice.id, 'Hello, Bob!');
  await sendMessage(room.id, bob.id, 'Hi Alice, how are you?');
  await sendMessage(room.id, alice.id, 'I\'m doing well, thanks!');
  
  // Mark messages as read
  const messages = await getRoomMessages(room.id);
  for (const message of messages) {
    if (message.userId !== bob.id) {
      await markMessageAsRead(message.id, bob.id);
    }
  }
  
  // Bob goes offline
  await setUserStatus(bob.id, false);
  
  // Unsubscribe from messages
  unsubscribe();
}

run();
```

## E-commerce Inventory Management

```typescript
import { createDb } from '@nebula/core';
import { FileSystemAdapter } from '@nebula/adapter-filesystem';
import path from 'path';

// Create a database
const db = createDb({
  adapter: new FileSystemAdapter(path.join(__dirname, 'inventory-data.json'))
});

// Define collections
const products = db.collection('products');
const categories = db.collection('categories');
const inventory = db.collection('inventory');
const orders = db.collection('orders');

// Product functions
async function createProduct(productData) {
  return await products.insert({
    ...productData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

async function updateProduct(id, productData) {
  await products.update(
    { id },
    {
      $set: {
        ...productData,
        updatedAt: new Date().toISOString()
      }
    }
  );
  return await products.findOne({ id });
}

async function getProductById(id) {
  return await products.findOne({ id });
}

async function getProductsByCategory(categoryId) {
  return await products.find({ categoryId });
}

// Category functions
async function createCategory(name) {
  return await categories.insert({
    name,
    createdAt: new Date().toISOString()
  });
}

async function getAllCategories() {
  return await categories.find();
}

// Inventory functions
async function updateInventory(productId, quantity, location = 'main') {
  const item = await inventory.findOne({ productId, location });
  
  if (item) {
    await inventory.update(
      { id: item.id },
      {
        $set: {
          quantity,
          updatedAt: new Date().toISOString()
        }
      }
    );
    return await inventory.findOne({ id: item.id });
  } else {
    return await inventory.insert({
      productId,
      location,
      quantity,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
}

async function getProductInventory(productId) {
  return await inventory.find({ productId });
}

async function checkAvailability(productId, quantity, location = 'main') {
  const item = await inventory.findOne({ productId, location });
  return item && item.quantity >= quantity;
}

// Order functions
async function createOrder(orderData) {
  // Check inventory for all items
  for (const item of orderData.items) {
    const available = await checkAvailability(item.productId, item.quantity);
    if (!available) {
      throw new Error(`Product ${item.productId} is not available in the requested quantity`);
    }
  }
  
  // Create the order
  const order = await orders.insert({
    ...orderData,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  
  // Update inventory
  for (const item of orderData.items) {
    const inventoryItem = await inventory.findOne({ productId: item.productId });
    await updateInventory(
      item.productId,
      inventoryItem.quantity - item.quantity
    );
  }
  
  return order;
}

async function updateOrderStatus(id, status) {
  await orders.update(
    { id },
    {
      $set: {
        status,
        updatedAt: new Date().toISOString()
      }
    }
  );
  return await orders.findOne({ id });
}

async function getOrderById(id) {
  return await orders.findOne({ id });
}

async function getOrdersByStatus(status) {
  return await orders.find({ status });
}

// Example usage
async function run() {
  // Create categories
  const electronics = await createCategory('Electronics');
  const clothing = await createCategory('Clothing');
  
  // Create products
  const laptop = await createProduct({
    name: 'Laptop Pro',
    description: 'Powerful laptop for professionals',
    price: 1299.99,
    categoryId: electronics.id,
    sku: 'LP-2023-001'
  });
  
  const tshirt = await createProduct({
    name: 'Cotton T-Shirt',
    description: 'Comfortable cotton t-shirt',
    price: 19.99,
    categoryId: clothing.id,
    sku: 'TS-2023-001'
  });
  
  // Update inventory
  await updateInventory(laptop.id, 10);
  await updateInventory(tshirt.id, 100);
  
  // Create an order
  const order = await createOrder({
    customer: {
      name: 'John Doe',
      email: 'john@example.com',
      address: '123 Main St'
    },
    items: [
      { productId: laptop.id, quantity: 1, price: laptop.price },
      { productId: tshirt.id, quantity: 2, price: tshirt.price }
    ],
    total: laptop.price + (tshirt.price * 2)
  });
  
  // Check inventory after order
  const laptopInventory = await getProductInventory(laptop.id);
  console.log('Laptop inventory after order:', laptopInventory);
  
  // Update order status
  await updateOrderStatus(order.id, 'shipped');
  
  // Get all shipped orders
  const shippedOrders = await getOrdersByStatus('shipped');
  console.log('Shipped orders:', shippedOrders);
  
  // Save the database
  await db.save();
}

run();
```
