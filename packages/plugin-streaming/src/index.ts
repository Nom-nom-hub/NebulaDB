import type { Plugin, Document, PluginHookContext } from '@nebula-db/core';

export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

export interface StreamingOptions {
  windowSize?: number;
}

interface StreamingState {
  metrics: Map<string, Metric[]>;
  counters: Map<string, number>;
  aggregations: Map<string, TimeSeriesPoint[]>;
  options: Required<StreamingOptions>;
}

/**
 * Streaming Analytics Plugin for NebulaDB
 * Real-time metrics collection and aggregation
 * 
 * @example
 * ```typescript
 * import { createStreamingPlugin } from '@nebula-db/plugin-streaming';
 * 
 * const streaming = createStreamingPlugin({ 
 *   windowSize: 1000,
 *   flushInterval: 5000 
 * });
 * 
 * const db = createDb({ plugins: [streaming] });
 * 
 * // Record a metric
 * streaming.recordMetric('response_time', 150, { endpoint: '/api/users' });
 * 
 * // Get aggregated data
 * const avg = streaming.getAverage('response_time');
 * ```
 */
export function createStreamingPlugin(options: StreamingOptions = {}): Plugin {
  const state: StreamingState = {
    metrics: new Map(),
    counters: new Map(),
    aggregations: new Map(),
    options: {
      windowSize: options.windowSize || 1000
    }
  };

  const getMetricsKey = (name: string, tags?: Record<string, string>) => {
    if (!tags) return name;
    const tagStr = Object.entries(tags).sort().map(([k, v]) => `${k}=${v}`).join(',');
    return `${name}:${tagStr}`;
  };

  const recordMetric = (name: string, value: number, tags?: Record<string, string>) => {
    const key = getMetricsKey(name, tags);
    const metric: Metric = {
      name,
      value,
      timestamp: Date.now(),
      tags
    };

    if (!state.metrics.has(key)) {
      state.metrics.set(key, []);
    }

    const metrics = state.metrics.get(key)!;
    metrics.push(metric);

    // Keep only recent metrics within window
    const cutoff = Date.now() - state.options.windowSize;
    state.metrics.set(key, metrics.filter(m => m.timestamp > cutoff));

    // Update counter
    const counterKey = `${name}_count`;
    state.counters.set(counterKey, (state.counters.get(counterKey) || 0) + 1);
  };

  const recordAggregation = (name: string, value: number) => {
    const point: TimeSeriesPoint = {
      timestamp: Date.now(),
      value
    };

    if (!state.aggregations.has(name)) {
      state.aggregations.set(name, []);
    }

    const points = state.aggregations.get(name)!;
    points.push(point);

    // Keep only recent points
    const cutoff = Date.now() - state.options.windowSize;
    state.aggregations.set(name, points.filter(p => p.timestamp > cutoff));
  };

  return {
    name: 'streaming',
    
    onInsert: async ({ collection, documents }: PluginHookContext) => {
      recordMetric('insert', (documents || []).length, { collection: collection.name });
      for (const doc of (documents || [])) {
        recordAggregation(`${collection.name}_inserts`, 1);
      }
    },

    onUpdate: async ({ collection }: PluginHookContext) => {
      recordMetric('update', 1, { collection: collection.name });
      recordAggregation(`${collection.name}_updates`, 1);
    },

    onDelete: async ({ collection }: PluginHookContext) => {
      recordMetric('delete', 1, { collection: collection.name });
      recordAggregation(`${collection.name}_deletes`, 1);
    },

    onFind: async ({ collection, query }: PluginHookContext) => {
      recordMetric('query', 1, { collection: collection.name });
    },

    getApi: () => ({
      recordMetric,
      
      incrementCounter: (name: string, amount: number = 1) => {
        state.counters.set(name, (state.counters.get(name) || 0) + amount);
      },

      getCounter: (name: string) => state.counters.get(name) || 0,

      getMetrics: (name: string, tags?: Record<string, string>) => {
        const key = getMetricsKey(name, tags);
        return state.metrics.get(key) || [];
      },

      getAverage: (name: string, tags?: Record<string, string>) => {
        const metrics = state.metrics.get(getMetricsKey(name, tags)) || [];
        if (metrics.length === 0) return 0;
        const sum = metrics.reduce((acc, m) => acc + m.value, 0);
        return sum / metrics.length;
      },

      getMin: (name: string, tags?: Record<string, string>) => {
        const metrics = state.metrics.get(getMetricsKey(name, tags)) || [];
        if (metrics.length === 0) return 0;
        return Math.min(...metrics.map(m => m.value));
      },

      getMax: (name: string, tags?: Record<string, string>) => {
        const metrics = state.metrics.get(getMetricsKey(name, tags)) || [];
        if (metrics.length === 0) return 0;
        return Math.max(...metrics.map(m => m.value));
      },

      getTimeSeries: (name: string) => state.aggregations.get(name) || [],

      getSummary: () => ({
        counters: Object.fromEntries(state.counters),
        metricCount: Array.from(state.metrics.values()).reduce((sum, arr) => sum + arr.length, 0),
        aggregationCount: Array.from(state.aggregations.values()).reduce((sum, arr) => sum + arr.length, 0)
      }),

      reset: () => {
        state.metrics.clear();
        state.counters.clear();
        state.aggregations.clear();
      }
    })
  };
}

/**
 * Get the streaming API from a database instance
 */
export function getStreamingApi(db: any): ReturnType<Exclude<ReturnType<typeof createStreamingPlugin>['getApi'], undefined>> | null {
  const plugin = db.plugins?.find((p: any) => p.name === 'streaming');
  return plugin?.getApi?.() || null;
}