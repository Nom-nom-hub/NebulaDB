import Benchmark from 'benchmark';
import { getAdapters } from './adapters';
import { generateDocument, generateDocuments } from './data';
import { BenchmarkSuiteResults } from './types';

/**
 * Run insert benchmarks
 */
export async function runInsertBenchmarks(): Promise<BenchmarkSuiteResults[]> {
  const results: BenchmarkSuiteResults[] = [];
  
  // Single document insert
  results.push(await runSingleInsertBenchmark());
  
  // Bulk insert
  results.push(await runBulkInsertBenchmark());
  
  return results;
}

/**
 * Run single insert benchmark
 */
async function runSingleInsertBenchmark(): Promise<BenchmarkSuiteResults> {
  const suite = new Benchmark.Suite('Single Insert');
  const adapters = getAdapters();
  
  // Setup adapters
  for (const adapter of adapters) {
    await adapter.setup();
  }
  
  // Add tests
  for (const adapter of adapters) {
    suite.add(adapter.name, {
      defer: true,
      fn: async (deferred: any) => {
        await adapter.insert(generateDocument());
        deferred.resolve();
      }
    });
  }
  
  // Run benchmarks
  const results = await new Promise<BenchmarkSuiteResults>((resolve) => {
    const benchmarkResults: BenchmarkSuiteResults = {
      name: 'Single Insert',
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
 * Run bulk insert benchmark
 */
async function runBulkInsertBenchmark(): Promise<BenchmarkSuiteResults> {
  const suite = new Benchmark.Suite('Bulk Insert (100 docs)');
  const adapters = getAdapters();
  
  // Generate test data
  const documents = generateDocuments(100);
  
  // Setup adapters
  for (const adapter of adapters) {
    await adapter.setup();
  }
  
  // Add tests
  for (const adapter of adapters) {
    suite.add(adapter.name, {
      defer: true,
      fn: async (deferred: any) => {
        for (const doc of documents) {
          await adapter.insert({ ...doc });
        }
        deferred.resolve();
      }
    });
  }
  
  // Run benchmarks
  const results = await new Promise<BenchmarkSuiteResults>((resolve) => {
    const benchmarkResults: BenchmarkSuiteResults = {
      name: 'Bulk Insert (100 docs)',
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
