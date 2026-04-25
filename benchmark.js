import { createDb, Database, Document } from './core';
import { Adapter } from './core';

export interface BenchmarkResult {
  name: string;
  operations: number;
  duration: number;
  opsPerSec: number;
  avgLatency: number;
}

export interface BenchmarkConfig {
  documentCount?: number;
  batchSize?: number;
  iterations?: number;
}

export async function runBenchmarks(
  adapter: Adapter,
  config: BenchmarkConfig = {}
): Promise<BenchmarkResult[]> {
  const {
    documentCount = 10000,
    batchSize = 1000,
    iterations = 10
  } = config;

  const results: BenchmarkResult[] = [];
  const db = createDb({ adapter, name: 'benchmark' });
  const collection = db.collection('bench');

  results.push(
    await benchmarkInsert(collection, documentCount, batchSize, iterations)
  );
  results.push(
    await benchmarkFind(collection, documentCount, iterations)
  );
  results.push(
    await benchmarkUpdate(collection, documentCount, iterations)
  );
  results.push(
    await benchmarkDelete(collection, documentCount, iterations)
  );

  return results;
}

async function benchmarkInsert(
  collection: any,
  count: number,
  iterations: number
): Promise<BenchmarkResult> {
  const ops = [];
  let totalTime = 0;

  for (let i = 0; i < iterations; i++) {
    await collection.delete({});

    const docs = Array.from({ length: count }, (_, idx) => ({
      id: `bench-${i}-${idx}`,
      data: `value-${idx}`,
      index: idx,
      timestamp: Date.now()
    }));

    const start = performance.now();
    for (const doc of docs) {
      await collection.insert(doc);
    }
    const end = performance.now();

    ops.push(end - start);
    totalTime += end - start;
  }

  const avgTime = totalTime / iterations;
  const docsPerSec = count / (avgTime / 1000);

  return {
    name: 'Insert',
    operations: count,
    duration: avgTime,
    opsPerSec: docsPerSec,
    avgLatency: avgTime / count
  };
}

async function benchmarkFind(
  collection: any,
  count: number,
  iterations: number
): Promise<BenchmarkResult> {
  const ops = [];
  let totalTime = 0;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await collection.find({ index: { $gt: i } });
    const end = performance.now();

    ops.push(end - start);
    totalTime += end - start;
  }

  const avgTime = totalTime / iterations;
  const opsPerSec = 1000 / avgTime;

  return {
    name: 'Find',
    operations: 1,
    duration: avgTime,
    opsPerSec,
    avgLatency: avgTime
  };
}

async function benchmarkUpdate(
  collection: any,
  count: number,
  iterations: number
): Promise<BenchmarkResult> {
  const ops = [];
  let totalTime = 0;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await collection.update(
      { index: { $lt: 100 } },
      { $set: { updated: true } }
    );
    const end = performance.now();

    ops.push(end - start);
    totalTime += end - start;
  }

  const avgTime = totalTime / iterations;
  const docsPerSec = 100 / (avgTime / 1000);

  return {
    name: 'Update (100 docs)',
    operations: 100,
    duration: avgTime,
    opsPerSec: docsPerSec,
    avgLatency: avgTime / 100
  };
}

async function benchmarkDelete(
  collection: any,
  count: number,
  iterations: number
): Promise<BenchmarkResult> {
  const ops = [];
  let totalTime = 0;

  for (let i = 0; i < iterations; i++) {
    await collection.insert({
      id: `temp-${i}`,
      data: 'temp'
    });

    const start = performance.now();
    await collection.delete({ id: { $regex: '^temp-' } });
    const end = performance.now();

    ops.push(end - start);
    totalTime += end - start;
  }

  const avgTime = totalTime / iterations;
  const docsPerSec = 1 / (avgTime / 1000);

  return {
    name: 'Delete',
    operations: 1,
    duration: avgTime,
    opsPerSec: docsPerSec,
    avgLatency: avgTime
  };
}

export function printResults(results: BenchmarkResult[]): void {
  console.log('\n┌─────────────┬────────────┬───────────┬────────────┬────────────┐');
  console.log('│ Operation  │   Docs    │ Duration  │  Ops/sec   │  Latency   │');
  console.log('├─────────────┼────────────┼───────────┼────────────┼────────────┤');

  for (const r of results) {
    console.log(
      `│ ${r.name.padEnd(10)} │ ${r.operations.toString().padStart(8)} │ ${r.duration.toFixed(2).padStart(7)}ms │ ${r.opsPerSec.toFixed(0).padStart(8)} │ ${(r.avgLatency * 1000).toFixed(3).padStart(8)}µs │`
    );
  }

  console.log('└─────────────┴────────────┴───────────┴────────────┴────────────┘');
}