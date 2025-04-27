import { createDb } from '@nebula/core';
import { MemoryAdapter } from '@nebula/adapter-memory';
import { performance } from 'perf_hooks';
import { QueryProfiler } from './query-profiler';

/**
 * Benchmark for testing performance of nested queries
 */
async function runNestedQueryBenchmark() {
  console.log('Running nested query benchmark...');
  
  // Create database with memory adapter
  const db = createDb({ adapter: new MemoryAdapter() });
  const collection = db.collection('nested_data');
  
  // Generate test data with nested structures
  const testData = generateNestedTestData(10000);
  
  // Insert test data
  console.log('Inserting test data...');
  await collection.insertMany(testData);
  
  // Run benchmark tests
  console.log('Running benchmark tests...');
  
  // Create profiler
  const profiler = new QueryProfiler();
  
  // Test 1: Simple nested property query
  const test1Results = await benchmarkQuery(
    'Simple nested property query',
    collection,
    { 'user.profile.age': { $gt: 30 } },
    profiler
  );
  
  // Test 2: Multiple nested conditions
  const test2Results = await benchmarkQuery(
    'Multiple nested conditions',
    collection,
    { 
      'user.profile.age': { $gt: 30 },
      'user.settings.notifications': true,
      'metadata.tags': { $contains: 'important' }
    },
    profiler
  );
  
  // Test 3: Deeply nested array query
  const test3Results = await benchmarkQuery(
    'Deeply nested array query',
    collection,
    { 'user.posts.comments.author.verified': true },
    profiler
  );
  
  // Test 4: Complex nested query with OR conditions
  const test4Results = await benchmarkQuery(
    'Complex nested query with OR conditions',
    collection,
    { 
      $or: [
        { 'user.profile.age': { $lt: 25 } },
        { 'user.profile.interests': { $contains: 'programming' } },
        { 'metadata.tags': { $contains: 'featured' } }
      ]
    },
    profiler
  );
  
  // Print profiling results
  profiler.printResults();
  
  // Print summary
  console.log('\n=== Benchmark Summary ===');
  console.log('Test | Avg (ms) | Min (ms) | Max (ms)');
  console.log('-'.repeat(50));
  
  [test1Results, test2Results, test3Results, test4Results].forEach(result => {
    console.log(`${result.name} | ${result.avg.toFixed(2)} | ${result.min.toFixed(2)} | ${result.max.toFixed(2)}`);
  });
}

/**
 * Generate test data with nested structures
 */
function generateNestedTestData(count: number) {
  const data = [];
  
  for (let i = 0; i < count; i++) {
    data.push({
      id: `doc_${i}`,
      user: {
        id: `user_${i % 1000}`,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        profile: {
          age: 20 + (i % 50),
          location: {
            city: `City ${i % 100}`,
            country: `Country ${i % 10}`
          },
          interests: ['reading', 'sports', i % 5 === 0 ? 'programming' : 'music']
        },
        settings: {
          theme: i % 2 === 0 ? 'light' : 'dark',
          notifications: i % 3 === 0,
          privacy: {
            publicProfile: i % 2 === 0,
            showEmail: i % 5 === 0
          }
        },
        posts: Array.from({ length: 3 }, (_, j) => ({
          id: `post_${i}_${j}`,
          title: `Post ${j} by User ${i}`,
          comments: Array.from({ length: 2 }, (_, k) => ({
            id: `comment_${i}_${j}_${k}`,
            text: `Comment ${k} on Post ${j}`,
            author: {
              id: `user_${(i + k) % 1000}`,
              verified: (i + j + k) % 7 === 0
            }
          }))
        }))
      },
      metadata: {
        created: new Date(Date.now() - i * 10000),
        modified: new Date(),
        tags: [
          i % 3 === 0 ? 'important' : 'normal',
          i % 7 === 0 ? 'featured' : 'standard'
        ]
      }
    });
  }
  
  return data;
}

/**
 * Run a benchmark for a specific query
 */
async function benchmarkQuery(
  name: string, 
  collection: any, 
  query: any,
  profiler?: QueryProfiler
) {
  console.log(`\nRunning: ${name}`);
  
  // Warm up
  await collection.find(query);
  
  // Measure performance
  const iterations = 5;
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    if (profiler) profiler.startStep(`${name} - Iteration ${i+1}`);
    
    const start = performance.now();
    const results = await collection.find(query);
    const end = performance.now();
    
    if (profiler) profiler.endStep();
    
    times.push(end - start);
    console.log(`  Iteration ${i + 1}: ${end - start}ms (found ${results.length} documents)`);
  }
  
  // Calculate statistics
  const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  console.log(`\nResults for: ${name}`);
  console.log(`  Average: ${avg.toFixed(2)}ms`);
  console.log(`  Min: ${min.toFixed(2)}ms`);
  console.log(`  Max: ${max.toFixed(2)}ms`);
  
  return { name, avg, min, max };
}

// Run the benchmark
runNestedQueryBenchmark().catch(console.error);

export { runNestedQueryBenchmark };
