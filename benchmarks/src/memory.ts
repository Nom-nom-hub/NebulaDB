import { getAdapters } from './adapters';
import { generateDocuments } from './data';

/**
 * Run memory usage benchmarks
 */
export async function runMemoryBenchmarks(): Promise<void> {
  console.log('=== Memory Usage Benchmarks ===');
  
  const adapters = getAdapters();
  const documentCounts = [100, 1000, 10000];
  
  for (const count of documentCounts) {
    console.log(`\nTesting with ${count} documents:`);
    
    // Generate test data
    const documents = generateDocuments(count);
    
    for (const adapter of adapters) {
      // Force garbage collection
      if (global.gc) {
        global.gc();
      }
      
      // Measure baseline memory
      const baselineMemory = process.memoryUsage().heapUsed;
      
      // Setup adapter
      await adapter.setup();
      
      // Insert documents
      for (const doc of documents) {
        await adapter.insert({ ...doc });
      }
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
      }
      
      // Measure memory after insertion
      const afterMemory = process.memoryUsage().heapUsed;
      const memoryUsage = (afterMemory - baselineMemory) / 1024 / 1024;
      
      console.log(`${adapter.name}: ${memoryUsage.toFixed(2)} MB`);
      
      // Cleanup
      await adapter.cleanup();
    }
  }
}

// Run if called directly
if (require.main === module) {
  runMemoryBenchmarks().catch(console.error);
}
