#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Run the benchmark
console.log('Running NebulaDB benchmark...');
try {
  // Run the JavaScript version of the benchmark
  execSync('node index.js', {
    cwd: __dirname,
    stdio: 'inherit'
  });
} catch (error) {
  console.error('Benchmark failed:', error);
  process.exit(1);
}
