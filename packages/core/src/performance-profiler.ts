/**
 * Performance Profiler for NebulaDB operations.
 *
 * Tracks timing, memory usage, and success rates of database operations.
 * Use `getProfiler()` to access a global singleton instance.
 *
 * @example
 * ```typescript
 * import { getProfiler } from '@nebula-db/core';
 *
 * const profiler = getProfiler();
 * profiler.startOperation('op1', 'query');
 * // ... do work ...
 * profiler.endOperation('op1', true);
 *
 * const report = profiler.generateReport();
 * console.log(profiler.formatReport(report));
 * ```
 */

/** Single operation measurement */
export interface OperationMetrics {
  operationId: string;
  operationType: string;
  startTime: number;
  endTime: number;
  duration: number;
  memoryBefore?: number;
  memoryAfter?: number;
  memoryDelta?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

/** Aggregated summary for a type of operation */
export interface ProfileSummary {
  operationType: string;
  count: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  successRate: number;
  totalMemoryDelta: number;
}

/** Complete profile report */
export interface ProfileReport {
  timestamp: number;
  duration: number;
  operations: OperationMetrics[];
  summary: Map<string, ProfileSummary>;
  slowestOperations: OperationMetrics[];
}

/**
 * Performance profiler for tracking and analyzing operation metrics.
 */
export class PerformanceProfiler {
  private operations: OperationMetrics[] = [];
  private activeOperations: Map<string, OperationMetrics> = new Map();
  private maxOperations: number = 10000;
  private enabled: boolean = true;

  /**
   * Start profiling an operation.
   *
   * @param operationId - Unique identifier for this operation
   * @param operationType - Type/category of the operation (e.g., 'query', 'insert')
   * @returns The operation ID (same as input)
   */
  startOperation(operationId: string, operationType: string): string {
    if (!this.enabled) return operationId;

    const metric: OperationMetrics = {
      operationId,
      operationType,
      startTime: performance.now(),
      endTime: 0,
      duration: 0,
      success: false,
      memoryBefore: this.getMemoryUsage()
    };

    this.activeOperations.set(operationId, metric);

    return operationId;
  }

