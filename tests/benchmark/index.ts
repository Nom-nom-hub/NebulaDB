import { createDb } from '../../packages/core/src';
import { MemoryAdapter } from '../../packages/adapters/memory/src';
import { SQLiteAdapter } from '../../packages/adapters/sqlite/src';
import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';

// Utility function to measure execution time
async function measureTime(name: string, fn: () => Promise<void>): Promise<number> {
  console.log(`Running benchmark: ${name}`);
  const start = performance.now();
  await fn();
  const end = performance.now();
  const duration = end - start;
  console.log(`${name} took ${duration.toFixed(2)}ms`);
  return duration;
}

// Generate random data
function generateRandomData(count: number) {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      name: `User ${i}`,
      age: Math.floor(Math.random() * 100),
      email: `user${i}@example.com`,
      active: Math.random() > 0.5,
      createdAt: new Date().toISOString(),
      tags: Array(Math.floor(Math.random() * 5) + 1)
        .fill(0)
        .map(() => ['admin', 'user', 'guest', 'developer', 'tester'][Math.floor(Math.random() * 5)]),
      address: {
        street: `${Math.floor(Math.random() * 1000)} Main St`,
        city: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'][Math.floor(Math.random() * 5)],
        zip: String(10000 + Math.floor(Math.random() * 90000))
      }
    });
  }
  return data;
}

// Benchmark MemoryAdapter
async function benchmarkMemoryAdapter(documentCounts: number[]) {
  console.log('\n=== Memory Adapter Benchmark ===');
  
  const results: Record<string, number[]> = {
    insert: [],
    findAll: [],
    findQuery: [],
    update: [],
    delete: []
  };

  for (const count of documentCounts) {
    console.log(`\nTesting with ${count} documents`);
    
    const db = createDb({ adapter: new MemoryAdapter() });
    const users = db.collection('users');
    const data = generateRandomData(count);
    
    // Benchmark insert
    results.insert.push(await measureTime(`Insert ${count} documents`, async () => {
      for (const user of data) {
        await users.insert(user);
      }
    }));
    
    // Benchmark find all
    results.findAll.push(await measureTime(`Find all ${count} documents`, async () => {
      await users.find();
    }));
    
    // Benchmark find with query
    results.findQuery.push(await measureTime(`Find with query in ${count} documents`, async () => {
      await users.find({ age: { $gt: 50 } });
    }));
    
    // Benchmark update
    results.update.push(await measureTime(`Update documents in ${count} documents`, async () => {
      await users.update({ age: { $gt: 50 } }, { $set: { active: false } });
    }));
    
    // Benchmark delete
    results.delete.push(await measureTime(`Delete documents in ${count} documents`, async () => {
      await users.delete({ age: { $lt: 30 } });
    }));
  }
  
  return results;
}

// Benchmark SQLiteAdapter
async function benchmarkSQLiteAdapter(documentCounts: number[]) {
  console.log('\n=== SQLite Adapter Benchmark ===');
  
  const results: Record<string, number[]> = {
    insert: [],
    findAll: [],
    findQuery: [],
    update: [],
    delete: []
  };

  const dbPath = path.join(__dirname, 'benchmark.db');
  
  // Remove existing database file if it exists
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  for (const count of documentCounts) {
    console.log(`\nTesting with ${count} documents`);
    
    const adapter = new SQLiteAdapter(dbPath);
    const db = createDb({ adapter });
    const users = db.collection('users');
    const data = generateRandomData(count);
    
    // Benchmark insert
    results.insert.push(await measureTime(`Insert ${count} documents`, async () => {
      for (const user of data) {
        await users.insert(user);
      }
    }));
    
    // Benchmark find all
    results.findAll.push(await measureTime(`Find all ${count} documents`, async () => {
      await users.find();
    }));
    
    // Benchmark find with query
    results.findQuery.push(await measureTime(`Find with query in ${count} documents`, async () => {
      await users.find({ age: { $gt: 50 } });
    }));
    
    // Benchmark update
    results.update.push(await measureTime(`Update documents in ${count} documents`, async () => {
      await users.update({ age: { $gt: 50 } }, { $set: { active: false } });
    }));
    
    // Benchmark delete
    results.delete.push(await measureTime(`Delete documents in ${count} documents`, async () => {
      await users.delete({ age: { $lt: 30 } });
    }));
    
    // Close the adapter
    adapter.close();
    
    // Remove the database file
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  }
  
  return results;
}

// Print results in a table
function printResults(memoryResults: Record<string, number[]>, sqliteResults: Record<string, number[]>, documentCounts: number[]) {
  console.log('\n=== Benchmark Results (in ms) ===');
  
  console.log('\nMemory Adapter:');
  console.log('Operation | ' + documentCounts.map(c => `${c} docs`).join(' | '));
  console.log('--- | ' + documentCounts.map(() => '---').join(' | '));
  
  for (const [operation, times] of Object.entries(memoryResults)) {
    console.log(`${operation} | ${times.map(t => t.toFixed(2)).join(' | ')}`);
  }
  
  console.log('\nSQLite Adapter:');
  console.log('Operation | ' + documentCounts.map(c => `${c} docs`).join(' | '));
  console.log('--- | ' + documentCounts.map(() => '---').join(' | '));
  
  for (const [operation, times] of Object.entries(sqliteResults)) {
    console.log(`${operation} | ${times.map(t => t.toFixed(2)).join(' | ')}`);
  }
}

// Run the benchmark
async function runBenchmark() {
  const documentCounts = [100, 1000, 10000];
  
  console.log('Starting NebulaDB benchmark...');
  
  const memoryResults = await benchmarkMemoryAdapter(documentCounts);
  const sqliteResults = await benchmarkSQLiteAdapter(documentCounts);
  
  printResults(memoryResults, sqliteResults, documentCounts);
}

// Run the benchmark
runBenchmark().catch(console.error);
