#!/usr/bin/env node
/**
 * Bump all package versions to match core
 * Usage: node scripts/bump-versions.js
 */

const fs = require('fs');
const path = require('path');

const packagesDir = path.join(__dirname, '..', 'packages');

// Get core version
const corePkg = JSON.parse(fs.readFileSync(path.join(packagesDir, 'core', 'package.json')));
const coreVersion = corePkg.version;

console.log(`Bumping all packages to version ${coreVersion}...\n`);

const allPackages = [];

// Collect all packages
for (const entry of fs.readdirSync(packagesDir)) {
  const entryPath = path.join(packagesDir, entry);
  if (fs.statSync(entryPath).isDirectory()) {
    if (entry === 'plugins') {
      for (const sub of fs.readdirSync(entryPath)) {
        const subPath = path.join(entryPath, sub);
        if (fs.statSync(subPath).isDirectory()) {
          const pkgPath = path.join(subPath, 'package.json');
          if (fs.existsSync(pkgPath)) {
            allPackages.push({ path: pkgPath, name: `@nebula-db/plugin-${sub}` });
          }
        }
      }
    } else if (entry === 'plugin') {
      for (const sub of fs.readdirSync(entryPath)) {
        const subPath = path.join(entryPath, sub);
        if (fs.statSync(subPath).isDirectory()) {
          const pkgPath = path.join(subPath, 'package.json');
          if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath));
            allPackages.push({ path: pkgPath, name: pkg.name });
          }
        }
      }
    } else {
      const pkgPath = path.join(entryPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath));
        allPackages.push({ path: pkgPath, name: pkg.name });
      }
    }
  }
}

// Update versions
for (const { path, name } of allPackages) {
  const pkg = JSON.parse(fs.readFileSync(path));
  if (pkg.version !== coreVersion) {
    console.log(`${name}: ${pkg.version} → ${coreVersion}`);
    pkg.version = coreVersion;
    fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
  }
}

console.log('\nDone! All packages now at ' + coreVersion);