  /**
   * End profiling an operation and record its metrics.
   *
   * @param operationId - ID of the operation to end (from startOperation)
   * @param success - Whether the operation succeeded
   * @param error - Optional error message if the operation failed
   * @param metadata - Optional additional data to attach
   * @returns The completed OperationMetrics, or null if profiling is disabled
   */
  endOperation(
    operationId: string,
    success: boolean = true,
    error?: string,
    metadata?: Record<string, any>
  ): OperationMetrics | null {
    if (!this.enabled) return null;

    const metric = this.activeOperations.get(operationId);
    if (!metric) {
      console.warn(`No active operation found for ${operationId}`);
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.success = success;
    metric.error = error;
    metric.metadata = metadata;
    metric.memoryAfter = this.getMemoryUsage();

    if (metric.memoryBefore !== undefined && metric.memoryAfter !== undefined) {
      metric.memoryDelta = metric.memoryAfter - metric.memoryBefore;
    }

    this.activeOperations.delete(operationId);
    this.operations.push(metric);

    // Trim old operations if cache is full
    if (this.operations.length > this.maxOperations) {
      this.operations = this.operations.slice(-this.maxOperations);
    }

    return metric;
  }

  /**
   * Measure execution of a synchronous function.
   *
   * @param operationType - Type of operation being measured
   * @param fn - Function to measure
   * @param metadata - Optional metadata to attach
   * @returns The return value of the function
   */
  measure<T>(
    operationType: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    const opId = `measure-${Date.now()}-${Math.random()}`;
    this.startOperation(opId, operationType);

    try {
      const result = fn();
      this.endOperation(opId, true, undefined, metadata);
      return result;
    } catch (error) {
      this.endOperation(opId, false, String(error), metadata);
      throw error;
    }
  }

  /**
   * Measure execution of an async function.
   *
   * @param operationType - Type of operation being measured
   * @param fn - Async function to measure
   * @param metadata - Optional metadata to attach
   * @returns The return value of the async function
   */
  async measureAsync<T>(
    operationType: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const opId = `measure-${Date.now()}-${Math.random()}`;
    this.startOperation(opId, operationType);

    try {
      const result = await fn();
      this.endOperation(opId, true, undefined, metadata);
      return result;
    } catch (error) {
      this.endOperation(opId, false, String(error), metadata);
      throw error;
    }
  }

  /**
   * Get current memory usage in MB
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return usage.heapUsed / 1024 / 1024; // Convert to MB
    }
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  }

  /**
   * Get aggregated summary of operations grouped by type.
   *
   * @returns Map of operation type to ProfileSummary
   */
  getSummary(): Map<string, ProfileSummary> {
    const summary = new Map<string, ProfileSummary>();

    for (const op of this.operations) {
      if (!summary.has(op.operationType)) {
        summary.set(op.operationType, {
          operationType: op.operationType,
          count: 0,
          totalTime: 0,
          averageTime: 0,
          minTime: Infinity,
          maxTime: -Infinity,
          successRate: 0,
          totalMemoryDelta: 0
        });
      }

      const stats = summary.get(op.operationType)!;
      stats.count++;
      stats.totalTime += op.duration;
      stats.minTime = Math.min(stats.minTime, op.duration);
      stats.maxTime = Math.max(stats.maxTime, op.duration);
      if (op.memoryDelta) {
        stats.totalMemoryDelta += op.memoryDelta;
      }

      if (op.success) {
        stats.successRate++;
      }
    }

    // Calculate averages
    for (const stats of summary.values()) {
      stats.averageTime = stats.totalTime / stats.count;
      stats.successRate = (stats.successRate / stats.count) * 100;
    }

    return summary;
  }

  /**
   * Get operations sorted by duration
   */
  getSlowestOperations(limit: number = 10): OperationMetrics[] {
    return [...this.operations]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Generate a complete performance report.
   *
   * @returns Full ProfileReport with summaries, slowest operations, and memory stats
   */
  generateReport(): ProfileReport {
    return {
      timestamp: Date.now(),
      duration: this.getTotalDuration(),
      operations: this.operations,
      summary: this.getSummary(),
      slowestOperations: this.getSlowestOperations(10)
    };
  }

  /**
   * Get total duration of all operations
   */
  private getTotalDuration(): number {
    if (this.operations.length === 0) return 0;

    const min = Math.min(...this.operations.map(op => op.startTime));
    const max = Math.max(...this.operations.map(op => op.endTime));

    return max - min;
  }

  /**
   * Format report as human-readable string
   */
  formatReport(report: ProfileReport): string {
    let output = '\n' + '═'.repeat(70) + '\n';
    output += 'Performance Profile Report\n';
    output += '═'.repeat(70) + '\n\n';

    output += `Generated: ${new Date(report.timestamp).toISOString()}\n`;
    output += `Total Duration: ${report.duration.toFixed(2)}ms\n`;
    output += `Total Operations: ${report.operations.length}\n\n`;

    // Summary by operation type
    output += 'Operation Summary\n' + '-'.repeat(70) + '\n';
    output +=
      'Operation Type'.padEnd(25) +
      'Count'.padEnd(10) +
      'Avg Time'.padEnd(12) +
      'Min/Max'.padEnd(15) +
      'Success\n';
    output += '-'.repeat(70) + '\n';

    for (const [, summary] of report.summary) {
      output +=
        summary.operationType.padEnd(25) +
        String(summary.count).padEnd(10) +
        `${summary.averageTime.toFixed(2)}ms`.padEnd(12) +
        `${summary.minTime.toFixed(2)}/${summary.maxTime.toFixed(2)}ms`.padEnd(
          15
        ) +
        `${summary.successRate.toFixed(1)}%\n`;
    }

    // Slowest operations
    if (report.slowestOperations.length > 0) {
      output += '\nSlowest Operations\n' + '-'.repeat(70) + '\n';
      output += 'Operation ID'.padEnd(30) + 'Type'.padEnd(20) + 'Duration\n';
      output += '-'.repeat(70) + '\n';

      for (const op of report.slowestOperations) {
        output +=
          op.operationId.substring(0, 29).padEnd(30) +
          op.operationType.padEnd(20) +
          `${op.duration.toFixed(2)}ms\n`;
      }
    }

    // Memory usage
    const opsWithMemory = report.operations.filter(op => op.memoryDelta);
    if (opsWithMemory.length > 0) {
      const totalMemory = opsWithMemory.reduce((sum, op) => sum + (op.memoryDelta || 0), 0);
      output +=
        '\nMemory Impact\n' +
        '-'.repeat(70) +
        '\n' +
        `Total Memory Delta: ${totalMemory.toFixed(2)}MB\n` +
        `Avg Memory Delta: ${(totalMemory / opsWithMemory.length).toFixed(2)}MB\n`;
    }

    output += '\n' + '═'.repeat(70) + '\n';

    return output;
  }

  /**
   * Reset collected metrics
   */
  reset(): void {
    this.operations = [];
    this.activeOperations.clear();
  }

  /**
   * Enable/disable profiling
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get enabled state
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get operation count
   */
  getOperationCount(): number {
    return this.operations.length;
  }
}

/** Global profiler singleton */
let globalProfiler: PerformanceProfiler | null = null;

/**
 * Get or create the global performance profiler singleton.
 *
 * @returns The global PerformanceProfiler instance
 */
export function getProfiler(): PerformanceProfiler {
  if (!globalProfiler) {
    globalProfiler = new PerformanceProfiler();
  }
  return globalProfiler;
}
