import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdaptiveWorkerPool, NodeWorkerPool, BrowserWorkerPool } from '../src/worker-pool';

describe('Worker Pool Tests', () => {
  let pool: AdaptiveWorkerPool;

  beforeEach(() => {
    pool = new AdaptiveWorkerPool(4);
  });

  afterEach(async () => {
    await pool.terminate();
  });

  it('should create adaptive worker pool', () => {
    expect(pool).toBeDefined();
  });

  it('should process batch of items', async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await pool.processBatch(items, async (item) => item * 2);

    expect(results).toHaveLength(5);
    expect(results[0]).toBe(2);
    expect(results[4]).toBe(10);
  });

  it('should handle async operations in batch', async () => {
    const items = [1, 2, 3];
    const results = await pool.processBatch(items, async (item) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return item * 3;
    });

    expect(results).toEqual([3, 6, 9]);
  });

  it('should get pool stats', () => {
    const stats = pool.getStats();

    expect(stats).toBeDefined();
    expect(stats.poolSize).toBeGreaterThan(0);
    expect(stats.activeWorkers).toBeGreaterThanOrEqual(0);
    expect(stats.queuedTasks).toBeGreaterThanOrEqual(0);
  });

  it('should handle large batches', async () => {
    const items = Array.from({ length: 100 }, (_, i) => i);
    const results = await pool.processBatch(items, async (item) => item + 1);

    expect(results).toHaveLength(100);
    expect(results[0]).toBe(1);
    expect(results[99]).toBe(100);
  });

  it('should process objects in parallel', async () => {
    const items = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' }
    ];

    const results = await pool.processBatch(items, async (item) => ({
      ...item,
      processed: true
    }));

    expect(results).toHaveLength(3);
    expect(results[0].processed).toBe(true);
    expect(results[0].name).toBe('Alice');
  });

  it('should handle string transformations', async () => {
    const items = ['hello', 'world', 'test'];
    const results = await pool.processBatch(items, async (item) => item.toUpperCase());

    expect(results).toEqual(['HELLO', 'WORLD', 'TEST']);
  });

  it('should maintain order of results', async () => {
    const items = [5, 3, 8, 1, 9];
    const results = await pool.processBatch(items, async (item) => item * 10);

    expect(results[0]).toBe(50);
    expect(results[1]).toBe(30);
    expect(results[2]).toBe(80);
    expect(results[3]).toBe(10);
    expect(results[4]).toBe(90);
  });

  it('should handle empty batch', async () => {
    const items: number[] = [];
    const results = await pool.processBatch(items, async (item) => item);

    expect(results).toEqual([]);
  });

  it('should handle single item batch', async () => {
    const items = [42];
    const results = await pool.processBatch(items, async (item) => item * 2);

    expect(results).toEqual([84]);
  });

  it('should respects pool size limit', () => {
    const smallPool = new AdaptiveWorkerPool(2);
    const stats = smallPool.getStats();

    expect(stats.poolSize).toBe(2);
  });

  it('should cap pool size at 32', () => {
    const largePool = new AdaptiveWorkerPool(100);
    const stats = largePool.getStats();

    expect(stats.poolSize).toBeLessThanOrEqual(32);
  });

  it('should terminate worker pool', async () => {
    await pool.terminate();

    const stats = pool.getStats();
    expect(stats.activeWorkers).toBe(0);
  });

  it('should process nested objects', async () => {
    const items = [
      { id: 1, data: { value: 10 } },
      { id: 2, data: { value: 20 } }
    ];

    const results = await pool.processBatch(items, async (item) => ({
      ...item,
      data: {
        ...item.data,
        doubled: item.data.value * 2
      }
    }));

    expect(results[0].data.doubled).toBe(20);
    expect(results[1].data.doubled).toBe(40);
  });

  it('should handle computation-heavy operations', async () => {
    const items = [1000, 2000, 3000];

    const results = await pool.processBatch(items, async (num) => {
      // Simulate computation
      let sum = 0;
      for (let i = 0; i < num; i++) {
        sum += i;
      }
      return sum;
    });

    expect(results.length).toBe(3);
    expect(results[0]).toBeGreaterThan(0);
  });

  it('should handle concurrent operations', async () => {
    const batch1 = pool.processBatch([1, 2], async (i) => i * 2);
    const batch2 = pool.processBatch([3, 4], async (i) => i * 3);

    const [results1, results2] = await Promise.all([batch1, batch2]);

    expect(results1).toEqual([2, 4]);
    expect(results2).toEqual([9, 12]);
  });
});

describe('NodeWorkerPool Tests', () => {
  let pool: NodeWorkerPool;

  beforeEach(() => {
    pool = new NodeWorkerPool(2);
  });

  afterEach(async () => {
    await pool.terminate();
  });

  it('should create Node worker pool', () => {
    expect(pool).toBeDefined();
  });

  it('should process items with Node pool', async () => {
    const items = [1, 2, 3];
    const results = await pool.processBatch(items, async (item) => item + 10);

    expect(results).toEqual([11, 12, 13]);
  });

  it('should get stats from Node pool', () => {
    const stats = pool.getStats();

    expect(stats).toBeDefined();
    expect(stats.poolSize).toBeGreaterThan(0);
  });
});

describe('BrowserWorkerPool Tests', () => {
  let pool: BrowserWorkerPool;

  beforeEach(() => {
    pool = new BrowserWorkerPool(2);
  });

  afterEach(async () => {
    await pool.terminate();
  });

  it('should create Browser worker pool', () => {
    expect(pool).toBeDefined();
  });

  it('should process items with Browser pool', async () => {
    const items = [10, 20, 30];
    const results = await pool.processBatch(items, async (item) => item - 5);

    expect(results).toEqual([5, 15, 25]);
  });

  it('should get stats from Browser pool', () => {
    const stats = pool.getStats();

    expect(stats).toBeDefined();
    expect(stats.poolSize).toBeGreaterThan(0);
  });
});
