#!/usr/bin/env node
/**
 * Publish script for NebulaDB packages
 * Usage: node scripts/publish.js [--dry-run]
 * 
 * This script:
 * 1. Updates all package versions to match core
 * 2. Builds packages that need it (skips already-built)
 * 3. Publishes to npm
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const packagesDir = path.join(__dirname, '..', 'packages');
const dryRun = process.argv.includes('--dry-run');

// Get version from core package
const corePkg = JSON.parse(fs.readFileSync(path.join(packagesDir, 'core', 'package.json')));
const targetVersion = corePkg.version;
console.log(`Target version: ${targetVersion}`);

// Find all packages
const allPackages = [];
for (const entry of fs.readdirSync(packagesDir)) {
  const entryPath = path.join(packagesDir, entry);
  if (fs.statSync(entryPath).isDirectory()) {
    if (entry === 'plugins') {
      for (const sub of fs.readdirSync(entryPath)) {
        const subPath = path.join(entryPath, sub);
        if (fs.statSync(subPath).isDirectory() && fs.existsSync(path.join(subPath, 'package.json'))) {
          allPackages.push({ name: `@nebula-db/plugin-${sub}`, path: subPath });
        }
      }
    } else if (entry === 'plugin') {
      for (const sub of fs.readdirSync(entryPath)) {
        const subPath = path.join(entryPath, sub);
        if (fs.statSync(subPath).isDirectory() && fs.existsSync(path.join(subPath, 'package.json'))) {
          const pkg = JSON.parse(fs.readFileSync(path.join(subPath, 'package.json')));
          allPackages.push({ name: pkg.name, path: subPath });
        }
      }
    } else {
      const pkgPath = path.join(entryPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath));
        allPackages.push({ name: pkg.name, path: entryPath });
      }
    }
  }
}

console.log(`\nFound ${allPackages.length} packages to process:\n`);

for (const { name, path: pkgPath } of allPackages) {
  const pkg = JSON.parse(fs.readFileSync(path.join(pkgPath, 'package.json')));
  console.log(`  ${name}: ${pkg.version} → ${targetVersion}`);
}

const hasDistFiles = (pkgPath) => {
  const distPath = path.join(pkgPath, 'dist');
  if (!fs.existsSync(distPath)) return false;
  const files = fs.readdirSync(distPath);
  return files.some(f => f.endsWith('.js') || f.endsWith('.mjs'));
};

if (!dryRun) {
  console.log('\n--- Building packages ---\n');

  for (const { name, path: pkgPath } of allPackages) {
    if (hasDistFiles(pkgPath)) {
      console.log(`⏭️  ${name} already built, skipping`);
      continue;
    }
    try {
      console.log(`Building ${name}...`);
      execSync('npm run build', { stdio: 'inherit', cwd: pkgPath });
      console.log(`✅ ${name} built`);
    } catch (err) {
      console.error(`❌ Failed to build ${name}`);
    }
  }
  
  console.log('\n--- Publishing packages ---\n');
  
  // Publish each
  for (const { name, path: pkgPath } of allPackages) {
    try {
      console.log(`\nPublishing ${name}...`);
      execSync('npm publish --access public', { stdio: 'inherit', cwd: pkgPath });
      console.log(`✅ ${name} published`);
    } catch (err) {
      console.error(`❌ Failed to publish ${name}: ${err.message}`);
    }
  }
} else {
  console.log('\n--- Dry run complete (no changes made) ---');
}