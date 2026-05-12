#!/usr/bin/env node
/**
 * Add prepublishOnly script and files config to all packages
 * Usage: node scripts/prepare-packages.js
 */

const fs = require('fs');
const path = require('path');

const packagesDir = path.join(__dirname, '..', 'packages');

const allPackages = [];

// Collect all packages
for (const entry of fs.readdirSync(packagesDir)) {
  const entryPath = path.join(packagesDir, entry);
  if (fs.statSync(entryPath).isDirectory()) {
    if (entry === 'plugins') {
      for (const sub of fs.readdirSync(entryPath)) {
        const subPath = path.join(entryPath, sub);
        const pkgPath = path.join(subPath, 'package.json');
        if (fs.statSync(subPath).isDirectory() && fs.existsSync(pkgPath)) {
          allPackages.push(pkgPath);
        }
      }
    } else if (entry === 'plugin') {
      for (const sub of fs.readdirSync(entryPath)) {
        const subPath = path.join(entryPath, sub);
        const pkgPath = path.join(subPath, 'package.json');
        if (fs.statSync(subPath).isDirectory() && fs.existsSync(pkgPath)) {
          allPackages.push(pkgPath);
        }
      }
    } else {
      const pkgPath = path.join(entryPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        allPackages.push(pkgPath);
      }
    }
  }
}

for (const pkgPath of allPackages) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath));
  let modified = false;
  
  // Add files config if missing
  if (!pkg.files) {
    pkg.files = ['dist', 'README.md', 'LICENSE'];
    modified = true;
  }
  
  // Add prepublishOnly script if missing
  if (!pkg.scripts?.prepublishOnly) {
    if (!pkg.scripts) pkg.scripts = {};
    pkg.scripts.prepublishOnly = 'npm run build';
    modified = true;
  }
  
  // Add build script if missing
  if (!pkg.scripts?.build) {
    if (!pkg.scripts) pkg.scripts = {};
    pkg.scripts.build = 'tsc';
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Updated ${pkg.name}`);
  }
}

console.log('\nDone!');