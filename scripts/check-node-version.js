#!/usr/bin/env node

/**
 * This script checks if the current Node.js version meets the requirements.
 * It will display a warning if the version is below the recommended version,
 * but will not prevent execution unless the version is below the minimum required.
 */

const currentNodeVersion = process.versions.node;
const semver = currentNodeVersion.split('.');
const major = parseInt(semver[0], 10);

const REQUIRED_NODE_VERSION = 18;
const RECOMMENDED_NODE_VERSION = 18;

// Check if Node.js version is below the minimum required
if (major < REQUIRED_NODE_VERSION) {
  console.error('\x1b[31m%s\x1b[0m', `
========================================================
  ERROR: You are running Node.js ${currentNodeVersion}
========================================================

  NebulaDB requires Node.js ${REQUIRED_NODE_VERSION}.x or higher.
  Please update your version of Node.js.

  Visit https://nodejs.org/ to download the latest version.

  If you cannot upgrade Node.js, you can try using nvm to
  manage multiple Node.js versions:
  https://github.com/nvm-sh/nvm

  For development purposes only, you can bypass this check
  by setting the NEBULA_SKIP_VERSION_CHECK environment variable:
  
  NEBULA_SKIP_VERSION_CHECK=1 npm run <command>
  
========================================================
`);

  // Allow bypass with environment variable for development purposes
  if (!process.env.NEBULA_SKIP_VERSION_CHECK) {
    process.exit(1);
  } else {
    console.warn('\x1b[33m%s\x1b[0m', '  WARNING: Node.js version check bypassed. Proceed with caution!\n');
  }
}

// Show a warning if Node.js version is below the recommended version
if (major < RECOMMENDED_NODE_VERSION && major >= REQUIRED_NODE_VERSION) {
  console.warn('\x1b[33m%s\x1b[0m', `
========================================================
  WARNING: You are running Node.js ${currentNodeVersion}
========================================================

  While this version meets the minimum requirements,
  Node.js ${RECOMMENDED_NODE_VERSION}.x or higher is recommended for
  optimal performance and compatibility.

  Some development dependencies may show warnings.
  
========================================================
`);
}
