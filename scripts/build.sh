#!/bin/bash
set -e

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Build core package
echo ""
echo "Building core package..."
cd packages/core
npm run build
cd ../..

echo ""
echo "Build completed successfully!"
