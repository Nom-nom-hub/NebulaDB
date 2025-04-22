import Benchmark from 'benchmark';
import { getAdapters } from './adapters';
import { generateDocuments, generateQuery } from './data';
import { BenchmarkSuiteResults } from './types';

/**
 * Run query benchmarks
 */
export async function runQueryBenchmarks(): Promise<BenchmarkSuiteResults[]> {
  const results: BenchmarkSuiteResults[] = [];
  
  // Simple query
  results.push(await runSimpleQueryBenchmark());
  
  // Complex query
  results.push(await runComplexQueryBenchmark());
  
  // Indexed query
  results.push(await runIndexedQueryBenchmark());
  
  return results;
}

/**
 * Run simple query benchmark
 */
async function runSimpleQueryBenchmark(): Promise<BenchmarkSuiteResults> {
  const suite = new Benchmark.Suite('Simple Query');
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
  
  // Create simple query
  const query = { age: 30 };
  
  // Add tests
  for (const adapter of adapters) {
    suite.add(adapter.name, {
      defer: true,
      fn: async (deferred: any) => {
        await adapter.find(query);
        deferred.resolve();
      }
    });
  }
  
  // Run benchmarks
  const results = await new Promise<BenchmarkSuiteResults>((resolve) => {
    const benchmarkResults: BenchmarkSuiteResults = {
      name: 'Simple Query',
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
 * Run complex query benchmark
 */
async function runComplexQueryBenchmark(): Promise<BenchmarkSuiteResults> {
  const suite = new Benchmark.Suite('Complex Query');
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
  
  // Create complex query
  const query = {
    age: { $gte: 25, $lte: 50 },
    'address.state': 'California'
  };
  
  // Add tests
  for (const adapter of adapters) {
    suite.add(adapter.name, {
      defer: true,
      fn: async (deferred: any) => {
        await adapter.find(query);
        deferred.resolve();
      }
    });
  }
  
  // Run benchmarks
  const results = await new Promise<BenchmarkSuiteResults>((resolve) => {
    const benchmarkResults: BenchmarkSuiteResults = {
      name: 'Complex Query',
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
 * Run indexed query benchmark
 */
async function runIndexedQueryBenchmark(): Promise<BenchmarkSuiteResults> {
  const suite = new Benchmark.Suite('Indexed Query');
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
  
  // Create indexed query (email is indexed)
  const email = documents[500].email;
  const query = { email };
  
  // Add tests
  for (const adapter of adapters) {
    suite.add(adapter.name, {
      defer: true,
      fn: async (deferred: any) => {
        await adapter.findOne(query);
        deferred.resolve();
      }
    });
  }
  
  // Run benchmarks
  const results = await new Promise<BenchmarkSuiteResults>((resolve) => {
    const benchmarkResults: BenchmarkSuiteResults = {
      name: 'Indexed Query',
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
