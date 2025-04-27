import { describe, it, expect, beforeEach } from 'vitest';
import { createDb } from '@nebula-db/core';
import { MemoryAdapter } from '@nebula-db/adapter-memory';
import { performance } from 'perf_hooks';

describe('Indexing Performance Tests', () => {
  const DOCUMENT_COUNT = 10000;
  let db: any;
  let collection: any;
  let collectionWithIndex: any;
  
  // Setup test data
  beforeEach(async () => {
    // Create database
    db = createDb({ adapter: new MemoryAdapter() });
    
    // Create collection without indexes
    collection = db.collection('items_no_index');
    
    // Create collection with indexes
    collectionWithIndex = db.collection('items_with_index', {
      indexes: [
        { name: 'price_idx', fields: ['price'], type: 'single' },
        { name: 'category_name_idx', fields: ['category', 'name'], type: 'compound' }
      ]
    });
    
    // Generate test data
    const documents = Array.from({ length: DOCUMENT_COUNT }, (_, i) => ({
      id: `item-${i}`,
      name: `Product ${i}`,
      price: Math.floor(Math.random() * 1000),
      category: ['Electronics', 'Clothing', 'Food', 'Books', 'Toys'][Math.floor(Math.random() * 5)],
      inStock: Math.random() > 0.3,
      tags: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, 
        (_, j) => ['sale', 'new', 'popular', 'limited', 'exclusive'][j])
    }));
    
    // Insert data into both collections
    await collection.insertBatch(documents);
    await collectionWithIndex.insertBatch(documents);
  });
  
  it('should perform faster queries with indexes', async () => {
    // Test query: price range query
    const priceQuery = { price: { $gte: 300, $lte: 700 } };
    
    // Query without index
    const startNoIndex = performance.now();
    const resultsNoIndex = await collection.find(priceQuery);
    const endNoIndex = performance.now();
    const timeNoIndex = endNoIndex - startNoIndex;
    
    // Query with index
    const startWithIndex = performance.now();
    const resultsWithIndex = await collectionWithIndex.find(priceQuery);
    const endWithIndex = performance.now();
    const timeWithIndex = endWithIndex - startWithIndex;
    
    // Log performance results
    console.log(`Query without index: ${timeNoIndex.toFixed(2)}ms`);
    console.log(`Query with index: ${timeWithIndex.toFixed(2)}ms`);
    console.log(`Performance improvement: ${((timeNoIndex - timeWithIndex) / timeNoIndex * 100).toFixed(2)}%`);
    
    // Verify results are the same
    expect(resultsNoIndex.length).toBe(resultsWithIndex.length);
    
    // Expect indexed query to be faster
    expect(timeWithIndex).toBeLessThan(timeNoIndex);
  });
  
  it('should perform faster compound queries with indexes', async () => {
    // Test query: category and name query
    const compoundQuery = { 
      category: 'Electronics',
      name: { $regex: 'Product 1' } 
    };
    
    // Query without index
    const startNoIndex = performance.now();
    const resultsNoIndex = await collection.find(compoundQuery);
    const endNoIndex = performance.now();
    const timeNoIndex = endNoIndex - startNoIndex;
    
    // Query with index
    const startWithIndex = performance.now();
    const resultsWithIndex = await collectionWithIndex.find(compoundQuery);
    const endWithIndex = performance.now();
    const timeWithIndex = endWithIndex - startWithIndex;
    
    // Log performance results
    console.log(`Compound query without index: ${timeNoIndex.toFixed(2)}ms`);
    console.log(`Compound query with index: ${timeWithIndex.toFixed(2)}ms`);
    console.log(`Performance improvement: ${((timeNoIndex - timeWithIndex) / timeNoIndex * 100).toFixed(2)}%`);
    
    // Verify results are the same
    expect(resultsNoIndex.length).toBe(resultsWithIndex.length);
    
    // Expect indexed query to be faster
    expect(timeWithIndex).toBeLessThan(timeNoIndex);
  });
});
