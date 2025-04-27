#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Run the transaction performance benchmark
console.log('Running NebulaDB Transaction Performance Benchmark...');
try {
  execSync('node transaction-performance.js', {
    cwd: __dirname,
    stdio: 'inherit'
  });
} catch (error) {
  console.error('Benchmark failed:', error);
  process.exit(1);
}
