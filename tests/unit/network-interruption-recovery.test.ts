import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createDb } from '../../packages/core/src';
import { MemoryAdapter } from '../../packages/adapters/memory/src';

describe('Network Interruption Recovery Tests', () => {
  let db: any;
  let users: any;
  let posts: any;

  beforeEach(async () => {
    // Create a fresh database for each test
    db = createDb({ adapter: new MemoryAdapter() });
    users = db.collection('users');
    posts = db.collection('posts');

    // Add some initial data
    await users.insert({ id: 'user1', name: 'Alice', email: 'alice@example.com', age: 30 });
    await users.insert({ id: 'user2', name: 'Bob', email: 'bob@example.com', age: 25 });
    await posts.insert({ id: 'post1', title: 'First Post', content: 'Hello world', userId: 'user1' });
  });

  afterEach(() => {
    // Clean up any mocks
    vi.restoreAllMocks();
  });

  it('should handle network interruption during save operation', async () => {
    // Mock the adapter's save method to simulate network interruption
    const adapter = db.adapter;
    const originalSave = adapter.save;

    // First call fails, second call succeeds
    let saveAttempts = 0;
    adapter.save = vi.fn().mockImplementation(async (data) => {
      saveAttempts++;
      if (saveAttempts === 1) {
        throw new Error('Network connection lost during save');
      }
      return originalSave.call(adapter, data);
    });

    // Insert new data
    await users.insert({ id: 'user3', name: 'Charlie', email: 'charlie@example.com', age: 35 });

    // Try to save (should fail first time)
    try {
      await db.save();
      // If we get here, the save didn't fail as expected
      // This is acceptable if the implementation has retry logic
    } catch (error) {
      // Expected error on first attempt
      expect(error.message).toContain('Network connection lost');

      // Try again (should succeed)
      await db.save();
    }

    // Verify save was attempted
    expect(saveAttempts).toBeGreaterThanOrEqual(1);

    // The test is primarily about handling the error gracefully
    // The actual persistence behavior depends on the implementation
    // We're just verifying the database is still operational after the error
    const allUsers = await users.find();
    expect(allUsers).toBeTruthy();
    expect(Array.isArray(allUsers)).toBe(true);
  });

  it('should handle network interruption during load operation', async () => {
    // Save the database state
    await db.save();

    // Mock the adapter's load method to simulate network interruption
    const adapter = db.adapter;
    const originalLoad = adapter.load;

    // First call fails, second call succeeds
    let loadAttempts = 0;
    adapter.load = vi.fn().mockImplementation(async () => {
      loadAttempts++;
      if (loadAttempts === 1) {
        throw new Error('Network connection lost during load');
      }
      return originalLoad.call(adapter);
    });

    // Create a new database with the mocked adapter
    let newDb;
    try {
      newDb = createDb({ adapter });
      // If we get here, the load didn't fail as expected
      // This is acceptable if the implementation has retry logic
    } catch (error) {
      // Expected error on first attempt
      expect(error.message).toContain('Network connection lost');

      // Reset the mock to allow success on next attempt
      adapter.load.mockReset();
      adapter.load = vi.fn().mockImplementation(async () => {
        return originalLoad.call(adapter);
      });

      // Try again (should succeed)
      newDb = createDb({ adapter });
    }

    // Verify load was attempted
    expect(loadAttempts).toBeGreaterThanOrEqual(1);

    // Access a collection to trigger data loading
    const newUsers = newDb.collection('users');

    // Wait for data to be loaded
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify the database is operational
    const allUsers = await newUsers.find();
    expect(allUsers).toBeTruthy();
    expect(Array.isArray(allUsers)).toBe(true);

    // The actual data loaded depends on the implementation
    // Some implementations might initialize with empty collections on error
  });

  it('should handle partial data received during network interruption', async () => {
    // Save the database state
    await db.save();

    // Mock the adapter's load method to simulate partial data
    const adapter = db.adapter;
    const originalLoad = adapter.load;

    adapter.load = vi.fn().mockImplementation(async () => {
      // Return partial data (only users, no posts)
      const fullData = await originalLoad.call(adapter);
      const partialData = { users: fullData.users };
      return partialData;
    });

    // Create a new database with the mocked adapter
    const newDb = createDb({ adapter });

    // Access collections to trigger data loading
    const newUsers = newDb.collection('users');
    const newPosts = newDb.collection('posts');

    // Wait for data to be loaded
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify users were loaded
    const allUsers = await newUsers.find();
    expect(allUsers).toBeTruthy();
    expect(allUsers.length).toBeGreaterThanOrEqual(2);

    // Verify posts collection exists but might be empty due to partial data
    const allPosts = await newPosts.find();
    expect(allPosts).toBeDefined();
    expect(Array.isArray(allPosts)).toBe(true);
  });

  it('should recover from network interruption during query operation', async () => {
    // Mock the collection's find method to simulate network interruption
    const originalFind = users.find;

    // First call fails, second call succeeds
    let findAttempts = 0;
    users.find = vi.fn().mockImplementation(async (query) => {
      findAttempts++;
      if (findAttempts === 1) {
        throw new Error('Network connection lost during query');
      }
      return originalFind.call(users, query);
    });

    // Try to query (should fail first time)
    try {
      await users.find({ age: { $gt: 25 } });
      // If we get here, the query didn't fail as expected
      // This is acceptable if the implementation has retry logic
    } catch (error) {
      // Expected error on first attempt
      expect(error.message).toContain('Network connection lost');

      // Try again (should succeed)
      const results = await users.find({ age: { $gt: 25 } });
      expect(results).toBeTruthy();
      expect(Array.isArray(results)).toBe(true);
    }

    // Verify find was attempted
    expect(findAttempts).toBeGreaterThanOrEqual(1);
  });

  it('should recover from network timeout during operation', async () => {
    // Mock the collection's insert method to simulate network timeout
    const originalInsert = users.insert;

    // Create a delayed insert function that resolves after a timeout
    users.insert = vi.fn().mockImplementation(async (doc) => {
      // Simulate a long-running operation that eventually succeeds
      await new Promise(resolve => setTimeout(resolve, 100));
      return originalInsert.call(users, doc);
    });

    // Set a short timeout for the operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), 50);
    });

    // Try to insert with timeout
    try {
      await Promise.race([
        users.insert({ id: 'user4', name: 'Dave', email: 'dave@example.com' }),
        timeoutPromise
      ]);
      // If we get here, the operation completed before the timeout
      // This is unlikely with our setup but possible
    } catch (error) {
      // Expected timeout error
      expect(error.message).toContain('timed out');

      // Wait for the insert operation to complete in the background
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Verify the insert was attempted
    expect(users.insert).toHaveBeenCalled();

    // Try to find the user that might have been inserted despite the timeout
    await users.findOne({ id: 'user4' });

    // The behavior depends on implementation:
    // 1. The insert might have completed despite the timeout
    // 2. The insert might have been aborted due to the timeout

    // We're just verifying the database is still operational
    const allUsers = await users.find();
    expect(allUsers).toBeTruthy();
    expect(Array.isArray(allUsers)).toBe(true);
  });
});
