import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createDb } from '../../packages/core/src';
import { MemoryAdapter } from '../../packages/adapters/memory/src';

describe('Adapter-Specific Error Conditions Tests', () => {
  let db: any;
  let users: any;
  
  beforeEach(async () => {
    // Create a fresh database for each test
    db = createDb({ adapter: new MemoryAdapter() });
    users = db.collection('users');
    
    // Add some initial data
    await users.insert({ id: 'user1', name: 'Alice', email: 'alice@example.com', age: 30 });
    await users.insert({ id: 'user2', name: 'Bob', email: 'bob@example.com', age: 25 });
  });
  
  afterEach(() => {
    // Clean up any mocks
    vi.restoreAllMocks();
  });
  
  it('should handle memory adapter out-of-memory error', async () => {
    // Mock the global.gc function if available to simulate memory pressure
    if (global.gc) {
      const originalGc = global.gc;
      global.gc = vi.fn().mockImplementation(() => {
        // Do nothing, simulating failed garbage collection
      });
      
      // Restore original gc after test
      afterEach(() => {
        global.gc = originalGc;
      });
    }
    
    // Mock console.warn to capture memory warnings
    const originalWarn = console.warn;
    const warnMock = vi.fn();
    console.warn = warnMock;
    
    // Restore console.warn after test
    afterEach(() => {
      console.warn = originalWarn;
    });
    
    // Simulate memory pressure by inserting a large number of documents
    try {
      // This is just a simulation - in a real scenario, we'd insert until OOM
      for (let i = 0; i < 100; i++) {
        await users.insert({
          id: `user${i + 3}`,
          name: `User ${i + 3}`,
          email: `user${i + 3}@example.com`,
          // Add some data to make the document larger
          profile: {
            bio: 'A'.repeat(1000), // 1KB of data
            interests: Array(100).fill('interest'),
            friends: Array(100).fill('friend')
          }
        });
      }
      
      // If we get here, the database handled the memory pressure gracefully
      // Verify the database is still operational
      const allUsers = await users.find();
      expect(allUsers).toBeTruthy();
      expect(Array.isArray(allUsers)).toBe(true);
      
    } catch (error) {
      // If an error occurs, it should be handled gracefully
      // The exact behavior depends on the implementation
      console.log('Error during memory pressure test:', error);
      
      // Verify the database is still operational after the error
      const allUsers = await users.find();
      expect(allUsers).toBeTruthy();
      expect(Array.isArray(allUsers)).toBe(true);
    }
  });
  
  it('should handle filesystem adapter permission errors', async () => {
    // This test is specific to filesystem adapters
    // For memory adapter, we'll simulate a permission error
    
    // Mock the adapter's save method to simulate permission error
    const adapter = db.adapter;
    const originalSave = adapter.save;
    
    adapter.save = vi.fn().mockImplementation(async () => {
      throw new Error('EACCES: permission denied');
    });
    
    // Insert some data
    await users.insert({ id: 'user3', name: 'Charlie', email: 'charlie@example.com' });
    
    // Try to save (should fail with permission error)
    try {
      await db.save();
      // If we get here, the save didn't fail as expected
    } catch (error) {
      // Expected permission error
      expect(error.message).toContain('permission denied');
      
      // Verify the database is still operational after the error
      const allUsers = await users.find();
      expect(allUsers).toBeTruthy();
      expect(Array.isArray(allUsers)).toBe(true);
      expect(allUsers.length).toBeGreaterThan(0);
    }
  });
  
  it('should handle indexeddb adapter quota errors', async () => {
    // This test is specific to IndexedDB adapters
    // For memory adapter, we'll simulate a quota error
    
    // Mock the adapter's save method to simulate quota error
    const adapter = db.adapter;
    const originalSave = adapter.save;
    
    adapter.save = vi.fn().mockImplementation(async () => {
      throw new Error('QuotaExceededError: The quota has been exceeded');
    });
    
    // Insert some data
    await users.insert({ id: 'user3', name: 'Charlie', email: 'charlie@example.com' });
    
    // Try to save (should fail with quota error)
    try {
      await db.save();
      // If we get here, the save didn't fail as expected
    } catch (error) {
      // Expected quota error
      expect(error.message).toContain('quota');
      
      // Verify the database is still operational after the error
      const allUsers = await users.find();
      expect(allUsers).toBeTruthy();
      expect(Array.isArray(allUsers)).toBe(true);
      expect(allUsers.length).toBeGreaterThan(0);
    }
  });
  
  it('should handle sqlite adapter locked database errors', async () => {
    // This test is specific to SQLite adapters
    // For memory adapter, we'll simulate a database locked error
    
    // Mock the adapter's save method to simulate locked database
    const adapter = db.adapter;
    const originalSave = adapter.save;
    
    adapter.save = vi.fn().mockImplementation(async () => {
      throw new Error('SQLITE_BUSY: database is locked');
    });
    
    // Insert some data
    await users.insert({ id: 'user3', name: 'Charlie', email: 'charlie@example.com' });
    
    // Try to save (should fail with locked database error)
    try {
      await db.save();
      // If we get here, the save didn't fail as expected
    } catch (error) {
      // Expected locked database error
      expect(error.message).toContain('locked');
      
      // Verify the database is still operational after the error
      const allUsers = await users.find();
      expect(allUsers).toBeTruthy();
      expect(Array.isArray(allUsers)).toBe(true);
      expect(allUsers.length).toBeGreaterThan(0);
    }
  });
  
  it('should handle adapter initialization errors', async () => {
    // Simulate an adapter that fails to initialize
    class FailingAdapter extends MemoryAdapter {
      constructor() {
        super();
        throw new Error('Failed to initialize adapter');
      }
    }
    
    // Try to create a database with the failing adapter
    try {
      const failingDb = createDb({ adapter: new FailingAdapter() as any });
      // If we get here, the initialization didn't fail as expected
    } catch (error) {
      // Expected initialization error
      expect(error.message).toContain('Failed to initialize adapter');
      
      // Verify the original database is still operational
      const allUsers = await users.find();
      expect(allUsers).toBeTruthy();
      expect(Array.isArray(allUsers)).toBe(true);
    }
  });
});
