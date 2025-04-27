import { runNestedQueryBenchmark } from './nested-query-benchmark';

console.log('Starting nested query benchmark...');
runNestedQueryBenchmark()
  .then(() => {
    console.log('Benchmark completed successfully');
  })
  .catch(error => {
    console.error('Benchmark failed:', error);
    process.exit(1);
  });