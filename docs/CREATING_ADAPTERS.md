# Creating Custom NebulaDB Adapters

This guide walks you through creating a custom storage adapter for NebulaDB.

## Adapter Interface

Every adapter must implement the `Adapter` interface from `@nebula-db/core`:

```typescript
import { Adapter, Document } from '@nebula-db/core';

export interface Adapter {
  /**
   * Load all data from storage
   * Returns a record mapping collection names to document arrays
   */
  load(): Promise<Record<string, Document[]>>;

  /**
   * Save all data to storage
   * Called with entire database state
   */
  save(data: Record<string, Document[]>): Promise<void>;
}
```

## Minimal Adapter Example

Here's a complete example implementing an in-memory adapter:

```typescript
import { Adapter, Document } from '@nebula-db/core';

export class MyAdapter implements Adapter {
  private data: Record<string, Document[]> = {};

  async load(): Promise<Record<string, Document[]>> {
    // Return a deep copy to prevent external modifications
    return JSON.parse(JSON.stringify(this.data));
  }

  async save(data: Record<string, Document[]>): Promise<void> {
    // Store a deep copy
    this.data = JSON.parse(JSON.stringify(data));
  }
}
```

## Key Design Principles

### 1. **Immutability**
Always work with copies of data to prevent external mutations:

```typescript
async load(): Promise<Record<string, Document[]>> {
  // Good: Deep copy
  return JSON.parse(JSON.stringify(this.data));
  
  // Bad: Direct reference (allows mutations)
  // return this.data;
}
```

### 2. **Async/Await**
Methods must always be async for consistency with I/O operations:

```typescript
// Good
async save(data: Record<string, Document[]>): Promise<void> {
  await someAsyncOperation();
}

// Bad - not async
save(data: Record<string, Document[]>): void {
  // ...
}
```

### 3. **Error Handling**
Wrap operations in try-catch and provide meaningful errors:

```typescript
async load(): Promise<Record<string, Document[]>> {
  try {
    // Load operation
  } catch (error) {
    throw new Error(`Failed to load from storage: ${error}`);
  }
}
```

### 4. **Atomic Operations**
Save should be atomic - either all data saves or none:

```typescript
async save(data: Record<string, Document[]>): Promise<void> {
  try {
    // Clear all old data first
    await this.clearAll();
    
    // Then write new data
    for (const [collection, docs] of Object.entries(data)) {
      await this.writeCollection(collection, docs);
    }
  } catch (error) {
    // Handle rollback if needed
    throw error;
  }
}
```

## Real-World Example: File System Adapter

Here's a complete example implementing file-system storage:

```typescript
import { Adapter, Document } from '@nebula-db/core';
import { promises as fs } from 'fs';
import { join } from 'path';

export class FileSystemAdapter implements Adapter {
  private dataDir: string;

  constructor(dataDirectory: string) {
    this.dataDir = dataDirectory;
    this.ensureDirectory();
  }

  private async ensureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create data directory: ${error}`);
    }
  }

  private getFilePath(collection: string): string {
    // Sanitize collection name to prevent directory traversal
    const safe = collection.replace(/[^a-zA-Z0-9_-]/g, '_');
    return join(this.dataDir, `${safe}.json`);
  }

  async load(): Promise<Record<string, Document[]>> {
    const collections: Record<string, Document[]> = {};

    try {
      await this.ensureDirectory();
      const files = await fs.readdir(this.dataDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = join(this.dataDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const collection = file.replace('.json', '');

        collections[collection] = JSON.parse(content);
      }
    } catch (error) {
      throw new Error(`Failed to load from file system: ${error}`);
    }

    return collections;
  }

  async save(data: Record<string, Document[]>): Promise<void> {
    try {
      await this.ensureDirectory();

      // Write each collection to its own file
      for (const [collection, docs] of Object.entries(data)) {
        const filePath = this.getFilePath(collection);
        const content = JSON.stringify(docs, null, 2);
        await fs.writeFile(filePath, content, 'utf-8');
      }

      // Clean up files for collections that no longer exist
      const existingFiles = await fs.readdir(this.dataDir);
      for (const file of existingFiles) {
        if (!file.endsWith('.json')) continue;
        const collection = file.replace('.json', '');
        
        if (!(collection in data)) {
          await fs.unlink(join(this.dataDir, file));
        }
      }
    } catch (error) {
      throw new Error(`Failed to save to file system: ${error}`);
    }
  }
}
```

## Advanced Features

### Optional: Lifecycle Methods

While not required, adapters can implement additional methods:

```typescript
export interface AdvancedAdapter extends Adapter {
  /**
   * Optional: Initialize adapter (open connections, etc.)
   */
  init?(): Promise<void>;

