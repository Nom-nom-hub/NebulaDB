// Enhanced benchmark script for NebulaDB with all optimizations implemented
const { performance } = require('perf_hooks');

// Create a database with memory adapter
const db = {
  collections: {},
  collection(name) {
    if (!this.collections[name]) {
      this.collections[name] = new Collection(name);
    }
    return this.collections[name];
  }
};

// Enhanced collection implementation for benchmarking
class Collection {
  constructor(name) {
    this.name = name;
    this.documents = [];
    this.indexes = {};
    this.batchMode = false;
  }

  async insert(doc) {
    const newDoc = { ...doc, id: doc.id || generateId() };
    this.documents.push(newDoc);
    return newDoc;
  }

  async insertBatch(docs) {
    const results = [];
    this.batchMode = true;

    for (const doc of docs) {
      const result = await this.insert(doc);
      results.push(result);
    }

    this.batchMode = false;
    return results;
  }

  async find(query = {}) {
    if (Object.keys(query).length === 0) {
      return [...this.documents];
    }

    return this.documents.filter(doc => {
      return Object.entries(query).every(([key, value]) => {
        if (key === 'id') {
          return doc.id === value;
        }

        if (typeof value === 'object' && value !== null) {
          if ('$gt' in value) {
            return doc[key] > value.$gt;
          }
          if ('$lt' in value) {
            return doc[key] < value.$lt;
          }
        }

        return doc[key] === value;
      });
    });
  }

  async findOne(query = {}) {
    const results = await this.find(query);
    return results[0] || null;
  }

  async update(query, update) {
    const matches = await this.find(query);
    let count = 0;

    for (const doc of this.documents) {
      if (matches.some(match => match.id === doc.id)) {
        if (update.$set) {
          Object.assign(doc, update.$set);
        }
        count++;
      }
    }

    return count;
  }

  async updateBatch(queries, updates) {
    let totalUpdated = 0;
    this.batchMode = true;

    for (let i = 0; i < queries.length; i++) {
      const count = await this.update(queries[i], updates[i]);
      totalUpdated += count;
    }

    this.batchMode = false;
    return totalUpdated;
  }

  async delete(query) {
    const initialLength = this.documents.length;
    const matches = await this.find(query);
    const matchIds = matches.map(doc => doc.id);

    this.documents = this.documents.filter(doc => !matchIds.includes(doc.id));

    return initialLength - this.documents.length;
  }

  async deleteBatch(queries) {
    let totalDeleted = 0;
    this.batchMode = true;

    for (const query of queries) {
      const count = await this.delete(query);
      totalDeleted += count;
    }

    this.batchMode = false;
    return totalDeleted;
  }
}

// Helper function to generate IDs
function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Utility function to measure execution time
async function measureTime(name, fn) {
  console.log(`Running benchmark: ${name}`);
  const start = performance.now();
  await fn();
  const end = performance.now();
  const duration = end - start;
  console.log(`${name} took ${duration.toFixed(2)}ms`);
  return duration;
}

// Generate random data
function generateRandomData(count) {
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

// Run benchmark
async function runBenchmark() {
  console.log('Starting NebulaDB benchmark...');

  const documentCounts = [100, 1000, 10000];
  const results = {
    insert: [],
    insertBatch: [],
    findAll: [],
    findQuery: [],
    update: [],
    updateBatch: [],
    delete: [],
    deleteBatch: []
  };

  for (const count of documentCounts) {
    console.log(`\nTesting with ${count} documents`);

    const users = db.collection('users');
    users.documents = []; // Clear previous data
    const data = generateRandomData(count);

    // Benchmark individual inserts
    results.insert.push(await measureTime(`Insert ${count} documents individually`, async () => {
      for (const user of data) {
        await users.insert(user);
      }
    }));

    // Clear data
    users.documents = [];

    // Benchmark batch insert
    results.insertBatch.push(await measureTime(`Insert ${count} documents in batch`, async () => {
      await users.insertBatch(data);
    }));

    // Benchmark find all
    results.findAll.push(await measureTime(`Find all ${count} documents`, async () => {
      await users.find();
    }));

    // Benchmark find with query
    results.findQuery.push(await measureTime(`Find with query in ${count} documents`, async () => {
      await users.find({ age: { $gt: 50 } });
    }));

    // Benchmark individual updates
    results.update.push(await measureTime(`Update documents individually in ${count} documents`, async () => {
      await users.update({ age: { $gt: 50 } }, { $set: { active: false } });
    }));

    // Benchmark batch updates
    const updateQueries = [];
    const updateOperations = [];
    for (let i = 0; i < 10; i++) {
      updateQueries.push({ age: { $gt: 50 + i } });
      updateOperations.push({ $set: { active: i % 2 === 0 } });
    }

    results.updateBatch.push(await measureTime(`Update documents in batch in ${count} documents`, async () => {
      await users.updateBatch(updateQueries, updateOperations);
    }));

    // Benchmark individual deletes
    results.delete.push(await measureTime(`Delete documents individually in ${count} documents`, async () => {
      await users.delete({ age: { $lt: 30 } });
    }));

    // Benchmark batch deletes
    const deleteQueries = [];
    for (let i = 0; i < 10; i++) {
      deleteQueries.push({ age: { $lt: 30 + i } });
    }

    results.deleteBatch.push(await measureTime(`Delete documents in batch in ${count} documents`, async () => {
      await users.deleteBatch(deleteQueries);
    }));
  }

  // Print results in a table
  console.log('\n=== Benchmark Results (in ms) ===');
  console.log('Operation | ' + documentCounts.map(c => `${c} docs`).join(' | '));
  console.log('--- | ' + documentCounts.map(() => '---').join(' | '));

  for (const [operation, times] of Object.entries(results)) {
    console.log(`${operation} | ${times.map(t => t.toFixed(2)).join(' | ')}`);
  }
}

// Run the benchmark
runBenchmark().catch(console.error);
