#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Target version to set for all packages
const TARGET_VERSION = '0.2.0';

// Function to update a package.json file
function updatePackageJson(filePath) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Skip node_modules
    if (filePath.includes('node_modules')) {
      return;
    }
    
    // Skip the root package.json (it's already at 0.2.0)
    if (packageJson.name === 'nebula-db') {
      return;
    }
    
    let modified = false;
    
    // Update the version
    if (packageJson.version !== TARGET_VERSION) {
      packageJson.version = TARGET_VERSION;
      modified = true;
    }
    
    // Update dependencies to the new version
    if (packageJson.dependencies) {
      Object.keys(packageJson.dependencies).forEach(dep => {
        if (dep.startsWith('@nebula-db/')) {
          packageJson.dependencies[dep] = `^${TARGET_VERSION}`;
          modified = true;
        }
      });
    }
    
    // Update peer dependencies to the new version
    if (packageJson.peerDependencies) {
      Object.keys(packageJson.peerDependencies).forEach(dep => {
        if (dep.startsWith('@nebula-db/')) {
          packageJson.peerDependencies[dep] = `^${TARGET_VERSION}`;
          modified = true;
        }
      });
    }
    
    // Write the updated package.json back to the file
    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log(`Updated ${filePath} to version ${TARGET_VERSION}`);
    }
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
  }
}

// Function to recursively find all package.json files
function findPackageJsonFiles(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules')) {
      findPackageJsonFiles(filePath);
    } else if (file === 'package.json') {
      updatePackageJson(filePath);
    }
  });
}

// Start the process from the packages directory
findPackageJsonFiles(path.join(__dirname, '..', 'packages'));
console.log(`All package versions have been aligned to ${TARGET_VERSION}!`);
