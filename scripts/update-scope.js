#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to update a package.json file
function updatePackageJson(filePath) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Skip node_modules
    if (filePath.includes('node_modules')) {
      return;
    }
    
    // Skip the root package.json
    if (packageJson.name === 'nebula-db') {
      return;
    }
    
    let modified = false;
    
    // Update package name from @nebula-db/* to @teckmill/*
    if (packageJson.name && packageJson.name.startsWith('@nebula-db/')) {
      const packageName = packageJson.name.replace('@nebula-db/', '');
      packageJson.name = `@teckmill/${packageName}`;
      modified = true;
    }
    
    // Update peer dependencies
    if (packageJson.peerDependencies) {
      Object.keys(packageJson.peerDependencies).forEach(dep => {
        if (dep.startsWith('@nebula-db/')) {
          const newDep = dep.replace('@nebula-db/', '@teckmill/');
          packageJson.peerDependencies[newDep] = packageJson.peerDependencies[dep];
          delete packageJson.peerDependencies[dep];
          modified = true;
        }
      });
    }
    
    // Update dependencies
    if (packageJson.dependencies) {
      Object.keys(packageJson.dependencies).forEach(dep => {
        if (dep.startsWith('@nebula-db/')) {
          const newDep = dep.replace('@nebula-db/', '@teckmill/');
          packageJson.dependencies[newDep] = packageJson.dependencies[dep];
          delete packageJson.dependencies[dep];
          modified = true;
        }
      });
    }
    
    // Write the updated package.json back to the file
    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log(`Updated ${filePath}`);
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
console.log('Package.json files have been updated with the new scope!');
