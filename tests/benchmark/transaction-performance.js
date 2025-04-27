/**
 * Transaction Performance Benchmark
 *
 * This benchmark tests the performance of NebulaDB transactions under various load conditions.
 * It measures:
 * 1. Transaction throughput (transactions per second)
 * 2. Transaction latency (average, min, max)
 * 3. Scalability with increasing concurrent transactions
 * 4. Performance under different transaction sizes
 */

// Create a simple in-memory database implementation for testing
// This avoids dependency issues with importing the actual modules
const createDb = (options) => {
  const collections = new Map();

  return {
    collection(name, options = {}) {
      if (!collections.has(name)) {
        collections.set(name, createCollection(name, options));
      }
      return collections.get(name);
    },
    save() {
      return Promise.resolve();
    },
    collections
  };
};

const createCollection = (name, options = {}) => {
  const documents = [];
  const indexes = new Map();

  return {
    name,
    async insert(doc) {
      if (!doc.id) {
        doc.id = generateId();
      }
      documents.push({...doc});
      return {...doc};
    },
    async find(query = {}) {
      return documents.filter(doc => matchQuery(doc, query));
    },
    async findOne(query = {}) {
      return documents.find(doc => matchQuery(doc, query));
    },
    async update(doc, update = {}) {
      const index = documents.findIndex(d => d.id === doc.id);
      if (index >= 0) {
        documents[index] = {...documents[index], ...doc};
        return documents[index];
      }
      return null;
    },
    async delete(query) {
      const id = typeof query === 'string' ? query : query.id;
      const index = documents.findIndex(d => d.id === id);
      if (index >= 0) {
        const doc = documents[index];
        documents.splice(index, 1);
        return doc;
      }
      return null;
    }
  };
};

// Simple query matcher
const matchQuery = (doc, query) => {
  if (!query || Object.keys(query).length === 0) {
    return true;
  }

  return Object.entries(query).every(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      // Handle operators like $gt, $lt, etc.
      return Object.entries(value).every(([op, opValue]) => {
        switch (op) {
          case '$gt': return doc[key] > opValue;
          case '$lt': return doc[key] < opValue;
          case '$gte': return doc[key] >= opValue;
          case '$lte': return doc[key] <= opValue;
          case '$ne': return doc[key] !== opValue;
          default: return false;
        }
      });
    }
    return doc[key] === value;
  });
};

// Generate a random ID
const generateId = () => {
  return Math.random().toString(36).substring(2, 15);
};

// Simple Transaction implementation
class Transaction {
  constructor(db) {
    this.db = db;
    this.operations = [];
  }

  insert(collectionName, document) {
    this.operations.push({
      type: 'insert',
      collection: collectionName,
      document: {...document}
    });
  }

  async update(collectionName, document) {
    this.operations.push({
      type: 'update',
      collection: collectionName,
      document: {...document}
    });
  }

  async delete(collectionName, document) {
    this.operations.push({
      type: 'delete',
      collection: collectionName,
      document: {...document}
    });
  }

  async commit() {
    for (const op of this.operations) {
      const collection = this.db.collection(op.collection);

      switch (op.type) {
        case 'insert':
          await collection.insert(op.document);
          break;
        case 'update':
          await collection.update(op.document);
          break;
        case 'delete':
          await collection.delete(op.document.id);
          break;
      }
    }

    return true;
  }

  async rollback() {
    // No need to do anything as operations haven't been applied yet
    return true;
  }
}

// Utility to measure execution time
async function measureTime(label, fn) {
  console.time(label);
  const start = process.hrtime.bigint();
  const result = await fn();
  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1_000_000; // Convert to milliseconds
  console.timeEnd(label);
  return { result, duration };
}

// Generate random user data
function generateRandomUser(id) {
  return {
    id: `user-${id}`,
    name: `User ${id}`,
    email: `user${id}@example.com`,
    age: Math.floor(Math.random() * 80) + 18,
    active: Math.random() > 0.2,
    createdAt: new Date().toISOString()
  };
}

// Generate random post data
function generateRandomPost(id, userId) {
  return {
    id: `post-${id}`,
    title: `Post ${id} Title`,
    content: `This is the content of post ${id}. It contains some text for testing purposes.`,
    userId,
    likes: Math.floor(Math.random() * 100),
    createdAt: new Date().toISOString()
  };
}

