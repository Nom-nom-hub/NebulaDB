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
let subscriptions = [];

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

// Run subscription memory test
async function runTest() {
  console.log('Running subscription memory leak test...');
  
  // Force garbage collection
  if (global.gc) {
    global.gc();
  } else {
    console.warn('Garbage collection unavailable. Run with --expose-gc flag.');
  }
  
  // Take baseline heap snapshot
  baseline = memwatch.HeapDiff.create();
  
  // Insert initial data
  console.log('Inserting initial data...');
  for (let i = 0; i < 1000; i++) {
    await users.insert({
      name: `User ${i}`,
      email: `user${i}@example.com`,
      age: Math.floor(Math.random() * 100)
    });
  }
  
  // Create and destroy subscriptions multiple times
  for (let cycle = 0; cycle < 10; cycle++) {
    console.log(`Subscription cycle ${cycle + 1}/10...`);
    
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
        name: `Cycle ${cycle} User ${i}`,
        email: `cycle${cycle}user${i}@example.com`,
        age: Math.floor(Math.random() * 100)
      });
    }
    
    // Unsubscribe
    console.log(`Unsubscribing from ${subscriptions.length} subscriptions...`);
    for (const unsubscribe of subscriptions) {
      unsubscribe();
    }
    
    // Clear subscriptions array
    subscriptions = [];
    
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
    
    // Print memory usage
    const memUsage = process.memoryUsage();
    console.log(`Memory usage: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  }
  
  // Force garbage collection
  if (global.gc) {
    global.gc();
  }
  
  // Check for memory leaks
  const diff = baseline.end();
  console.log('Heap diff:', diff);
  
  // Check if there's a significant memory leak
  if (diff.change.size_bytes > 1000000) { // 1MB threshold
    console.error('Potential memory leak detected in subscriptions!');
    
    // Create heap dump
    const heapDumpFile = path.join(heapDumpsDir, `subscription-${Date.now()}.heapsnapshot`);
    heapdump.writeSnapshot(heapDumpFile, (err) => {
      if (err) console.error('Failed to write heap dump:', err);
      else console.log(`Heap dump written to ${heapDumpFile}`);
      process.exit(1);
    });
  } else {
    console.log('No significant memory leaks detected in subscriptions.');
    process.exit(0);
  }
}

// Run test
runTest().catch(console.error);
