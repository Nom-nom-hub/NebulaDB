import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { HybridAdapter, createHybridAdapter } from '../src/index';
import type { Adapter, Document } from '@nebula-db/core';

// Mock adapter that stores data in memory
class MockAdapter implements Adapter {
  private data: Record<string, Document[]> = {};
  private shouldFail: 'never' | 'connect' | 'load' | 'save' = 'never';
  private connected: boolean = false;

  constructor(failMode: 'never' | 'connect' | 'load' | 'save' = 'never') {
    this.shouldFail = failMode;
  }

  async connect(): Promise<void> {
    if (this.shouldFail === 'connect') throw new Error('Connection failed');
    this.connected = true;
  }

  async load(): Promise<Record<string, Document[]>> {
    if (this.shouldFail === 'load') throw new Error('Load failed');
    return JSON.parse(JSON.stringify(this.data));
  }

  async save(data: Record<string, Document[]>): Promise<void> {
    if (this.shouldFail === 'save') throw new Error('Save failed');
    this.data = JSON.parse(JSON.stringify(data));
  }

  async close(): Promise<void> {
    this.connected = false;
  }

  getData(): Record<string, Document[]> {
    return JSON.parse(JSON.stringify(this.data));
  }

  isConnected(): boolean {
    return this.connected;
  }
}

describe('HybridAdapter', () => {
  let localAdapter: MockAdapter;
  let cloudAdapter: MockAdapter;
  let hybridAdapter: HybridAdapter;

  beforeEach(() => {
    localAdapter = new MockAdapter();
    cloudAdapter = new MockAdapter();
    hybridAdapter = createHybridAdapter({
      localAdapter,
      cloudAdapter,
      mode: 'local-first',
      syncOnConnect: true
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create adapter with valid options', () => {
      expect(hybridAdapter).toBeInstanceOf(HybridAdapter);
    });

    it('should throw on missing adapters', () => {
      expect(() => new HybridAdapter({
        localAdapter: null as any,
        cloudAdapter: null as any
      })).toThrow('Both local and cloud adapters are required');
    });

    it('should default to local-first mode', async () => {
      await hybridAdapter.connect();

      expect(hybridAdapter.isCloudConnected()).toBe(true);
    });
  });

  describe('connect', () => {
    it('should connect to local adapter', async () => {
      await hybridAdapter.connect();
      expect(localAdapter.isConnected()).toBe(true);
    });

    it('should handle cloud adapter connection failure gracefully', async () => {
      const failingCloud = new MockAdapter('connect');
      const adapterWithCloudFail = createHybridAdapter({
        localAdapter,
        cloudAdapter: failingCloud,
        syncOnConnect: false
      });

      // Should not throw
      await adapterWithCloudFail.connect();
      expect(adapterWithCloudFail.isCloudConnected()).toBe(false);
    });

    it('should sync from cloud on connect when enabled', async () => {
      await cloudAdapter.save({ users: [{ id: '1', name: 'Cloud Alice' }] });
      await localAdapter.save({ users: [{ id: '2', name: 'Local Bob' }] });

      await hybridAdapter.connect();

      const localData = await localAdapter.load();
      expect(localData.users).toHaveLength(1);
      expect(localData.users[0].name).toBe('Cloud Alice');
    });
  });

  describe('save', () => {
    it('should save to local adapter always', async () => {
      await hybridAdapter.connect();

      const data = { users: [{ id: '1', name: 'Alice' }] };
      await hybridAdapter.save(data);

      const localData = await localAdapter.load();
      expect(localData.users).toHaveLength(1);
      expect(localData.users[0].name).toBe('Alice');
    });

    it('should also save to cloud when available', async () => {
      await hybridAdapter.connect();

      const data = { users: [{ id: '1', name: 'Alice' }] };
      await hybridAdapter.save(data);

      // Give async cloud sync time
      await new Promise(resolve => setTimeout(resolve, 50));

      const cloudData = await cloudAdapter.load();
      expect(cloudData.users).toHaveLength(1);
      expect(cloudData.users[0].name).toBe('Alice');
    });

    it('should still work when cloud is unavailable', async () => {
      const failingCloud = new MockAdapter('save');
      const adapter = createHybridAdapter({
        localAdapter,
        cloudAdapter: failingCloud,
        syncOnConnect: false
      });

      await adapter.connect();

      const data = { users: [{ id: '1', name: 'Alice' }] };
      // Should not throw - local save works even if cloud fails
      await adapter.save(data);

      const localData = await localAdapter.load();
      expect(localData.users).toHaveLength(1);
    });
  });

  describe('load', () => {
    it('should load from local adapter in local-first mode', async () => {
      await hybridAdapter.connect();
      await localAdapter.save({ users: [{ id: '1', name: 'Local Alice' }] });
      await cloudAdapter.save({ users: [{ id: '2', name: 'Cloud Bob' }] });

      const data = await hybridAdapter.load();

      // local-first: local data takes precedence
      expect(data.users).toHaveLength(1);
      expect(data.users[0].name).toBe('Local Alice');
    });

    it('should merge data in cloud-first mode', async () => {
      const cloudFirstAdapter = createHybridAdapter({
        localAdapter,
        cloudAdapter,
        mode: 'cloud-first',
        syncOnConnect: false
      });

      await cloudFirstAdapter.connect();
      await localAdapter.save({ users: [{ id: '1', name: 'Local Alice' }] });
      await cloudAdapter.save({ users: [{ id: '2', name: 'Cloud Bob' }] });

      const data = await cloudFirstAdapter.load();

      // cloud-first: cloud takes precedence, unique local merged
      expect(data.users).toHaveLength(2);

      const cloudDoc = data.users.find((d: any) => d.id === '2');
      const localDoc = data.users.find((d: any) => d.id === '1');
      expect(cloudDoc).toBeDefined();
      expect(localDoc).toBeDefined();
    });
  });

  describe('sync', () => {
    it('should force sync between local and cloud', async () => {
      await hybridAdapter.connect();
      await localAdapter.save({ users: [{ id: '1', name: 'Local Alice' }] });

      await hybridAdapter.sync();

      const cloudData = await cloudAdapter.load();
      expect(cloudData.users).toHaveLength(1);
      expect(cloudData.users[0].name).toBe('Local Alice');
    });

    it('should throw when cloud is unavailable', async () => {
      const adapter = createHybridAdapter({
        localAdapter,
        cloudAdapter: new MockAdapter('connect'),
        syncOnConnect: false
      });

      await adapter.connect();

      await expect(adapter.sync()).rejects.toThrow('Cloud adapter not available');
    });
  });

  describe('getLocalAdapter and getCloudAdapter', () => {
    it('should return local adapter', () => {
      expect(hybridAdapter.getLocalAdapter()).toBe(localAdapter);
    });

    it('should return cloud adapter', () => {
      expect(hybridAdapter.getCloudAdapter()).toBe(cloudAdapter);
    });
  });

  describe('close', () => {
    it('should close both adapters', async () => {
      await hybridAdapter.connect();
      await hybridAdapter.close();

      expect(localAdapter.isConnected()).toBe(false);
    });

    it('should stop periodic sync on close', async () => {
      vi.useFakeTimers();

      const adapterWithSync = createHybridAdapter({
        localAdapter,
        cloudAdapter,
        syncInterval: 1000,
        syncOnConnect: true
      });

      await adapterWithSync.connect();
      await adapterWithSync.close();

      // Advance timer - nothing should happen since sync was stopped
      vi.advanceTimersByTime(5000);
      // Should not throw
    });
  });
});
