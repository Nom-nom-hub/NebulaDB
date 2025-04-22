const memwatch = require('memwatch-next');
const heapdump = require('heapdump');
const path = require('path');
const { createDb, MemoryAdapter } = require('@nebula/core');

// Create database
const db = createDb({
  adapter: new MemoryAdapter()
});

// Create collection
const users = db.collection('users');

// Track memory usage
let baseline;
let heapDiff;

// Create heap dumps directory
const heapDumpsDir = path.join(__dirname, 'heapdumps');
require('fs').mkdirSync(heapDumpsDir, { recursive: true });

// Listen for memory leaks
memwatch.on('leak', (info) => {
  console.error('Memory leak detected:', info);
  
  // Create heap dump
  const heapDumpFile = path.join(heapDumpsDir, `leak-${Date.now()}.heapsnapshot`);
  heapdump.writeSnapshot(heapDumpFile, (err) => {
    if (err) console.error('Failed to write heap dump:', err);
    else console.log(`Heap dump written to ${heapDumpFile}`);
  });
});

// Run memory tests
async function runTests() {
  console.log('Running memory leak tests...');
  
  // Force garbage collection
  if (global.gc) {
    global.gc();
  } else {
    console.warn('Garbage collection unavailable. Run with --expose-gc flag.');
  }
  
  // Take baseline heap snapshot
  baseline = memwatch.HeapDiff.create();
  
  // Run insert test
  await testInsert();
  
  // Run query test
  await testQuery();
  
  // Run update test
  await testUpdate();
  
  // Run delete test
  await testDelete();
  
  // Run subscription test
  await testSubscription();
  
  // Force garbage collection
  if (global.gc) {
    global.gc();
  }
  
  // Check for memory leaks
  const diff = baseline.end();
  console.log('Heap diff:', diff);
  
  // Check if there's a significant memory leak
  if (diff.change.size_bytes > 1000000) { // 1MB threshold
    console.error('Potential memory leak detected!');
    
    // Create heap dump
    const heapDumpFile = path.join(heapDumpsDir, `final-${Date.now()}.heapsnapshot`);
    heapdump.writeSnapshot(heapDumpFile, (err) => {
      if (err) console.error('Failed to write heap dump:', err);
      else console.log(`Heap dump written to ${heapDumpFile}`);
      process.exit(1);
    });
  } else {
    console.log('No significant memory leaks detected.');
    process.exit(0);
  }
}

// Test insert operations
async function testInsert() {
  console.log('Testing insert operations...');
  
  for (let i = 0; i < 10000; i++) {
    await users.insert({
      name: `User ${i}`,
      email: `user${i}@example.com`,
      age: Math.floor(Math.random() * 100)
    });
  }
  
  console.log('Insert test completed.');
}

// Test query operations
async function testQuery() {
  console.log('Testing query operations...');
  
  for (let i = 0; i < 1000; i++) {
    await users.find({ age: { $gt: 50 } });
    await users.findOne({ name: `User ${i}` });
  }
  
  console.log('Query test completed.');
}

// Test update operations
async function testUpdate() {
  console.log('Testing update operations...');
  
  for (let i = 0; i < 1000; i++) {
    await users.update(
      { age: { $lt: 30 } },
      { $set: { status: 'young' } }
    );
  }
  
  console.log('Update test completed.');
}

// Test delete operations
async function testDelete() {
  console.log('Testing delete operations...');
  
  for (let i = 0; i < 1000; i++) {
    await users.delete({ name: `User ${i}` });
  }
  
  console.log('Delete test completed.');
}

// Test subscriptions
async function testSubscription() {
  console.log('Testing subscriptions...');
  
  const subscriptions = [];
  
  // Create subscriptions
  for (let i = 0; i < 100; i++) {
    const unsubscribe = users.subscribe({ age: { $gt: i } }, (docs) => {
      // Do nothing with the results
    });
    
    subscriptions.push(unsubscribe);
  }
  
  // Make some changes to trigger subscriptions
  for (let i = 0; i < 100; i++) {
    await users.insert({
      name: `New User ${i}`,
      email: `newuser${i}@example.com`,
      age: Math.floor(Math.random() * 100)
    });
  }
  
  // Unsubscribe
  for (const unsubscribe of subscriptions) {
    unsubscribe();
  }
  
  console.log('Subscription test completed.');
}

// Run tests
runTests().catch(console.error);
