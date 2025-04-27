import { EnhancedNestedQueryOptimizer } from './packages/core/src/query/enhanced-nested-query-optimizer';
import { createDb } from '@nebula/core';
import { MemoryAdapter } from '@nebula/adapter-memory';
import { performance } from 'perf_hooks';

// Define types for our data and queries
type UserDocument = {
  id: string;
  user: {
    id: string;
    name: string;
    age: number;
    active: boolean;
    profile: {
      name: string;
      email: string;
    }
  }
};

type QueryCondition = Record<string, any>;

async function testQueryOptimization() {
  console.log('Testing Query Optimization');
  console.log('=========================\n');
  
  // Create test database
  const db = createDb({ adapter: new MemoryAdapter() });
  const collection = db.collection<UserDocument>('test_optimization');
  
  // Insert test data
  console.log('Inserting test data...');
  const testData = generateTestData(1000);
  await collection.insertMany(testData);
  console.log(`Inserted ${testData.length} documents\n`);
  
  // Test complex query
  const complexQuery: QueryCondition = {
    $and: [
      { 'user.profile.name': { $regex: 'User' } },  // Expensive regex
      { 'user.age': { $gt: 30, $lt: 50 } },         // Range query
      { 'user.id': { $in: ['user_123', 'user_456'] } }, // In list
      { 'user.active': true }                       // Simple boolean
    ]
  };
  
  console.log('Original query:');
  console.log(JSON.stringify(complexQuery, null, 2));
  
  // Run without optimization
  console.log('\nRunning without optimization...');
  const startWithout = performance.now();
  const resultsWithout = await collection.find(complexQuery);
  const endWithout = performance.now();
  console.log(`Found ${resultsWithout.length} documents in ${(endWithout - startWithout).toFixed(2)}ms`);
  
  // Run with optimization
  console.log('\nRunning with optimization...');
  const optimizedQuery = EnhancedNestedQueryOptimizer.optimizeQuery(complexQuery);
  console.log('Optimized query:');
  console.log(JSON.stringify(optimizedQuery, null, 2));
  
  const startWith = performance.now();
  const resultsWith = await collection.find(optimizedQuery);
  const endWith = performance.now();
  console.log(`Found ${resultsWith.length} documents in ${(endWith - startWith).toFixed(2)}ms`);
  
  // Verify results match
  const resultsMatch = compareResults(resultsWithout, resultsWith);
  console.log(`\nResults match: ${resultsMatch}`);
  
  // Calculate performance improvement
  const improvement = ((endWithout - startWithout) / (endWith - startWith) - 1) * 100;
  console.log(`Performance improvement: ${improvement.toFixed(2)}%`);
  
  return {
    withoutOptimization: endWithout - startWithout,
    withOptimization: endWith - startWith,
    improvement: improvement,
    resultsMatch: resultsMatch
  };
}

function generateTestData(count: number): UserDocument[] {
  const data: UserDocument[] = [];
  
  for (let i = 0; i < count; i++) {
    data.push({
      id: `doc_${i}`,
      user: {
        id: `user_${i % 1000}`,
        name: `User ${i}`,
        age: 20 + (i % 50),
        active: i % 3 === 0,
        profile: {
          name: `User ${i} Profile`,
          email: `user${i}@example.com`
        }
      }
    });
  }
  
  return data;
}

function compareResults(results1: UserDocument[], results2: UserDocument[]): boolean {
  if (results1.length !== results2.length) {
    return false;
  }
  
  // Sort by ID to ensure consistent order
  const sorted1 = [...results1].sort((a, b) => a.id.localeCompare(b.id));
  const sorted2 = [...results2].sort((a, b) => a.id.localeCompare(b.id));
  
  for (let i = 0; i < sorted1.length; i++) {
    if (sorted1[i].id !== sorted2[i].id) {
      return false;
    }
  }
  
  return true;
}

// Run the test
testQueryOptimization()
  .then(results => {
    console.log('\nTest completed successfully');
    if (results.improvement > 0 && results.resultsMatch) {
      console.log('✅ Query optimization is working correctly');
    } else {
      console.log('❌ Query optimization needs investigation');
    }
  })
  .catch(error => {
    console.error('Test failed:', error);
  });
