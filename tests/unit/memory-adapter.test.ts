import { describe, it, expect } from 'vitest';
import { MemoryAdapter } from '../../packages/adapters/memory/src';

describe('MemoryAdapter', () => {
  it('should load and save data', async () => {
    const adapter = new MemoryAdapter();
    
    // Initial load should return empty data
    const initialData = await adapter.load();
    expect(initialData).toEqual({});
    
    // Save some data
    const testData = {
      users: [
        { id: '1', name: 'Alice', age: 30 },
        { id: '2', name: 'Bob', age: 25 }
      ],
      posts: [
        { id: '1', title: 'Hello World', author: '1' }
      ]
    };
    
    await adapter.save(testData);
    
    // Load the data back
    const loadedData = await adapter.load();
    expect(loadedData).toEqual(testData);
  });
  
  it('should create a deep copy of data', async () => {
    const adapter = new MemoryAdapter();
    
    // Save some data
    const testData = {
      users: [
        { id: '1', name: 'Alice', age: 30 }
      ]
    };
    
    await adapter.save(testData);
    
    // Load the data
    const loadedData = await adapter.load();
    
    // Modify the loaded data
    loadedData.users[0].name = 'Modified';
    
    // Load again, should not be affected by the modification
    const reloadedData = await adapter.load();
    expect(reloadedData.users[0].name).toBe('Alice');
  });
});
