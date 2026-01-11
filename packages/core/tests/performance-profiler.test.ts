import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PerformanceProfiler, getProfiler } from '../src/performance-profiler';

describe('Performance Profiler Tests', () => {
  let profiler: PerformanceProfiler;

  beforeEach(() => {
    profiler = new PerformanceProfiler();
  });

  afterEach(() => {
    profiler.reset();
  });

  it('should start and end operations', () => {
    const opId = profiler.startOperation('op-1', 'insert');
    expect(opId).toBe('op-1');

    const metric = profiler.endOperation('op-1', true);
    expect(metric).toBeDefined();
    expect(metric!.operationId).toBe('op-1');
    expect(metric!.operationType).toBe('insert');
    expect(metric!.duration).toBeGreaterThan(0);
  });

  it('should track success status', () => {
    profiler.startOperation('op-1', 'insert');
    const metric = profiler.endOperation('op-1', true);

    expect(metric!.success).toBe(true);
  });

  it('should track error status', () => {
    profiler.startOperation('op-1', 'insert');
    const metric = profiler.endOperation('op-1', false, 'Test error');

    expect(metric!.success).toBe(false);
    expect(metric!.error).toBe('Test error');
  });

  it('should track metadata', () => {
    profiler.startOperation('op-1', 'insert');
    const metric = profiler.endOperation('op-1', true, undefined, {
      collection: 'users',
      count: 10
    });

    expect(metric!.metadata).toBeDefined();
    expect(metric!.metadata!.collection).toBe('users');
    expect(metric!.metadata!.count).toBe(10);
  });

  it('should measure synchronous function', () => {
    const result = profiler.measure('test-op', () => {
      let sum = 0;
      for (let i = 0; i < 100; i++) {
        sum += i;
      }
      return sum;
    });

    expect(result).toBe(4950);
    expect(profiler.getOperationCount()).toBeGreaterThan(0);
  });

  it('should handle measure errors', () => {
    expect(() => {
      profiler.measure('test-op', () => {
        throw new Error('Test error');
      });
    }).toThrow('Test error');
  });

  it('should measure async function', async () => {
    const result = await profiler.measureAsync('async-op', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 42;
    });

    expect(result).toBe(42);
    expect(profiler.getOperationCount()).toBeGreaterThan(0);
  });

  it('should get operation summary by type', () => {
    profiler.startOperation('op-1', 'insert');
    profiler.endOperation('op-1', true);

    profiler.startOperation('op-2', 'insert');
    profiler.endOperation('op-2', true);

    profiler.startOperation('op-3', 'query');
    profiler.endOperation('op-3', true);

    const summary = profiler.getSummary();

    expect(summary.has('insert')).toBe(true);
    expect(summary.has('query')).toBe(true);
    expect(summary.get('insert')!.count).toBe(2);
    expect(summary.get('query')!.count).toBe(1);
  });

  it('should calculate average time', () => {
    const start = Date.now();

    profiler.startOperation('op-1', 'insert');
    profiler.endOperation('op-1', true);

    profiler.startOperation('op-2', 'insert');
    profiler.endOperation('op-2', true);

    const summary = profiler.getSummary();
    const insertStats = summary.get('insert');

    expect(insertStats!.averageTime).toBeGreaterThan(0);
    expect(insertStats!.averageTime).toBeLessThanOrEqual(insertStats!.maxTime);
  });

  it('should track min and max times', () => {
    profiler.startOperation('op-1', 'query');
    profiler.endOperation('op-1', true);

    // Simulate longer operation
    const longOp = profiler.startOperation('op-2', 'query');
    setTimeout(() => {}, 20);
    profiler.endOperation(longOp, true);

    const summary = profiler.getSummary();
    const queryStats = summary.get('query')!;

    expect(queryStats.minTime).toBeLessThanOrEqual(queryStats.maxTime);
  });

  it('should track success rate', () => {
    profiler.startOperation('op-1', 'insert');
    profiler.endOperation('op-1', true);

    profiler.startOperation('op-2', 'insert');
    profiler.endOperation('op-2', false, 'Error');

    profiler.startOperation('op-3', 'insert');
    profiler.endOperation('op-3', true);

    const summary = profiler.getSummary();
    const insertStats = summary.get('insert');

    expect(insertStats!.successRate).toBe(66.66666666666666);
  });

  it('should get slowest operations', () => {
    profiler.startOperation('op-1', 'query');
    profiler.endOperation('op-1', true);

    profiler.startOperation('op-2', 'query');
    profiler.endOperation('op-2', true);

    const slowest = profiler.getSlowestOperations(5);

    expect(slowest.length).toBeGreaterThan(0);
    expect(slowest[0].duration).toBeGreaterThanOrEqual(slowest[1]?.duration || 0);
  });

  it('should generate complete report', () => {
    profiler.startOperation('op-1', 'insert');
    profiler.endOperation('op-1', true);

    profiler.startOperation('op-2', 'query');
    profiler.endOperation('op-2', true);

    const report = profiler.generateReport();

    expect(report.timestamp).toBeGreaterThan(0);
    expect(report.duration).toBeGreaterThan(0);
    expect(report.operations.length).toBeGreaterThan(0);
    expect(report.summary.size).toBeGreaterThan(0);
    expect(report.slowestOperations.length).toBeGreaterThan(0);
  });

  it('should format report as string', () => {
    profiler.startOperation('op-1', 'insert');
    profiler.endOperation('op-1', true);

    const report = profiler.generateReport();
    const formatted = profiler.formatReport(report);

    expect(formatted).toContain('Performance Profile Report');
    expect(formatted).toContain('Operation Summary');
    expect(formatted).toContain('insert');
  });

  it('should reset profiler', () => {
    profiler.startOperation('op-1', 'insert');
    profiler.endOperation('op-1', true);

    expect(profiler.getOperationCount()).toBeGreaterThan(0);

    profiler.reset();

    expect(profiler.getOperationCount()).toBe(0);
  });

  it('should enable/disable profiling', () => {
    profiler.setEnabled(false);
    expect(profiler.isEnabled()).toBe(false);

    profiler.setEnabled(true);
    expect(profiler.isEnabled()).toBe(true);
  });

  it('should handle disabled profiler', () => {
    profiler.setEnabled(false);

    profiler.startOperation('op-1', 'insert');
    const metric = profiler.endOperation('op-1', true);

    expect(metric).toBeNull();
    expect(profiler.getOperationCount()).toBe(0);
  });

  it('should track memory usage if available', () => {
    profiler.startOperation('op-1', 'insert');
    const metric = profiler.endOperation('op-1', true);

    // Memory tracking depends on environment
    if (metric!.memoryBefore !== undefined) {
      expect(metric!.memoryBefore).toBeGreaterThanOrEqual(0);
      expect(metric!.memoryAfter).toBeGreaterThanOrEqual(0);
    }
  });

  it('should handle multiple operation types', () => {
    const operations = ['insert', 'query', 'update', 'delete'];

    for (const op of operations) {
      profiler.startOperation(`op-${op}`, op);
      profiler.endOperation(`op-${op}`, true);
    }

    const summary = profiler.getSummary();

    for (const op of operations) {
      expect(summary.has(op)).toBe(true);
    }
  });

  it('should handle concurrent operations', async () => {
    const promises = [];

    for (let i = 0; i < 5; i++) {
      promises.push(
        profiler.measureAsync(`async-${i}`, async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
          return i;
        })
      );
    }

    const results = await Promise.all(promises);

    expect(results).toHaveLength(5);
    expect(profiler.getOperationCount()).toBeGreaterThan(0);
  });

  it('should get global profiler instance', () => {
    const profiler1 = getProfiler();
    const profiler2 = getProfiler();

    expect(profiler1).toBe(profiler2);
  });

  it('should handle missing active operation gracefully', () => {
    const metric = profiler.endOperation('nonexistent-op', true);
    expect(metric).toBeNull();
  });

  it('should track total time correctly', () => {
    profiler.startOperation('op-1', 'insert');
    profiler.endOperation('op-1', true);

    const report = profiler.generateReport();

    expect(report.duration).toBeGreaterThan(0);
  });
});
