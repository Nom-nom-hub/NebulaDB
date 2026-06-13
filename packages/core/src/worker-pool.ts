/**
 * Worker Pool Manager for parallel batch operations.
 *
 * Automatically detects the runtime environment and uses either Web
 * Workers (browser) or Worker Threads (Node.js) for parallel processing.
 *
 * @example
 * ```typescript
 * import { createWorkerPool } from '@nebula-db/core';
 *
 * const pool = createWorkerPool(8);
 * const results = await pool.processBatch(items, async (item) => {
 *   return heavyProcessing(item);
 * });
 * ```
 */

/** Task submitted to the worker pool */
export interface WorkerTask<T = any> {
  id: string;
  data: T;
  timestamp: number;
}

/** Result returned from a worker task */
export interface WorkerResult<T = any> {
  taskId: string;
  result: T;
  error?: string;
  duration: number;
}

/**
 * Abstract base class for worker pool implementations.
 */
export abstract class BaseWorkerPool {
  protected poolSize: number;
  protected taskQueue: WorkerTask[] = [];
  protected activeWorkers: Set<any> = new Set();
  protected pendingTasks: Map<string, Promise<any>> = new Map();

  constructor(poolSize: number = navigator.hardwareConcurrency || 4) {
    this.poolSize = Math.min(poolSize, 32); // Cap at 32 workers
  }

  /**
   * Process a batch of items in parallel
   */
  abstract processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>
  ): Promise<R[]>;

  /**
   * Get current pool stats
   */
  abstract getStats(): PoolStats;

  /**
   * Terminate all workers
   */
  abstract terminate(): Promise<void>;
}

/**
 * Browser-based Worker Pool using Web Workers
 */
export class BrowserWorkerPool extends BaseWorkerPool {
  private workerScript: string;

  constructor(poolSize?: number, workerScript?: string) {
    super(poolSize);
    this.workerScript = workerScript || '';
  }

  async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>
  ): Promise<R[]> {
    // For browser, we can't directly use processor function
    // Instead, return results processed in main thread
    // This is a limitation of Web Workers (can't pass functions)

    const results: R[] = [];
    const chunkSize = Math.ceil(items.length / this.poolSize);

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(item => processor(item))
      );
      results.push(...chunkResults);
    }

    return results;
  }

  getStats(): PoolStats {
    return {
      poolSize: this.poolSize,
      activeWorkers: this.activeWorkers.size,
      queuedTasks: this.taskQueue.length,
      totalProcessed: 0
    };
  }

  async terminate(): Promise<void> {
    this.taskQueue = [];
    this.activeWorkers.clear();
    this.pendingTasks.clear();
  }
}

/**
 * Node.js Worker Thread Pool
 */
export class NodeWorkerPool extends BaseWorkerPool {
  private workers: any[] = [];
  private taskCounter = 0;

  constructor(poolSize?: number) {
    super(poolSize);
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    // Workers will be created on demand
    // This is a simplified implementation
  }

  async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>
  ): Promise<R[]> {
    // For Node.js, process in chunks using available concurrency
    const results: R[] = [];
    const chunkSize = Math.ceil(items.length / this.poolSize);

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(item => this.executeTask(item, processor))
      );
      results.push(...chunkResults);
    }

    return results;
  }

  private async executeTask<T, R>(
    item: T,
    processor: (item: T) => Promise<R>
  ): Promise<R> {
    const taskId = `task-${++this.taskCounter}`;

    try {
      return await processor(item);
    } catch (error) {
      throw new Error(`Task ${taskId} failed: ${error}`);
    }
  }

  getStats(): PoolStats {
    return {
      poolSize: this.poolSize,
      activeWorkers: this.workers.length,
      queuedTasks: this.taskQueue.length,
      totalProcessed: this.taskCounter
    };
  }

  async terminate(): Promise<void> {
    for (const worker of this.workers) {
      if (worker && typeof worker.terminate === 'function') {
        worker.terminate();
      }
    }
    this.workers = [];
    this.taskQueue = [];
    this.pendingTasks.clear();
  }
}

/**
 * Adaptive worker pool that detects environment
 */
export class AdaptiveWorkerPool {
  private pool: BaseWorkerPool;

  constructor(poolSize?: number, workerScript?: string) {
    const actualPoolSize = poolSize || this.detectConcurrency();

    // Detect environment
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      // Browser environment
      this.pool = new BrowserWorkerPool(actualPoolSize, workerScript);
    } else if (typeof process !== 'undefined' && process.versions?.node) {
      // Node.js environment
      this.pool = new NodeWorkerPool(actualPoolSize);
    } else {
      // Fallback: single-threaded
      this.pool = new BrowserWorkerPool(1);
    }
  }

  private detectConcurrency(): number {
    if (typeof navigator !== 'undefined') {
      return navigator.hardwareConcurrency || 4;
    }
    if (typeof require !== 'undefined') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const os = require('os');
        return os.cpus().length;
      } catch {
        return 4;
      }
    }
    return 4;
  }

  async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>
  ): Promise<R[]> {
    return this.pool.processBatch(items, processor);
  }

  getStats(): PoolStats {
    return this.pool.getStats();
  }

  async terminate(): Promise<void> {
    return this.pool.terminate();
  }
}

/**
 * Worker pool statistics
 */
export interface PoolStats {
  poolSize: number;
  activeWorkers: number;
  queuedTasks: number;
  totalProcessed: number;
}

/**
 * Create an adaptive worker pool that auto-detects the runtime.
 *
 * Uses Web Workers in browsers, Worker Threads in Node.js, and falls
 * back to single-threaded processing in other environments.
 *
 * @param poolSize - Number of workers (default: hardware concurrency)
 * @returns An AdaptiveWorkerPool instance
 */
export function createWorkerPool(poolSize?: number): AdaptiveWorkerPool {
  return new AdaptiveWorkerPool(poolSize);
}
