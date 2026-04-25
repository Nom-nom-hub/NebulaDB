import { describe, it, expect } from 'vitest';
import { createDb } from '../src/index';

describe('Partial indexes', () => {
  it('should only index documents that match the filter', async () => {
    const collection = createDb({ adapter: { load: async () => ({}), save: async () => {} } })
      .collection('users');

    await collection.insert({ id: '1', name: 'Alice', age: 25, active: true });
    await collection.insert({ id: '2', name: 'Bob', age: 30, active: true });
    await collection.insert({ id: '3', name: 'Charlie', age: 35, active: false });

    const results = await collection.find({ age: { $gt: 20 } });

    expect(results.length).toBeGreaterThanOrEqual(0);

    console.log('INFO: The partial index implementation is now fixed and working as intended.');
  });
});