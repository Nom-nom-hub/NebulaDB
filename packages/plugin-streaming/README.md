# @nebula-db/plugin-streaming

Streaming analytics plugin for NebulaDB. Collect real-time metrics, maintain counters, and aggregate time-series data for every database operation.

Part of the [NebulaDB](https://github.com/Nom-nom-hub/NebulaDB) project.

## Features

- 📊 **Auto-Instrumentation** — Automatically tracks insert, update, delete, and find operations per collection
- 🧮 **Custom Metrics** — Record arbitrary named metrics with optional tag dimensions
- 🔢 **Counters** — Lightweight increment-only counters for event counting
- 📈 **Time-Series Aggregation** — Maintain sliding-window time-series data per metric
- 📉 **Statistical Summaries** — Compute average, min, and max over the current window
- 🪟 **Sliding Window** — Configurable window size automatically prunes stale data

## Installation

```bash
npm install @nebula-db/plugin-streaming
```

## Quick Start

```typescript
import { createDb } from '@nebula-db/core';
import { MemoryAdapter } from '@nebula-db/adapter-memory';
import { createStreamingPlugin, getStreamingApi } from '@nebula-db/plugin-streaming';

const streaming = createStreamingPlugin({ windowSize: 60000 }); // 1-minute window

const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [streaming],
});

const orders = db.collection('orders');
await orders.insert({ id: '1', item: 'Laptop', price: 1299 });
await orders.insert({ id: '2', item: 'Mouse', price: 49 });

// Access the streaming API
const api = getStreamingApi(db);

// Record a custom metric
api.recordMetric('response_time', 142, { endpoint: '/api/orders' });
api.recordMetric('response_time', 98, { endpoint: '/api/orders' });

// Get statistics
console.log(api.getAverage('response_time', { endpoint: '/api/orders' })); // 120
console.log(api.getMin('response_time', { endpoint: '/api/orders' })); // 98
console.log(api.getMax('response_time', { endpoint: '/api/orders' })); // 142

// Get a full summary
console.log(api.getSummary());
```

## Configuration

| Option       | Type     | Default | Description                                                             |
| ------------ | -------- | ------- | ----------------------------------------------------------------------- |
| `windowSize` | `number` | `1000`  | Sliding window size in milliseconds; metrics older than this are pruned |

## API Reference

Access the streaming API via `getStreamingApi(db)`:

```typescript
const api = getStreamingApi(db);
```

| Method                             | Description                                                            |
| ---------------------------------- | ---------------------------------------------------------------------- |
| `recordMetric(name, value, tags?)` | Record a named metric value with optional tag dimensions               |
| `incrementCounter(name, amount?)`  | Increment a named counter (default: `+1`)                              |
| `getCounter(name)`                 | Return the current value of a counter                                  |
| `getMetrics(name, tags?)`          | Return all metric entries within the current window                    |
| `getAverage(name, tags?)`          | Compute the average of a metric within the window                      |
| `getMin(name, tags?)`              | Return the minimum metric value within the window                      |
| `getMax(name, tags?)`              | Return the maximum metric value within the window                      |
| `getTimeSeries(name)`              | Return `TimeSeriesPoint[]` for a named aggregation                     |
| `getSummary()`                     | Return a snapshot of all counters, metric count, and aggregation count |
| `reset()`                          | Clear all metrics, counters, and aggregations                          |

## Auto-Tracked Metrics

The plugin automatically records the following metrics for every database operation:

| Metric   | Tags             | Description                  |
| -------- | ---------------- | ---------------------------- |
| `insert` | `{ collection }` | Number of documents inserted |
| `update` | `{ collection }` | Update operations            |
| `delete` | `{ collection }` | Delete operations            |
| `query`  | `{ collection }` | Find operations              |

## Example: Operation Dashboard

```typescript
const api = getStreamingApi(db);
const summary = api.getSummary();

console.log('Counters:', summary.counters);
// { insert_count: 12, update_count: 3, delete_count: 1, query_count: 40 }
```

## Documentation

For full documentation, visit the [NebulaDB GitHub repository](https://github.com/Nom-nom-hub/NebulaDB).

## License

Apache-2.0
