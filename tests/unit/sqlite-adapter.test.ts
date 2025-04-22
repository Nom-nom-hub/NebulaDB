import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb } from '../../packages/core/src';
import { SQLiteAdapter } from '../../packages/adapters/sqlite/src';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('SQLiteAdapter', () => {
  let tempDir: string;
  let dbPath: string;
  let adapter: SQLiteAdapter;

  beforeEach(() => {
    // Create a temporary directory for the test database
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nebula-test-'));
    dbPath = path.join(tempDir, 'test.sqlite');
    adapter = new SQLiteAdapter(dbPath);
  });

  afterEach(() => {
    // Close the adapter
    adapter.close();

    // Clean up temporary files
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }
  });

  it('should create a new database file', () => {
    expect(fs.existsSync(dbPath)).toBe(true);
  });

  it('should save and load data', async () => {
    const db = createDb({ adapter });
    const users = db.collection('users');

    // Insert some data
    await users.insert({ name: 'Alice', age: 30 });
    await users.insert({ name: 'Bob', age: 25 });

    // Save the database
    await db.save();

    // Create a new database with the same adapter
    const newAdapter = new SQLiteAdapter(dbPath);
    const newDb = createDb({ adapter: newAdapter });

    // Wait for data to be loaded (since loading is async)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Load the data
    const newUsers = newDb.collection('users');
    const allUsers = await newUsers.find();

    // Check if data was loaded
    expect(allUsers).toHaveLength(2);
    expect(allUsers.map(u => u.name).sort()).toEqual(['Alice', 'Bob']);

    // Clean up
    newAdapter.close();
  });

  it('should handle multiple collections', async () => {
    const db = createDb({ adapter });
    const users = db.collection('users');
    const posts = db.collection('posts');

    // Insert data into both collections
    await users.insert({ name: 'Alice' });
    await posts.insert({ title: 'Hello World', author: 'Alice' });

    // Save the database
    await db.save();

    // Create a new database with the same adapter
    const newAdapter = new SQLiteAdapter(dbPath);
    const newDb = createDb({ adapter: newAdapter });

    // Wait for data to be loaded (since loading is async)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Load the data
    const newUsers = newDb.collection('users');
    const newPosts = newDb.collection('posts');

    const allUsers = await newUsers.find();
    const allPosts = await newPosts.find();

    // Check if data was loaded
    expect(allUsers).toHaveLength(1);
    expect(allPosts).toHaveLength(1);
    expect(allUsers[0].name).toBe('Alice');
    expect(allPosts[0].title).toBe('Hello World');

    // Clean up
    newAdapter.close();
  });

  it('should handle empty collections', async () => {
    const db = createDb({ adapter });
    db.collection('empty');

    // Save the database
    await db.save();

    // Create a new database with the same adapter
    const newAdapter = new SQLiteAdapter(dbPath);
    const newDb = createDb({ adapter: newAdapter });

    // Load the data
    const emptyCollection = newDb.collection('empty');
    const result = await emptyCollection.find();

    // Check if empty collection was loaded
    expect(result).toHaveLength(0);

    // Clean up
    newAdapter.close();
  });

  it('should handle complex document structures', async () => {
    const db = createDb({ adapter });
    const users = db.collection('users');

    // Insert a complex document
    const complexUser = {
      name: 'Alice',
      age: 30,
      address: {
        street: '123 Main St',
        city: 'New York',
        zip: '10001'
      },
      tags: ['developer', 'designer'],
      active: true,
      scores: [85, 92, 78]
    };

    await users.insert(complexUser);

    // Save the database
    await db.save();

    // Create a new database with the same adapter
    const newAdapter = new SQLiteAdapter(dbPath);
    const newDb = createDb({ adapter: newAdapter });

    // Wait for data to be loaded (since loading is async)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Load the data
    const newUsers = newDb.collection('users');
    const result = await newUsers.findOne({});

    // Check if complex document was loaded correctly
    expect(result).toMatchObject({
      name: 'Alice',
      age: 30,
      address: {
        street: '123 Main St',
        city: 'New York',
        zip: '10001'
      },
      tags: ['developer', 'designer'],
      active: true,
      scores: [85, 92, 78]
    });

    // Clean up
    newAdapter.close();
  });
});
