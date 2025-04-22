import Benchmark from 'benchmark';
import { getAdapters } from './adapters';
import { generateDocuments, generateUpdate } from './data';
import { BenchmarkSuiteResults } from './types';

/**
 * Run update benchmarks
 */
export async function runUpdateBenchmarks(): Promise<BenchmarkSuiteResults[]> {
  const results: BenchmarkSuiteResults[] = [];
  
  // Single update
  results.push(await runSingleUpdateBenchmark());
  
  // Bulk update
  results.push(await runBulkUpdateBenchmark());
  
  return results;
}

/**
 * Run single update benchmark
 */
async function runSingleUpdateBenchmark(): Promise<BenchmarkSuiteResults> {
  const suite = new Benchmark.Suite('Single Update');
  const adapters = getAdapters();
  
  // Generate test data
  const documents = generateDocuments(1000);
  
  // Setup adapters and insert data
  for (const adapter of adapters) {
    await adapter.setup();
    
    for (const doc of documents) {
      await adapter.insert({ ...doc });
    }
  }
  
  // Create update
  const update = {
    $set: {
      age: 42,
      'address.city': 'New York'
    }
  };
  
  // Add tests
  for (const adapter of adapters) {
    suite.add(adapter.name, {
      defer: true,
      fn: async (deferred: any) => {
        // Get a random document to update
        const randomIndex = Math.floor(Math.random() * documents.length);
        const doc = documents[randomIndex];
        
        await adapter.update({ email: doc.email }, update);
        deferred.resolve();
      }
    });
  }
  
  // Run benchmarks
  const results = await new Promise<BenchmarkSuiteResults>((resolve) => {
    const benchmarkResults: BenchmarkSuiteResults = {
      name: 'Single Update',
      results: []
    };
    
    suite
      .on('cycle', (event: any) => {
        console.log(String(event.target));
        
        benchmarkResults.results.push({
          name: event.target.name,
          hz: event.target.hz,
          stats: {
            mean: event.target.stats.mean,
            deviation: event.target.stats.deviation,
            moe: event.target.stats.moe
          },
          samples: event.target.stats.sample
        });
      })
      .on('complete', () => {
        console.log('Fastest is ' + suite.filter('fastest').map('name'));
        resolve(benchmarkResults);
      })
      .run({ async: true });
  });
  
  // Cleanup adapters
  for (const adapter of adapters) {
    await adapter.cleanup();
  }
  
  return results;
}

/**
 * Run bulk update benchmark
 */
async function runBulkUpdateBenchmark(): Promise<BenchmarkSuiteResults> {
  const suite = new Benchmark.Suite('Bulk Update');
  const adapters = getAdapters();
  
  // Generate test data
  const documents = generateDocuments(1000);
  
  // Setup adapters and insert data
  for (const adapter of adapters) {
    await adapter.setup();
    
    for (const doc of documents) {
      await adapter.insert({ ...doc });
    }
  }
  
  // Create update
  const update = {
    $set: {
      age: 42,
      'address.city': 'New York'
    }
  };
  
  // Add tests
  for (const adapter of adapters) {
    suite.add(adapter.name, {
      defer: true,
      fn: async (deferred: any) => {
        // Update all documents with age > 30
        await adapter.update({ age: { $gt: 30 } }, update);
        deferred.resolve();
      }
    });
  }
  
  // Run benchmarks
  const results = await new Promise<BenchmarkSuiteResults>((resolve) => {
    const benchmarkResults: BenchmarkSuiteResults = {
      name: 'Bulk Update',
      results: []
    };
    
    suite
      .on('cycle', (event: any) => {
        console.log(String(event.target));
        
        benchmarkResults.results.push({
          name: event.target.name,
          hz: event.target.hz,
          stats: {
            mean: event.target.stats.mean,
            deviation: event.target.stats.deviation,
            moe: event.target.stats.moe
          },
          samples: event.target.stats.sample
        });
      })
      .on('complete', () => {
        console.log('Fastest is ' + suite.filter('fastest').map('name'));
        resolve(benchmarkResults);
      })
      .run({ async: true });
  });
  
  // Cleanup adapters
  for (const adapter of adapters) {
    await adapter.cleanup();
  }
  
  return results;
}
