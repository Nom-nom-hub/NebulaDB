import { performance } from 'perf_hooks';

/**
 * A simple profiler to analyze query execution
 */
export class QueryProfiler {
  private steps: Map<string, number[]> = new Map();
  private currentStep: string | null = null;
  private stepStart: number = 0;

  /**
   * Start profiling a step
   */
  startStep(name: string): void {
    this.endStep(); // End any current step
    this.currentStep = name;
    this.stepStart = performance.now();
  }

  /**
   * End the current profiling step
   */
  endStep(): void {
    if (this.currentStep) {
      const duration = performance.now() - this.stepStart;
      const times = this.steps.get(this.currentStep) || [];
      times.push(duration);
      this.steps.set(this.currentStep, times);
      this.currentStep = null;
    }
  }

  /**
   * Get profiling results
   */
  getResults(): Record<string, { avg: number, min: number, max: number, total: number, count: number }> {
    const results: Record<string, any> = {};
    
    this.steps.forEach((times, step) => {
      const total = times.reduce((sum, time) => sum + time, 0);
      results[step] = {
        avg: total / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        total,
        count: times.length
      };
    });
    
    return results;
  }

  /**
   * Print profiling results
   */
  printResults(): void {
    console.log('\n=== Query Profiling Results ===');
    const results = this.getResults();
    
    // Sort steps by total time (descending)
    const sortedSteps = Object.entries(results)
      .sort(([, a], [, b]) => b.total - a.total);
    
    // Print table header
    console.log('Step | Count | Avg (ms) | Min (ms) | Max (ms) | Total (ms) | % of Total');
    console.log('-'.repeat(80));
    
    // Calculate grand total
    const grandTotal = sortedSteps.reduce((sum, [, data]) => sum + data.total, 0);
    
    // Print each step
    for (const [step, data] of sortedSteps) {
      const percentage = ((data.total / grandTotal) * 100).toFixed(1);
      console.log(
        `${step} | ${data.count} | ${data.avg.toFixed(2)} | ${data.min.toFixed(2)} | ${data.max.toFixed(2)} | ${data.total.toFixed(2)} | ${percentage}%`
      );
    }
  }
}