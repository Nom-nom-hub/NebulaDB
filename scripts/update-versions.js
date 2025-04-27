#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// New version to set
const NEW_VERSION = '0.2.2';
const OLD_VERSION = '0.2.1';

// Function to update version in package.json
function updatePackageVersion(packagePath) {
  const packageJsonPath = path.join(packagePath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    console.log(`Skipping ${packagePath} - no package.json found`);
    return;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Update version
    if (packageJson.version === OLD_VERSION) {
      packageJson.version = NEW_VERSION;
      console.log(`Updating ${packagePath} version to ${NEW_VERSION}`);
    } else {
      console.log(`Skipping ${packagePath} - version is not ${OLD_VERSION}`);
    }

    // Update peer dependencies
    if (packageJson.peerDependencies) {
      Object.keys(packageJson.peerDependencies).forEach(dep => {
        if (dep.startsWith('@nebula-db/') &&
            packageJson.peerDependencies[dep] === `^${OLD_VERSION}`) {
          packageJson.peerDependencies[dep] = `^${NEW_VERSION}`;
          console.log(`Updating ${packagePath} peer dependency ${dep} to ^${NEW_VERSION}`);
        }
      });
    }

    // Write updated package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  } catch (error) {
    console.error(`Error updating ${packagePath}:`, error);
  }
}

// Update root package
updatePackageVersion('.');

// Update core package
updatePackageVersion('./packages/core');

// Update adapter packages
const adaptersDir = './packages/adapters';
if (fs.existsSync(adaptersDir)) {
  fs.readdirSync(adaptersDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .forEach(dirent => {
      updatePackageVersion(path.join(adaptersDir, dirent.name));
    });
}

// Update plugin packages
const pluginsDir = './packages/plugins';
if (fs.existsSync(pluginsDir)) {
  fs.readdirSync(pluginsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .forEach(dirent => {
      updatePackageVersion(path.join(pluginsDir, dirent.name));
    });
}

// Update other packages
const packagesDir = './packages';
fs.readdirSync(packagesDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .filter(dirent => !['core', 'adapters', 'plugins'].includes(dirent.name))
  .forEach(dirent => {
    updatePackageVersion(path.join(packagesDir, dirent.name));
  });

console.log('Version update complete!');
