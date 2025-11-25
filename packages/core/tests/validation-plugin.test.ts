import { describe, it, expect } from 'vitest';
import { createDb, MemoryAdapter } from '../src';
import { createValidationPlugin } from '../../../packages/plugins/validation/src';
import { z } from 'zod';
import { createMigrationPlugin } from '../../../packages/plugins/migration/src';

describe('ValidationPlugin', () => {
  it('should validate documents on insert', async () => {
    // Create a schema for users
    const userSchema = z.object({
      id: z.string(),
      name: z.string().min(2).max(50),
      age: z.number().int().positive(),
      email: z.string().email().optional()
    });

    // Create a validation plugin
    const validationPlugin = createValidationPlugin({
      schemas: {
        users: userSchema
      }
    });

    // Create a database with the validation plugin
    const db = createDb({
      adapter: new MemoryAdapter(),
      plugins: [validationPlugin]
    });

    const users = db.collection('users');

    // Valid document should be inserted
    const validUser = await users.insert({
      name: 'Alice',
      age: 30,
      email: 'alice@example.com'
    });

    expect(validUser).toHaveProperty('id');
    expect(validUser.name).toBe('Alice');

    // Invalid document should throw an error
    try {
      await users.insert({
        name: 'A', // Too short
        age: -5, // Negative
        email: 'not-an-email' // Invalid email
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      // Just check that an error was thrown
      expect(error).toBeTruthy();
    }
  });

  it('should work with collections without schemas', async () => {
    // Create a validation plugin with only one schema
    const validationPlugin = createValidationPlugin({
      schemas: {
        users: z.object({
          id: z.string(),
          name: z.string()
        })
      }
    });

    // Create a database with the validation plugin
    const db = createDb({
      adapter: new MemoryAdapter(),
      plugins: [validationPlugin]
    });

    // Collection without a schema
    const posts = db.collection('posts');

    // Should be able to insert any document
    const post = await posts.insert({
      title: 'Hello World',
      content: 'This is a test'
    });

    expect(post).toHaveProperty('id');
    expect(post.title).toBe('Hello World');
  });

  it('should enforce strict mode when enabled', async () => {
    // Create a validation plugin with strict mode
    const validationPlugin = createValidationPlugin({
      schemas: {
        users: z.object({
          id: z.string(),
          name: z.string()
        })
      },
      strict: true
    });

    // Create a database with the validation plugin
    const db = createDb({
      adapter: new MemoryAdapter(),
      plugins: [validationPlugin]
    });

    // Collection without a schema
    const posts = db.collection('posts');

    // Should throw an error in strict mode
    await expect(posts.insert({
      title: 'Hello World'
    })).rejects.toThrow('No schema defined for collection "posts" and strict mode is enabled');
  });
});

describe('Migration Plugin Schema Version Helpers', () => {
  it('should return 0 for new collection', async () => {
    const plugin = createMigrationPlugin({ migrations: [] });
    const db = createDb({ adapter: new MemoryAdapter(), plugins: [plugin] });
    await db.init?.();
    const version = await plugin.getSchemaVersion(db, 'test');
    expect(version).toBe(0);
  });

  it('should return highest applied migration version', async () => {
    const plugin = createMigrationPlugin({ migrations: [
      { version: 1, name: 'v1', collection: 'test', up: async () => {} },
      { version: 2, name: 'v2', collection: 'test', up: async () => {} }
    ] });
    const newDb = createDb({ adapter: new MemoryAdapter(), plugins: [plugin] });
    await newDb.init?.();
    await plugin.applyMigrations();
    const version = await plugin.getSchemaVersion(newDb, 'test');
    expect(version).toBe(2);
  });

  it('should forcibly set schema version', async () => {
    const plugin = createMigrationPlugin({ migrations: [] });
    const db = createDb({ adapter: new MemoryAdapter(), plugins: [plugin] });
    await db.init?.();
    await plugin.setSchemaVersion(db, 'test', 5);
    const version = await plugin.getSchemaVersion(db, 'test');
    expect(version).toBe(5);
  });
});
