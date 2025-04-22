import { TaskQueue } from './concurrency';

/**
 * Adaptive concurrency control options
 */
export interface AdaptiveConcurrencyOptions {
  initialConcurrency: number;
  minConcurrency: number;
  maxConcurrency: number;
  samplingWindow: number; // Number of operations to sample
  targetLatency: number; // Target latency in ms
  adjustmentFactor: number; // How aggressively to adjust (0-1)
}

/**
 * Adaptive concurrency control for automatically tuning concurrency levels
 */
export class AdaptiveConcurrencyControl {
  private options: AdaptiveConcurrencyOptions;
  private taskQueue: TaskQueue;
  private latencySamples: number[] = [];
  private operationCount = 0;
  private lastAdjustment = 0;
  private currentConcurrency: number;
  
  constructor(options: Partial<AdaptiveConcurrencyOptions> = {}) {
    this.options = {
      initialConcurrency: options.initialConcurrency || 4,
      minConcurrency: options.minConcurrency || 1,
      maxConcurrency: options.maxConcurrency || 16,
      samplingWindow: options.samplingWindow || 100,
      targetLatency: options.targetLatency || 50, // 50ms target
      adjustmentFactor: options.adjustmentFactor || 0.2
    };
    
    this.currentConcurrency = this.options.initialConcurrency;
    this.taskQueue = new TaskQueue(this.currentConcurrency);
  }
  
  /**
   * Execute a task with adaptive concurrency control
   */
  async execute<T>(task: () => Promise<T>): Promise<T> {
    const start = Date.now();
    
    try {
      return await this.taskQueue.add(task);
    } finally {
      const latency = Date.now() - start;
      this.recordLatency(latency);
    }
  }
  
  /**
   * Record operation latency and adjust concurrency if needed
   */
  private recordLatency(latency: number): void {
    this.latencySamples.push(latency);
    this.operationCount++;
    
    // Keep only the most recent samples
    if (this.latencySamples.length > this.options.samplingWindow) {
      this.latencySamples.shift();
    }
    
    // Adjust concurrency periodically
    if (this.operationCount - this.lastAdjustment >= this.options.samplingWindow) {
      this.adjustConcurrency();
      this.lastAdjustment = this.operationCount;
    }
  }
  
  /**
   * Adjust concurrency based on observed latency
   */
  private adjustConcurrency(): void {
    if (this.latencySamples.length < this.options.samplingWindow / 2) {
      return; // Not enough samples yet
    }
    
    // Calculate average latency
    const avgLatency = this.latencySamples.reduce((sum, val) => sum + val, 0) / this.latencySamples.length;
    
    // Calculate latency ratio (current vs target)
    const latencyRatio = avgLatency / this.options.targetLatency;
    
    // Adjust concurrency based on latency ratio
    if (latencyRatio > 1.2) {
      // Latency is too high, decrease concurrency
      const newConcurrency = Math.max(
        this.options.minConcurrency,
        Math.floor(this.currentConcurrency * (1 - this.options.adjustmentFactor))
      );
      
      if (newConcurrency !== this.currentConcurrency) {
        this.currentConcurrency = newConcurrency;
        this.updateTaskQueue();
      }
    } else if (latencyRatio < 0.8) {
      // Latency is low, increase concurrency
      const newConcurrency = Math.min(
        this.options.maxConcurrency,
        Math.ceil(this.currentConcurrency * (1 + this.options.adjustmentFactor))
      );
      
      if (newConcurrency !== this.currentConcurrency) {
        this.currentConcurrency = newConcurrency;
        this.updateTaskQueue();
      }
    }
  }
  
  /**
   * Update the task queue with the new concurrency level
   */
  private updateTaskQueue(): void {
    // Create a new task queue with the updated concurrency
    const newTaskQueue = new TaskQueue(this.currentConcurrency);
    this.taskQueue = newTaskQueue;
  }
  
  /**
   * Get current concurrency level
   */
  getCurrentConcurrency(): number {
    return this.currentConcurrency;
  }
  
  /**
   * Get performance statistics
   */
  getStats(): { concurrency: number, avgLatency: number, samples: number } {
    const avgLatency = this.latencySamples.length > 0
      ? this.latencySamples.reduce((sum, val) => sum + val, 0) / this.latencySamples.length
      : 0;
    
    return {
      concurrency: this.currentConcurrency,
      avgLatency,
      samples: this.latencySamples.length
    };
  }
  
  /**
   * Reset statistics
   */
  resetStats(): void {
    this.latencySamples = [];
    this.operationCount = 0;
    this.lastAdjustment = 0;
  }
  
  /**
   * Update concurrency options
   */
  setOptions(options: Partial<AdaptiveConcurrencyOptions>): void {
    this.options = {
      ...this.options,
      ...options
    };
    
    // Ensure current concurrency is within new bounds
    if (this.currentConcurrency < this.options.minConcurrency) {
      this.currentConcurrency = this.options.minConcurrency;
      this.updateTaskQueue();
    } else if (this.currentConcurrency > this.options.maxConcurrency) {
      this.currentConcurrency = this.options.maxConcurrency;
      this.updateTaskQueue();
    }
  }
}
