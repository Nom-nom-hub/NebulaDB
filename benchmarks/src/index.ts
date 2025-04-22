import { runInsertBenchmarks } from './insert';
import { runQueryBenchmarks } from './query';
import { runUpdateBenchmarks } from './update';
import { generateReport } from './report';

async function runAllBenchmarks() {
  console.log('Running NebulaDB Benchmarks...\n');
  
  console.log('=== Insert Benchmarks ===');
  const insertResults = await runInsertBenchmarks();
  console.log('\n');
  
  console.log('=== Query Benchmarks ===');
  const queryResults = await runQueryBenchmarks();
  console.log('\n');
  
  console.log('=== Update Benchmarks ===');
  const updateResults = await runUpdateBenchmarks();
  console.log('\n');
  
  console.log('Generating report...');
  await generateReport({
    insert: insertResults,
    query: queryResults,
    update: updateResults
  });
  
  console.log('Benchmarks completed!');
}

runAllBenchmarks().catch(console.error);
