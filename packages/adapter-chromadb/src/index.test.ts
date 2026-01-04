import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChromadbAdapter } from './index';

describe('ChromadbAdapter', () => {
  let adapter: ChromadbAdapter;

  beforeEach(() => {
    adapter = new ChromadbAdapter({ inMemory: true });
  });

  afterEach(async () => {
    await adapter.close();
  });

  it('should load and save data', async () => {
    // Test implementation
    const testData = {
      users: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' }
      ]
    };

    try {
      await adapter.save(testData);
      const loadedData = await adapter.load();

      expect(loadedData).toEqual(testData);
    } catch (error: any) {
      // Skip test if ChromaDB server is not running
      if (error.message?.includes('Failed to connect to chromadb') || error.code === 'ECONNREFUSED') {
        console.warn('Skipping ChromaDB test: ChromaDB server not running. Start ChromaDB server for full testing.');
        return;
      }
      throw error;
    }
  });
});