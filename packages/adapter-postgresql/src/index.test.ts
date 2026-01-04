import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PostgresqlAdapter } from './index';

describe('PostgresqlAdapter', () => {
  let adapter: PostgresqlAdapter | undefined;

  beforeEach(() => {
    // Use environment variables for test database connection
    const connectionString = process.env.POSTGRES_TEST_CONNECTION_STRING;
    if (connectionString) {
      adapter = new PostgresqlAdapter({
        connectionString,
        tableName: 'test_documents'
      });
    }
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.close();
      adapter = undefined;
    }
  });

  it('should load and save data', async () => {
    if (!adapter) {
      console.warn('Skipping PostgreSQL test: POSTGRES_TEST_CONNECTION_STRING not set');
      return;
    }
    // Test implementation
    const testData = {
      users: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' }
      ]
    };

    await adapter.save(testData);
    const loadedData = await adapter.load();

    expect(loadedData).toEqual(testData);
  });
});