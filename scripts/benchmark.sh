#!/bin/bash

# Run benchmarks
cd benchmarks
npm install
npm run benchmark
cd ..

echo "Benchmarks completed!"
