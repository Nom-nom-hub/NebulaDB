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
const logs = db.collection('logs');

// Track memory usage
let baseline;
let subscriptions = [];
let running = true;
let cycleCount = 0;
const MAX_CYCLES = 100;
const HEAP_DUMP_INTERVAL = 10; // Create heap dump every 10 cycles

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

// Run long-running memory test
async function runTest() {
  console.log('Running long-running memory leak test...');
  console.log('This test will run for a long time. Press Ctrl+C to stop.');
  
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
  
  // Create persistent subscriptions
  console.log('Creating persistent subscriptions...');
  subscriptions.push(
    users.subscribe({}, (docs) => {
      // Log the count
      logs.insert({
        type: 'users_all',
        count: docs.length,
        timestamp: new Date().toISOString()
      });
    })
  );
  
  subscriptions.push(
    users.subscribe({ age: { $gt: 50 } }, (docs) => {
      // Log the count
      logs.insert({
        type: 'users_over_50',
        count: docs.length,
        timestamp: new Date().toISOString()
      });
    })
  );
  
  subscriptions.push(
    logs.subscribe({}, (docs) => {
      // Do nothing with the results
    })
  );
  
  // Start the main test loop
  console.log('Starting main test loop...');
  await runCycle();
}

// Run a single test cycle
async function runCycle() {
  if (!running || cycleCount >= MAX_CYCLES) {
    await finishTest();
    return;
  }
  
  cycleCount++;
  console.log(`Cycle ${cycleCount}/${MAX_CYCLES}...`);
  
  try {
    // Insert new users
    for (let i = 0; i < 100; i++) {
      await users.insert({
        name: `Cycle ${cycleCount} User ${i}`,
        email: `cycle${cycleCount}user${i}@example.com`,
        age: Math.floor(Math.random() * 100)
      });
    }
    
    // Update some users
    await users.update(
      { age: { $lt: 30 } },
      { $set: { status: 'young' } }
    );
    
    // Delete some users
    await users.delete({ age: { $gt: 90 } });
    
    // Query users
    await users.find({ status: 'young' });
    
    // Force garbage collection every 5 cycles
    if (cycleCount % 5 === 0 && global.gc) {
      global.gc();
    }
    
    // Create heap dump at intervals
    if (cycleCount % HEAP_DUMP_INTERVAL === 0) {
      const heapDumpFile = path.join(heapDumpsDir, `cycle-${cycleCount}-${Date.now()}.heapsnapshot`);
      heapdump.writeSnapshot(heapDumpFile, (err) => {
        if (err) console.error('Failed to write heap dump:', err);
        else console.log(`Heap dump written to ${heapDumpFile}`);
      });
    }
    
    // Print memory usage
    const memUsage = process.memoryUsage();
    console.log(`Memory usage: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    
    // Schedule next cycle
    setTimeout(runCycle, 1000);
  } catch (error) {
    console.error('Error in test cycle:', error);
    await finishTest();
  }
}

// Finish the test
async function finishTest() {
  console.log('Finishing test...');
  
  // Unsubscribe from all subscriptions
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
  
  // Check for memory leaks
  const diff = baseline.end();
  console.log('Heap diff:', diff);
  
  // Check if there's a significant memory leak
  if (diff.change.size_bytes > 5000000) { // 5MB threshold for long-running test
    console.error('Potential memory leak detected in long-running test!');
    
    // Create final heap dump
    const heapDumpFile = path.join(heapDumpsDir, `final-${Date.now()}.heapsnapshot`);
    heapdump.writeSnapshot(heapDumpFile, (err) => {
      if (err) console.error('Failed to write heap dump:', err);
      else console.log(`Final heap dump written to ${heapDumpFile}`);
      process.exit(1);
    });
  } else {
    console.log('No significant memory leaks detected in long-running test.');
    process.exit(0);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('Test interrupted. Cleaning up...');
  running = false;
  // Let the current cycle finish and clean up
});

// Run test
runTest().catch(console.error);
