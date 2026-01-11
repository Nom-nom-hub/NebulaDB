import { describe, it, expect, beforeEach } from 'vitest';
import { EncryptedAdapter, createEncryptedAdapter } from '../src/encrypted-adapter';

/**
 * Mock adapter for testing
 */
class MockAdapter {
  private data: Record<string, any[]> = {};

  async save(data: Record<string, any[]>): Promise<void> {
    this.data = data;
  }

  async load(): Promise<Record<string, any[]>> {
    return this.data;
  }

  getData(): Record<string, any[]> {
    return this.data;
  }
}

describe('EncryptedAdapter', () => {
  let mockAdapter: MockAdapter;
  let encryptedAdapter: EncryptedAdapter;

  beforeEach(() => {
    mockAdapter = new MockAdapter();
    encryptedAdapter = createEncryptedAdapter({
      adapter: mockAdapter as any,
      password: 'test-password'
    });
  });

  describe('basic encryption', () => {
    it('should encrypt data on save', async () => {
      const data = {
        users: [
          { id: '1', name: 'Alice', email: 'alice@example.com' },
          { id: '2', name: 'Bob', email: 'bob@example.com' }
        ]
      };

      await encryptedAdapter.save(data);

      const stored = mockAdapter.getData().users;
      expect(stored).toHaveLength(2);

      // Data should be encrypted
      expect(stored[0]).toBeDefined();
      expect(stored[0].__encryption_metadata__).toBeDefined();
      expect(stored[0].__encryption_metadata__.data).toBeTruthy();
    });

    it('should decrypt data on load', async () => {
      const originalData = {
        users: [
          { id: '1', name: 'Alice', email: 'alice@example.com' }
        ]
      };

      await encryptedAdapter.save(originalData);
      const loaded = await encryptedAdapter.load();

      expect(loaded.users).toHaveLength(1);
      expect(loaded.users[0].id).toBe('1');
      expect(loaded.users[0].name).toBe('Alice');
      expect(loaded.users[0].email).toBe('alice@example.com');
    });

    it('should handle empty collections', async () => {
      await encryptedAdapter.save({ users: [] });
      const loaded = await encryptedAdapter.load();

      expect(loaded.users).toEqual([]);
    });
  });

  describe('collection filtering', () => {
    it('should encrypt specified collections only', async () => {
      const encryptedAdapter2 = createEncryptedAdapter({
        adapter: mockAdapter as any,
        password: 'test-password',
        encryptedCollections: ['sensitive']
      });

      const data = {
        sensitive: [{ id: '1', secret: 'value' }],
        public: [{ id: '1', public: 'value' }]
      };

      await encryptedAdapter2.save(data);

      const stored = mockAdapter.getData();

      // Sensitive should be encrypted
      expect(stored.sensitive[0].__encryption_metadata__).toBeDefined();

      // Public should NOT be encrypted
      expect(stored.public[0].__encryption_metadata__).toBeUndefined();
    });

    it('should exclude specified collections', async () => {
      const encryptedAdapter2 = createEncryptedAdapter({
        adapter: mockAdapter as any,
        password: 'test-password',
        excludeCollections: ['logs']
      });

      const data = { logs: [{ id: '1', message: 'log entry' }] };

      await encryptedAdapter2.save(data);

      const stored = mockAdapter.getData().logs;
      // Should not be encrypted
      expect(stored[0].__encryption_metadata__).toBeUndefined();
    });

    it('should encrypt all collections by default', async () => {
      const data = {
        collection1: [{ id: '1', data: 'value' }],
        collection2: [{ id: '1', data: 'value' }]
      };

      await encryptedAdapter.save(data);

      const stored = mockAdapter.getData();
      expect(stored.collection1[0].__encryption_metadata__).toBeDefined();
      expect(stored.collection2[0].__encryption_metadata__).toBeDefined();
    });
  });

  describe('data integrity', () => {
    it('should preserve document structure after encryption/decryption', async () => {
      const originalData = {
        users: [
          {
            id: '1',
            name: 'Alice',
            address: {
              street: '123 Main St',
              city: 'Springfield'
            },
            tags: ['admin', 'user'],
            age: 30,
            active: true
          }
        ]
      };

      await encryptedAdapter.save(originalData);
      const loaded = await encryptedAdapter.load();

      expect(loaded.users[0]).toEqual(originalData.users[0]);
    });

    it('should handle null and undefined values', async () => {
      const originalData = {
        users: [
          {
            id: '1',
            name: 'Alice',
            phone: null,
            middleName: undefined,
            email: 'alice@example.com'
          }
        ]
      };

      await encryptedAdapter.save(originalData);
      const loaded = await encryptedAdapter.load();

      expect(loaded.users[0].phone).toBeNull();
      expect(loaded.users[0].middleName).toBeUndefined();
    });

    it('should handle special characters', async () => {
      const originalData = {
        data: [
          {
            id: '1',
            text: 'Special chars: !@#$%^&*()_+-=[]{}|;:",.<>?/~`'
          }
        ]
      };

      await encryptedAdapter.save(originalData);
      const loaded = await encryptedAdapter.load();

      expect(loaded.data[0].text).toBe(originalData.data[0].text);
    });

    it('should handle unicode characters', async () => {
      const originalData = {
        users: [
          {
            id: '1',
            name: '张三',
            emoji: '🎉🚀',
            arabic: 'مرحبا'
          }
        ]
      };

      await encryptedAdapter.save(originalData);
      const loaded = await encryptedAdapter.load();

      expect(loaded.users[0]).toEqual(originalData.users[0]);
    });
  });

  describe('different passwords', () => {
    it('should not decrypt with wrong password', async () => {
      const data = { users: [{ id: '1', secret: 'password123' }] };

      await encryptedAdapter.save(data);

      // Create adapter with different password but same data
      const wrongPasswordAdapter = createEncryptedAdapter({
        adapter: mockAdapter as any,
        password: 'wrong-password'
      });

      await expect(wrongPasswordAdapter.load()).rejects.toThrow();
    });
  });

  describe('salt persistence', () => {
    it('should provide salt for key recovery', () => {
      const salt = encryptedAdapter.getSalt();

      expect(salt).toBeDefined();
      expect(salt).toBeInstanceOf(Buffer);
      expect(salt.length).toBeGreaterThan(0);
    });

    it('should use consistent salt for same adapter', () => {
      const salt1 = encryptedAdapter.getSalt();
      const salt2 = encryptedAdapter.getSalt();

      expect(salt1.toString('hex')).toBe(salt2.toString('hex'));
    });
  });

  describe('non-encrypted collections fallthrough', () => {
    it('should pass through non-encrypted data as-is', async () => {
      const encryptedAdapter2 = createEncryptedAdapter({
        adapter: mockAdapter as any,
        password: 'test-password',
        encryptedCollections: ['sensitive']
      });

      const data = { public: [{ id: '1', public: 'data' }] };

      await encryptedAdapter2.save(data);

      const stored = mockAdapter.getData().public;
      expect(stored[0]).toEqual(data.public[0]);
    });
  });

  describe('factory function', () => {
    it('should create adapter from factory', () => {
      const mockAdapter2 = new MockAdapter();
      const adapter = createEncryptedAdapter({
        adapter: mockAdapter2 as any,
        password: 'factory-test'
      });

      expect(adapter).toBeInstanceOf(EncryptedAdapter);
    });
  });
});