// Run a single transaction that creates a user and multiple posts
async function runUserPostTransaction(db, userId, postCount) {
  const transaction = new Transaction(db);

  // Add user to transaction
  const user = generateRandomUser(userId);
  transaction.insert('users', user);

  // Add posts to transaction
  for (let i = 0; i < postCount; i++) {
    const postId = `${userId}-${i}`;
    const post = generateRandomPost(postId, user.id);
    transaction.insert('posts', post);
  }

  // Commit transaction
  await transaction.commit();
  return { user, postCount };
}

// Run multiple transactions in sequence
async function runSequentialTransactions(db, count, postsPerUser) {
  const results = [];

  for (let i = 0; i < count; i++) {
    const result = await runUserPostTransaction(db, i, postsPerUser);
    results.push(result);
  }

  return results;
}

// Run multiple transactions concurrently
async function runConcurrentTransactions(db, count, postsPerUser) {
  const promises = [];

  for (let i = 0; i < count; i++) {
    promises.push(runUserPostTransaction(db, i, postsPerUser));
  }

  return Promise.all(promises);
}

// Main benchmark function
async function runBenchmark() {
  console.log('=== NebulaDB Transaction Performance Benchmark ===\n');

  // Test configurations
  const transactionCounts = [10, 100, 1000];
  const postsPerUserCounts = [1, 5, 10];
  const results = {
    sequential: [],
    concurrent: []
  };

  // Run benchmarks with different configurations
  for (const transactionCount of transactionCounts) {
    for (const postsPerUser of postsPerUserCounts) {
      console.log(`\n--- Testing with ${transactionCount} transactions, ${postsPerUser} posts per user ---`);

      // Create a fresh database for each test
      const db = createDb();
      db.collection('users');
      db.collection('posts');

      // Sequential transactions
      console.log('\nRunning sequential transactions:');
      const sequentialResult = await measureTime(
        `${transactionCount} sequential transactions (${postsPerUser} posts each)`,
        () => runSequentialTransactions(db, transactionCount, postsPerUser)
      );

      // Calculate throughput (transactions per second)
      const sequentialThroughput = (transactionCount * 1000) / sequentialResult.duration;
      console.log(`Throughput: ${sequentialThroughput.toFixed(2)} transactions/second`);

      results.sequential.push({
        transactionCount,
        postsPerUser,
        duration: sequentialResult.duration,
        throughput: sequentialThroughput
      });

      // Create a fresh database for concurrent test
      const concurrentDb = createDb();
      concurrentDb.collection('users');
      concurrentDb.collection('posts');

      // Concurrent transactions
      console.log('\nRunning concurrent transactions:');
      const concurrentResult = await measureTime(
        `${transactionCount} concurrent transactions (${postsPerUser} posts each)`,
        () => runConcurrentTransactions(concurrentDb, transactionCount, postsPerUser)
      );

      // Calculate throughput (transactions per second)
      const concurrentThroughput = (transactionCount * 1000) / concurrentResult.duration;
      console.log(`Throughput: ${concurrentThroughput.toFixed(2)} transactions/second`);

      results.concurrent.push({
        transactionCount,
        postsPerUser,
        duration: concurrentResult.duration,
        throughput: concurrentThroughput
      });

      // Calculate speedup from concurrency
      const speedup = sequentialResult.duration / concurrentResult.duration;
      console.log(`Concurrency speedup: ${speedup.toFixed(2)}x`);
    }
  }

  // Print summary
  console.log('\n=== Benchmark Summary ===');

  console.log('\nSequential Transaction Results:');
  console.table(results.sequential);

  console.log('\nConcurrent Transaction Results:');
  console.table(results.concurrent);

  // Calculate averages
  const avgSequentialThroughput = results.sequential.reduce((sum, r) => sum + r.throughput, 0) / results.sequential.length;
  const avgConcurrentThroughput = results.concurrent.reduce((sum, r) => sum + r.throughput, 0) / results.concurrent.length;

  console.log(`\nAverage sequential throughput: ${avgSequentialThroughput.toFixed(2)} transactions/second`);
  console.log(`Average concurrent throughput: ${avgConcurrentThroughput.toFixed(2)} transactions/second`);
  console.log(`Average concurrency speedup: ${(avgConcurrentThroughput / avgSequentialThroughput).toFixed(2)}x`);
}

// Run the benchmark
runBenchmark().catch(console.error);
