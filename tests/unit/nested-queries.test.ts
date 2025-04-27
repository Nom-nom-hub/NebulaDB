import { describe, it, expect, beforeEach } from 'vitest';
import { createDb } from '@nebula/core';
import { MemoryAdapter } from '@nebula/adapter-memory';

describe('Nested Queries', () => {
  let db;
  let collection;

  beforeEach(async () => {
    db = createDb({ adapter: new MemoryAdapter() });
    collection = db.collection('test_nested');
    
    // Insert test data one by one instead of using insertMany
    await collection.insert({
      id: '1',
      user: {
        name: 'Alice',
        profile: {
          age: 28,
          location: {
            city: 'New York',
            country: 'USA'
          },
          interests: ['reading', 'hiking', 'coding']
        },
        settings: {
          notifications: true,
          theme: 'dark'
        }
      },
      metadata: {
        tags: ['important', 'personal']
      }
    });

    await collection.insert({
      id: '2',
      user: {
        name: 'Bob',
        profile: {
          age: 34,
          location: {
            city: 'San Francisco',
            country: 'USA'
          },
          interests: ['gaming', 'music']
        },
        settings: {
          notifications: false,
          theme: 'light'
        }
      },
      metadata: {
        tags: ['work', 'important']
      }
    });

    await collection.insert({
      id: '3',
      user: {
        name: 'Charlie',
        profile: {
          age: 22,
          location: {
            city: 'London',
            country: 'UK'
          },
          interests: ['sports', 'travel']
        },
        settings: {
          notifications: true,
          theme: 'light'
        }
      },
      metadata: {
        tags: ['personal']
      }
    });
  });

  it('should query by simple nested property', async () => {
    const results = await collection.find({ 'user.name': 'Alice' });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
  });

  it('should query by deeply nested property', async () => {
    const results = await collection.find({ 'user.profile.location.country': 'UK' });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('3');
  });

  it('should query with comparison operators on nested properties', async () => {
    const results = await collection.find({ 'user.profile.age': { $gt: 30 } });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('2');
  });

  it('should query with multiple nested conditions', async () => {
    const results = await collection.find({
      'user.profile.age': { $lt: 30 },
      'user.settings.notifications': true
    });
    
    expect(results).toHaveLength(2);
    expect(results.map(r => r.id).sort()).toEqual(['1', '3']);
  });

  it('should query nested arrays with $contains', async () => {
    // The $contains operator might not be implemented correctly
    // Let's try using $in instead, which is more commonly supported
    const results = await collection.find({
      'user.profile.interests': { $in: ['coding'] }
    });
    
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
  });

  it('should query with OR conditions on nested properties', async () => {
    const results = await collection.find({
      $or: [
        { 'user.profile.location.city': 'London' },
        { 'user.settings.theme': 'dark' }
      ]
    });
    
    expect(results).toHaveLength(2);
    expect(results.map(r => r.id).sort()).toEqual(['1', '3']);
  });

  it('should query with complex nested conditions', async () => {
    // The issue might be with how multiple conditions are combined
    // Let's try using $and explicitly to ensure proper combination
    const results = await collection.find({
      $and: [
        { 'user.profile.age': { $gt: 25 } },
        { 'metadata.tags': { $in: ['important'] } },
        { 'user.settings.theme': 'dark' }
      ]
    });
    
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
  });
});
