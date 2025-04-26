#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';

const vite = spawn('npx', ['vite'], {
  stdio: 'inherit',
  shell: true
});

vite.on('error', (err) => {
  console.error('Failed to start Vite:', err);
  process.exit(1);
});

vite.on('close', (code) => {
  console.log(`Vite process exited with code ${code}`);
  process.exit(code);
});
