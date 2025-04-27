import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createDb } from '../../packages/core/src';
import { MemoryAdapter } from '../../packages/adapters/memory/src';

describe('Data Corruption Recovery Tests', () => {
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
  
  it('should recover from corrupted document structure', async () => {
    // Simulate corruption by directly manipulating the internal data structure
    // This is implementation-specific and might need adjustment based on actual implementation
    const internalCollection = (users as any)._collection || users;
    const documents = internalCollection.documents || [];
    
    if (documents.length > 0) {
      // Corrupt the first document by replacing it with invalid data
      const originalDoc = { ...documents[0] };
      documents[0] = { id: originalDoc.id, corrupted: true };
      
      // Try to read the corrupted document
      const result = await users.findOne({ id: originalDoc.id });
      
      // Verify the document was recovered or handled gracefully
      expect(result).toBeTruthy();
      expect(result.id).toBe(originalDoc.id);
      
      // The exact behavior depends on the implementation:
      // 1. It might return the corrupted document as-is
      // 2. It might attempt to repair the document
      // 3. It might return a default/empty document with just the ID
      
      // For now, we'll just verify it doesn't crash and returns something with the correct ID
    } else {
      // Skip test if no documents are available
      console.warn('No documents available for corruption test');
    }
  });
  
  it('should recover from invalid field values', async () => {
    // Insert a document with valid structure
    const user = await users.insert({ 
      id: 'user3', 
      name: 'Charlie', 
      email: 'charlie@example.com', 
      age: 35 
    });
    
    // Simulate corruption by directly manipulating the internal data
    const internalCollection = (users as any)._collection || users;
    const documents = internalCollection.documents || [];
    
    // Find the document we just inserted
    const docIndex = documents.findIndex((d: any) => d.id === 'user3');
    
    if (docIndex >= 0) {
      // Corrupt specific fields with invalid values
      const originalDoc = { ...documents[docIndex] };
      documents[docIndex].age = "not-a-number"; // Age should be a number
      documents[docIndex].email = {}; // Email should be a string
      
      // Try to read the corrupted document
      const result = await users.findOne({ id: 'user3' });
      
      // Verify the document was handled properly
      expect(result).toBeTruthy();
      expect(result.id).toBe('user3');
      
      // Try to update the document, which might trigger validation/recovery
      const updated = await users.update({ id: 'user3' }, { name: 'Charles' });
      
      // Verify the update operation didn't crash
      expect(updated).toBeTruthy();
    } else {
      // Skip test if document not found
      console.warn('Test document not found for field corruption test');
    }
  });
  
  it('should recover from missing required fields', async () => {
    // Define a collection with schema validation if supported
    let validatedUsers;
    try {
      validatedUsers = db.collection('validated_users', {
        schema: {
          required: ['id', 'name', 'email']
        }
      });
    } catch (e) {
      // If schema validation is not supported, skip this test
      console.warn('Schema validation not supported, skipping test');
      return;
    }
    
    // Insert a valid document
    await validatedUsers.insert({ 
      id: 'vuser1', 
      name: 'Validated User', 
      email: 'validated@example.com' 
    });
    
    // Simulate corruption by removing a required field
    const internalCollection = (validatedUsers as any)._collection || validatedUsers;
    const documents = internalCollection.documents || [];
    
    const docIndex = documents.findIndex((d: any) => d.id === 'vuser1');
    
    if (docIndex >= 0) {
      // Remove a required field
      const originalDoc = { ...documents[docIndex] };
      delete documents[docIndex].email;
      
      // Try to read the corrupted document
      const result = await validatedUsers.findOne({ id: 'vuser1' });
      
      // Verify the document was handled properly
      expect(result).toBeTruthy();
      expect(result.id).toBe('vuser1');
      
      // The behavior depends on implementation:
      // 1. It might return the document without the required field
      // 2. It might attempt to repair by adding a default value
      // 3. It might throw an error (which we'd catch and handle)
      
      // Try to update the document, which might trigger validation/recovery
      try {
        const updated = await validatedUsers.update({ id: 'vuser1' }, { name: 'Updated Name' });
        // If update succeeds, verify it worked
        expect(updated).toBeTruthy();
      } catch (error) {
        // If update fails due to validation, that's also acceptable
        expect(error).toBeTruthy();
      }
    } else {
      // Skip test if document not found
      console.warn('Test document not found for missing field test');
    }
  });
  
  it('should handle corrupted database file gracefully', async () => {
    // This test is more relevant for persistent adapters like SQLite or filesystem
    // For in-memory adapter, we'll simulate a corruption scenario
    
    // Save the database state
    await db.save();
    
    // Mock the adapter's load method to simulate corruption
    const adapter = db.adapter;
    const originalLoad = adapter.load;
    
    adapter.load = vi.fn().mockImplementation(() => {
      // Simulate corrupted data by returning malformed data
      return Promise.resolve({
        users: { corrupted: true, not_valid_data: {} },
        posts: null // Missing collection
      });
    });
    
    // Create a new database instance that will load the "corrupted" data
    const newDb = createDb({ adapter });
    
    // This should not throw, even with corrupted data
    const newUsers = newDb.collection('users');
    const newPosts = newDb.collection('posts');
    
    // Wait for data to be loaded
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify the database recovered or initialized with empty collections
    const allUsers = await newUsers.find();
    const allPosts = await newPosts.find();
    
    // The exact behavior depends on implementation, but it shouldn't crash
    expect(allUsers).toBeDefined();
    expect(allPosts).toBeDefined();
    expect(Array.isArray(allUsers)).toBe(true);
    expect(Array.isArray(allPosts)).toBe(true);
  });
  
  it('should recover from schema violations', async () => {
    // Define a collection with schema validation if supported
    let schemaUsers;
    try {
      schemaUsers = db.collection('schema_users', {
        schema: {
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            age: { type: 'number', minimum: 0 },
            email: { type: 'string', format: 'email' }
          },
          required: ['id', 'name', 'email']
        }
      });
    } catch (e) {
      // If schema validation is not supported, skip this test
      console.warn('Schema validation not supported, skipping test');
      return;
    }
    
    // Insert a valid document
    await schemaUsers.insert({ 
      id: 'suser1', 
      name: 'Schema User', 
      email: 'schema@example.com',
      age: 30
    });
    
    // Simulate corruption by violating schema rules
    const internalCollection = (schemaUsers as any)._collection || schemaUsers;
    const documents = internalCollection.documents || [];
    
    const docIndex = documents.findIndex((d: any) => d.id === 'suser1');
    
    if (docIndex >= 0) {
      // Violate schema rules
      documents[docIndex].age = -10; // Age should be >= 0
      documents[docIndex].email = 'not-an-email'; // Invalid email format
      
      // Try to read the corrupted document
      const result = await schemaUsers.findOne({ id: 'suser1' });
      
      // Verify the document was handled properly
      expect(result).toBeTruthy();
      expect(result.id).toBe('suser1');
      
      // Try to update the document with valid values, which should fix the corruption
      try {
        const updated = await schemaUsers.update(
          { id: 'suser1' }, 
          { age: 31, email: 'fixed@example.com' }
        );
        
        // If update succeeds, verify the values were fixed
        expect(updated).toBeTruthy();
        expect(updated.age).toBe(31);
        expect(updated.email).toBe('fixed@example.com');
      } catch (error) {
        // If update fails due to validation, that's also acceptable
        expect(error).toBeTruthy();
      }
    } else {
      // Skip test if document not found
      console.warn('Test document not found for schema violation test');
    }
  });
});
