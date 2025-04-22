#!/bin/bash

# Install root dependencies
npm install

# Build core package
cd packages/core
npm install
npm run build
cd ../..

# Build memory adapter
cd packages/adapters/memory
npm install
npm run build
cd ../../..

# Build localStorage adapter
cd packages/adapters/localstorage
npm install
npm run build
cd ../../..

# Build IndexedDB adapter
cd packages/adapters/indexeddb
npm install
npm run build
cd ../../..

# Build FileSystem adapter
cd packages/adapters/filesystem
npm install
npm run build
cd ../../..

# Build validation plugin
cd packages/plugins/validation
npm install
npm run build
cd ../../..

# Build encryption plugin
cd packages/plugins/encryption
npm install
npm run build
cd ../../..

# Build versioning plugin
cd packages/plugins/versioning
npm install
npm run build
cd ../../..

# Install test dependencies
cd tests
npm install
cd ..

echo "Build completed successfully!"
