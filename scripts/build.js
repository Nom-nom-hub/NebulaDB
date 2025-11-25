#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('Installing root dependencies...');
execSync('npm install --ignore-scripts --legacy-peer-deps', { stdio: 'inherit' });

console.log('\nBuilding core package...');
process.chdir(path.join(__dirname, '..', 'packages', 'core'));
execSync('npm run build', { stdio: 'inherit' });

console.log('\nBuild completed successfully!');
