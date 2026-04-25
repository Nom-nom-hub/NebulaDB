import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryAdapter, createMemoryAdapter } from '../src/index';

describe('MemoryAdapter', () => {
  let adapter: MemoryAdapter;

  beforeEach(() => {
    adapter = createMemoryAdapter();
  });

  describe('load', () => {
    it('should return empty object when no data', async () => {
      const data = await adapter.load();
      expect(data).toEqual({});
    });

    it('should return saved data', async () => {
      await adapter.save({
        users: [{ id: '1', name: 'Alice' }],
        posts: [{ id: '2', title: 'Hello' }]
      });

      const data = await adapter.load();
      expect(data.users).toHaveLength(1);
      expect(data.users[0].name).toBe('Alice');
    });
  });

  describe('save', () => {
    it('should save data to memory', async () => {
      const docs = { users: [{ id: '1', name: 'Bob' }] };
      await adapter.save(docs);

      const loaded = await adapter.load();
      expect(loaded.users[0].name).toBe('Bob');
    });

    it('should overwrite previous data', async () => {
      await adapter.save({ users: [{ id: '1', name: 'Alice' }] });
      await adapter.save({ users: [{ id: '2', name: 'Bob' }] });

      const data = await adapter.load();
      expect(data.users).toHaveLength(1);
      expect(data.users[0].name).toBe('Bob');
    });
  });

  describe('getData', () => {
    it('should return current data', async () => {
      await adapter.save({ test: [{ id: '1' }] });
      const data = adapter.getData();
      expect(data.test).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('should clear all data', async () => {
      await adapter.save({ users: [{ id: '1' }] });
      adapter.clear();

      const data = await adapter.load();
      expect(data).toEqual({});
    });
  });

  describe('setData', () => {
    it('should set data directly', async () => {
      adapter.setData({ custom: [{ id: '99', value: 'test' }] });
      const data = await adapter.load();
      expect(data.custom[0].id).toBe('99');
    });
  });
});

describe('MemoryAdapter with autoClear false', () => {
  it('should preserve data between operations', async () => {
    const adapter = createMemoryAdapter(false);
    await adapter.save({ data: [{ id: '1' }] });

    const newAdapter = createMemoryAdapter(false);
    newAdapter.setData(await adapter.load());

    const data = await newAdapter.load();
    expect(data.data[0].id).toBe('1');
  });
});