  /**
   * Optional: Close adapter (cleanup)
   */
  close?(): Promise<void>;

  /**
   * Optional: Get adapter statistics
   */
  stats?(): Promise<AdapterStats>;
}

interface AdapterStats {
  totalSize: number;
  collectionCount: number;
  documentCount: number;
}
```

### Raw Query Support

For SQL-based adapters, consider adding raw query methods:

```typescript
export class DatabaseAdapter implements Adapter {
  // ... Adapter implementation ...

  /**
   * Execute raw SQL queries (advanced usage)
   */
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    try {
      // Execute and return results
    } catch (error) {
      throw new Error(`Query failed: ${error}`);
    }
  }
}
```

## Testing Your Adapter

Create comprehensive tests:

```typescript
import { describe, it, expect } from 'vitest';
import { MyAdapter } from './my-adapter';

describe('MyAdapter', () => {
  let adapter: MyAdapter;

  beforeEach(() => {
    adapter = new MyAdapter();
  });

  it('should save and load data', async () => {
    const data = {
      users: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' }
      ]
    };

    await adapter.save(data);
    const loaded = await adapter.load();

    expect(loaded.users).toHaveLength(2);
    expect(loaded.users[0].name).toBe('Alice');
  });

  it('should handle empty collections', async () => {
    const data = { users: [] };
    await adapter.save(data);
    const loaded = await adapter.load();

    expect(loaded.users).toEqual([]);
  });

  it('should handle complex data types', async () => {
    const data = {
      docs: [
        {
          id: '1',
          nested: { deep: { value: 42 } },
          array: [1, 2, 3],
          date: new Date().toISOString()
        }
      ]
    };

    await adapter.save(data);
    const loaded = await adapter.load();

    expect(loaded.docs[0].nested.deep.value).toBe(42);
    expect(loaded.docs[0].array).toEqual([1, 2, 3]);
  });

  it('should overwrite existing data', async () => {
    await adapter.save({ users: [{ id: '1', name: 'Alice' }] });
    await adapter.save({ 
      users: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' }
      ]
    });

    const loaded = await adapter.load();
    expect(loaded.users).toHaveLength(2);
  });

  it('should preserve data across save/load cycles', async () => {
    const original = {
      users: [{ id: '1', name: 'Alice' }]
    };

    await adapter.save(original);
    const first = await adapter.load();
    
    await adapter.save(first);
    const second = await adapter.load();

    expect(second).toEqual(original);
  });
});
```

## Package Structure

Recommended structure for a new adapter package:

```
packages/adapter-myservice/
├── src/
│   └── index.ts           # Main adapter implementation
├── tests/
│   └── adapter.test.ts    # Test suite
├── package.json
├── tsconfig.json
├── README.md              # Usage guide
└── LICENSE
```

## Example package.json

```json
{
  "name": "@nebula-db/adapter-myservice",
  "version": "0.4.0",
  "description": "MyService adapter for NebulaDB",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "README.md", "LICENSE"],
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

## Publishing Your Adapter

1. **Choose a name**: Follow `@nebula-db/adapter-*` convention
2. **Create package**: Set up in `packages/adapter-*`
3. **Write tests**: Ensure >80% coverage
4. **Document**: Write comprehensive README
5. **Publish to npm**: `npm publish`

## Performance Optimization Tips

### For High-Throughput Adapters

1. **Batch operations**: Process multiple documents efficiently
2. **Connection pooling**: Reuse connections where applicable
3. **Caching**: Cache frequently accessed data
4. **Compression**: Compress large payloads

### Memory Efficiency

1. **Stream large datasets**: Don't load everything into memory
2. **Pagination**: For adapters supporting it
3. **Indexes**: Create indexes for frequently queried fields

## Troubleshooting

**Issue**: Data not persisting
- Ensure `save()` is actually persisting data
- Check for async/await issues
- Verify error handling

**Issue**: Data corruption
- Implement atomic operations
- Add rollback logic on failure
- Test edge cases

**Issue**: Performance degradation
- Profile load/save operations
- Look for N+1 query patterns
- Consider caching strategies

## See Also

- [Adapter Registry](./ADAPTER_REGISTRY.md) - List of all adapters
- [API Reference](./API.md) - Complete API documentation
- [Examples](../examples/) - Working adapter implementations
