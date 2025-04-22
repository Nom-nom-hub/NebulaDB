/**
 * Benchmark result
 */
export interface BenchmarkResult {
  name: string;
  hz: number;
  stats: {
    mean: number;
    deviation: number;
    moe: number;
  };
  samples: number[];
}

/**
 * Benchmark suite results
 */
export interface BenchmarkSuiteResults {
  name: string;
  results: BenchmarkResult[];
}

/**
 * All benchmark results
 */
export interface AllBenchmarkResults {
  insert: BenchmarkSuiteResults[];
  query: BenchmarkSuiteResults[];
  update: BenchmarkSuiteResults[];
}

/**
 * Database adapter
 */
export interface DatabaseAdapter {
  name: string;
  setup: () => Promise<void>;
  cleanup: () => Promise<void>;
  insert: (data: any) => Promise<any>;
  find: (query: any) => Promise<any[]>;
  findOne: (query: any) => Promise<any | null>;
  update: (query: any, update: any) => Promise<number>;
  delete: (query: any) => Promise<number>;
}

/**
 * Test document
 */
export interface TestDocument {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  age: number;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  tags: string[];
  createdAt: string;
}
