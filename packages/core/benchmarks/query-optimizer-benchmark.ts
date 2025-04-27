import { EnhancedNestedQueryOptimizer } from '../src/query/enhanced-nested-query-optimizer';
import { QueryProcessor } from '../src/query/query-processor';
import { Collection } from '../src/collection';

/**
 * Benchmark for query optimization and execution
 */
async function runQueryOptimizerBenchmark() {
  console.log('Running Query Optimizer Benchmark');
  console.log('=================================');
  
  // Create test data
  const numDocuments = 10000;
  console.log(`Generating ${numDocuments} test documents...`);
  
  const documents = Array.from({ length: numDocuments }, (_, i) => ({
    id: `doc${i}`,
    user: {
      id: `user${i % 100}`,
      profile: {
        name: `User ${i % 50}`,
        email: `user${i}@example.com`,
        address: {
          city: `City ${i % 20}`,
          country: `Country ${i % 5}`
        }
      },
      age: 20 + (i % 50),
      active: i % 3 === 0,
      tags: [`tag${i % 10}`, `tag${(i + 5) % 10}`]
    },
    createdAt: new Date(Date.now() - (i * 86400000)),
    score: i % 100,
    metadata: {
      source: `source${i % 5}`,
      version: `1.${i % 10}`
    }
  }));
  
  // Create collection
  const collection = new Collection('benchmark', documents);
  
  // Define test queries
  const queries = [
    {
      name: 'Simple query',
      query: { 'user.active': true }
    },
    {
      name: 'Multi-condition query',
      query: {
        $and: [
          { 'user.active': true },
          { 'user.age': { $gt: 30 } }
        ]
      }
    },
    {
      name: 'Complex nested query',
      query: {
        $and: [
          {
            $or: [
              { 'user.profile.name': { $regex: 'User 1' } },
              { 'user.profile.name': { $regex: 'User 2' } }
            ]
          },
          { 'user.age': { $gt: 30 } },
          { 'user.active': true },
          { 'user.profile.address.country': 'Country 1' }
        ]
      }
    },
    {
      name: 'Query with redundant conditions',
      query: {
        $and: [
          { 'user.age': { $gt: 30 } },
          { 'user.age': { $gt: 30 } },
          { 'user.active': true },
          { 'user.active': true }
        ]
      }
    },
    {
      name: 'Query with mergeable conditions',
      query: {
        $and: [
          { 'user.age': { $gt: 30 } },
          { 'user.age': { $lt: 50 } },
          { 'user.active': true }
        ]
      }
    }
  ];
  
  // Run benchmarks
  for (const { name, query } of queries) {
    console.log(`\nBenchmarking: ${name}`);
    console.log('Query:', JSON.stringify(query));
    
    // Benchmark without optimization
    console.time('Without optimization');
    const resultsWithout = await collection.find(query);
    console.timeEnd('Without optimization');
    console.log(`Results: ${resultsWithout.length} documents`);
    
    // Benchmark with optimization
    console.time('With optimization');
    const optimizedQuery = EnhancedNestedQueryOptimizer.optimizeQuery(query);
    const resultsWith = await collection.find(optimizedQuery);
    console.timeEnd('With optimization');
    console.log(`Results: ${resultsWith.length} documents`);
    
    // Verify results are the same
    console.log('Results match:', resultsWithout.length === resultsWith.length);
  }
  
  // Benchmark batch path accessor
  console.log('\nBenchmarking batch path accessor');
  const paths = ['user.id', 'user.profile.name', 'user.age', 'user.active', 'user.profile.address.country'];
  
  // Traditional approach
  console.time('Traditional path access');
  const traditionalResults = new Map<string, any[]>();
  
  for (const path of paths) {
    traditionalResults.set(path, []);
  }
  
  for (const doc of documents) {
    for (const path of paths) {
      const parts = path.split('.');
      let value = doc;
      
      for (const part of parts) {
        value = value?.[part];
        if (value === undefined) break;
      }
      
      traditionalResults.get(path)!.push(value);
    }
  }
  console.timeEnd('Traditional path access');
  
  // Optimized approach
  console.time('Optimized batch path access');
  const batchAccessor = EnhancedNestedQueryOptimizer.createBatchPathAccessor(paths);
  const optimizedResults = batchAccessor(documents);
  console.timeEnd('Optimized batch path access');
  
  // Verify results
  let resultsMatch = true;
  for (const path of paths) {
    const traditional = traditionalResults.get(path)!;
    const optimized = optimizedResults.get(path)!;
    
    if (traditional.length !== optimized.length) {
      resultsMatch = false;
      break;
    }
    
    for (let i = 0; i < traditional.length; i++) {
      if (traditional[i] !== optimized[i]) {
        resultsMatch = false;
        break;
      }
    }
  }
  
  console.log('Results match:', resultsMatch);
}

// Run the benchmark
runQueryOptimizerBenchmark().catch(console.error);