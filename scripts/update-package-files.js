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
    
    // Update the files array to include README.md
    if (packageJson.files && !packageJson.files.includes('README.md')) {
      packageJson.files.push('README.md');
      modified = true;
    }
    
    // Increment the patch version
    if (packageJson.version) {
      const versionParts = packageJson.version.split('.');
      versionParts[2] = parseInt(versionParts[2]) + 1;
      packageJson.version = versionParts.join('.');
      modified = true;
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
console.log('Package.json files have been updated to include README.md!');
