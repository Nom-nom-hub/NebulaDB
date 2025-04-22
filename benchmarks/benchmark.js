/**
 * Simple benchmark comparing NebulaDB with other embedded databases
 */

const { createDb } = require('@nebula/core');
const { MemoryAdapter } = require('@nebula/adapter-memory');
const Loki = require('lokijs');
const { Low } = require('lowdb');
const { Memory } = require('lowdb/browser');

// Number of operations to perform
const NUM_DOCS = 10000;
const NUM_QUERIES = 1000;

// Generate test data
function generateTestData(count) {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      id: `${i}`,
      name: `User ${i}`,
      age: Math.floor(Math.random() * 100),
      email: `user${i}@example.com`,
      active: Math.random() > 0.5,
      tags: ['tag1', 'tag2', 'tag3'].slice(0, Math.floor(Math.random() * 3) + 1)
    });
  }
  return data;
}

// Benchmark NebulaDB
async function benchmarkNebulaDB() {
  console.log('Benchmarking NebulaDB...');
  
  // Create database
  const db = createDb({ adapter: new MemoryAdapter() });
  const users = db.collection('users');
  
  // Insert benchmark
  const testData = generateTestData(NUM_DOCS);
  
  console.time('NebulaDB - Insert');
  for (const doc of testData) {
    await users.insert(doc);
  }
  console.timeEnd('NebulaDB - Insert');
  
  // Query benchmark
  console.time('NebulaDB - Query');
  for (let i = 0; i < NUM_QUERIES; i++) {
    const age = Math.floor(Math.random() * 100);
    await users.find({ age: { $gt: age } });
  }
  console.timeEnd('NebulaDB - Query');
  
  // Update benchmark
  console.time('NebulaDB - Update');
  for (let i = 0; i < NUM_QUERIES; i++) {
    const id = `${Math.floor(Math.random() * NUM_DOCS)}`;
    await users.update({ id }, { $set: { active: false } });
  }
  console.timeEnd('NebulaDB - Update');
  
  // Delete benchmark
  console.time('NebulaDB - Delete');
  for (let i = 0; i < NUM_QUERIES; i++) {
    const id = `${Math.floor(Math.random() * NUM_DOCS)}`;
    await users.delete({ id });
  }
  console.timeEnd('NebulaDB - Delete');
}

// Benchmark LokiJS
function benchmarkLokiJS() {
  console.log('\nBenchmarking LokiJS...');
  
  // Create database
  const db = new Loki('benchmark.db');
  const users = db.addCollection('users');
  
  // Insert benchmark
  const testData = generateTestData(NUM_DOCS);
  
  console.time('LokiJS - Insert');
  for (const doc of testData) {
    users.insert(doc);
  }
  console.timeEnd('LokiJS - Insert');
  
  // Query benchmark
  console.time('LokiJS - Query');
  for (let i = 0; i < NUM_QUERIES; i++) {
    const age = Math.floor(Math.random() * 100);
    users.find({ age: { $gt: age } });
  }
  console.timeEnd('LokiJS - Query');
  
  // Update benchmark
  console.time('LokiJS - Update');
  for (let i = 0; i < NUM_QUERIES; i++) {
    const id = `${Math.floor(Math.random() * NUM_DOCS)}`;
    users.findAndUpdate({ id }, obj => {
      obj.active = false;
      return obj;
    });
  }
  console.timeEnd('LokiJS - Update');
  
  // Delete benchmark
  console.time('LokiJS - Delete');
  for (let i = 0; i < NUM_QUERIES; i++) {
    const id = `${Math.floor(Math.random() * NUM_DOCS)}`;
    users.findAndRemove({ id });
  }
  console.timeEnd('LokiJS - Delete');
}

// Benchmark LowDB
async function benchmarkLowDB() {
  console.log('\nBenchmarking LowDB...');
  
  // Create database
  const db = new Low(new Memory());
  db.data = { users: [] };
  
  // Insert benchmark
  const testData = generateTestData(NUM_DOCS);
  
  console.time('LowDB - Insert');
  for (const doc of testData) {
    db.data.users.push(doc);
    await db.write();
  }
  console.timeEnd('LowDB - Insert');
  
  // Query benchmark
  console.time('LowDB - Query');
  for (let i = 0; i < NUM_QUERIES; i++) {
    const age = Math.floor(Math.random() * 100);
    db.data.users.filter(user => user.age > age);
  }
  console.timeEnd('LowDB - Query');
  
  // Update benchmark
  console.time('LowDB - Update');
  for (let i = 0; i < NUM_QUERIES; i++) {
    const id = `${Math.floor(Math.random() * NUM_DOCS)}`;
    const index = db.data.users.findIndex(user => user.id === id);
    if (index !== -1) {
      db.data.users[index].active = false;
      await db.write();
    }
  }
  console.timeEnd('LowDB - Update');
  
  // Delete benchmark
  console.time('LowDB - Delete');
  for (let i = 0; i < NUM_QUERIES; i++) {
    const id = `${Math.floor(Math.random() * NUM_DOCS)}`;
    const index = db.data.users.findIndex(user => user.id === id);
    if (index !== -1) {
      db.data.users.splice(index, 1);
      await db.write();
    }
  }
  console.timeEnd('LowDB - Delete');
}

// Run benchmarks
async function runBenchmarks() {
  console.log(`Running benchmarks with ${NUM_DOCS} documents and ${NUM_QUERIES} queries...\n`);
  
  await benchmarkNebulaDB();
  benchmarkLokiJS();
  await benchmarkLowDB();
  
  console.log('\nBenchmarks completed!');
}

runBenchmarks().catch(console.error);
