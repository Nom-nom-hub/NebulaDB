import { describe, it, expect, beforeEach } from 'vitest';
import { CryptoUtil, createCryptoUtil } from '../src/crypto';

describe('CryptoUtil', () => {
  let crypto: CryptoUtil;

  beforeEach(() => {
    crypto = new CryptoUtil({ password: 'test-password' });
  });

  describe('encryption and decryption', () => {
    it('should encrypt and decrypt string data', () => {
      const plaintext = 'Hello, World!';
      const encrypted = crypto.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted.data).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();

      const decrypted = crypto.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt buffer data', () => {
      const plaintext = Buffer.from('Binary data');
      const encrypted = crypto.encrypt(plaintext);

      const decrypted = Buffer.from(crypto.decrypt(encrypted), 'utf8');
      expect(decrypted.toString()).toBe(plaintext.toString());
    });

    it('should encrypt and decrypt JSON objects', () => {
      const obj = { name: 'Alice', age: 30, email: 'alice@example.com' };
      const encrypted = crypto.encrypt(obj);

      const decrypted = crypto.decryptJSON(encrypted);
      expect(decrypted).toEqual(obj);
    });

    it('should handle nested objects', () => {
      const obj = {
        user: {
          name: 'Alice',
          address: {
            street: '123 Main St',
            city: 'Springfield'
          }
        }
      };

      const encrypted = crypto.encrypt(obj);
      const decrypted = crypto.decryptJSON(encrypted);

      expect(decrypted).toEqual(obj);
    });

    it('should handle arrays in objects', () => {
      const obj = {
        name: 'Alice',
        tags: ['admin', 'user', 'developer']
      };

      const encrypted = crypto.encrypt(obj);
      const decrypted = crypto.decryptJSON(encrypted);

      expect(decrypted).toEqual(obj);
    });
  });

  describe('different passwords', () => {
    it('should fail with wrong password', () => {
      const crypto1 = new CryptoUtil({ password: 'password1' });
      const crypto2 = new CryptoUtil({ password: 'password2', salt: crypto1.getSalt() });

      const encrypted = crypto1.encrypt('secret data');

      expect(() => {
        crypto2.decrypt(encrypted);
      }).toThrow('Decryption failed');
    });

    it('should decrypt with correct password after salt reuse', () => {
      const crypto1 = new CryptoUtil({ password: 'my-password' });
      const salt = crypto1.getSalt();

      const encrypted = crypto1.encrypt('secret data');

      // Create new instance with same password and salt
      const crypto2 = new CryptoUtil({ password: 'my-password', salt });

      const decrypted = crypto2.decrypt(encrypted);
      expect(decrypted).toBe('secret data');
    });
  });

  describe('encryption metadata', () => {
    it('should include algorithm in encrypted data', () => {
      const encrypted = crypto.encrypt('test');

      expect(encrypted.algorithm).toBe('aes-256-gcm');
      expect(encrypted.version).toBe(1);
      expect(encrypted.iterations).toBe(100000);
      expect(encrypted.hashAlgorithm).toBe('sha256');
    });

    it('should store salt in encrypted data', () => {
      const encrypted = crypto.encrypt('test');

      expect(encrypted.salt).toBeDefined();
      expect(encrypted.salt).toBeTruthy();
    });

    it('should reject mismatched algorithm', () => {
      const encrypted = crypto.encrypt('test');
      encrypted.algorithm = 'aes-128-gcm';

      expect(() => {
        crypto.decrypt(encrypted);
      }).toThrow('Algorithm mismatch');
    });

    it('should reject unsupported version', () => {
      const encrypted = crypto.encrypt('test');
      encrypted.version = 999;

      expect(() => {
        crypto.decrypt(encrypted);
      }).toThrow('Unsupported encryption version');
    });
  });

  describe('static methods', () => {
    it('should hash values consistently', () => {
      const value = 'test-value';
      const hash1 = CryptoUtil.hash(value);
      const hash2 = CryptoUtil.hash(value);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different values', () => {
      const hash1 = CryptoUtil.hash('value1');
      const hash2 = CryptoUtil.hash('value2');

      expect(hash1).not.toBe(hash2);
    });

    it('should hash with salt', () => {
      const value = 'test';
      const salt = 'my-salt';
      const hash1 = CryptoUtil.hash(value, salt);
      const hash2 = CryptoUtil.hash(value);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate random keys', () => {
      const key1 = CryptoUtil.generateKey(32);
      const key2 = CryptoUtil.generateKey(32);

      expect(key1).toHaveLength(32);
      expect(key2).toHaveLength(32);
      expect(key1.toString()).not.toBe(key2.toString());
    });

    it('should generate random IVs', () => {
      const iv1 = CryptoUtil.generateIV();
      const iv2 = CryptoUtil.generateIV();

      expect(iv1).toHaveLength(16);
      expect(iv2).toHaveLength(16);
      expect(iv1.toString()).not.toBe(iv2.toString());
    });
  });

  describe('custom options', () => {
    it('should use custom iterations', () => {
      const customCrypto = new CryptoUtil({
        password: 'test',
        iterations: 50000
      });

      const encrypted = customCrypto.encrypt('test');
      expect(encrypted.iterations).toBe(50000);
    });

    it('should use custom hash algorithm', () => {
      const customCrypto = new CryptoUtil({
        password: 'test',
        hashAlgorithm: 'sha512'
      });

      const encrypted = customCrypto.encrypt('test');
      expect(encrypted.hashAlgorithm).toBe('sha512');
    });
  });

  describe('error handling', () => {
    it('should throw on missing password', () => {
      expect(() => {
        new CryptoUtil({ password: '' });
      }).toThrow('Password is required');
    });

    it('should throw on corrupted data', () => {
      const encrypted = crypto.encrypt('test');
      encrypted.data = 'corrupted-data';

      expect(() => {
        crypto.decrypt(encrypted);
      }).toThrow('Decryption failed');
    });

    it('should throw on tampered auth tag', () => {
      const encrypted = crypto.encrypt('test');
      const authBuffer = Buffer.from(encrypted.authTag, 'base64');
      authBuffer[0] = authBuffer[0] ^ 0xff; // Flip bits
      encrypted.authTag = authBuffer.toString('base64');

      expect(() => {
        crypto.decrypt(encrypted);
      }).toThrow('Decryption failed');
    });
  });

  describe('createCryptoUtil factory', () => {
    it('should create util from factory function', () => {
      const util = createCryptoUtil('password');

      expect(util).toBeInstanceOf(CryptoUtil);
      expect(util.encrypt('test')).toBeDefined();
    });

    it('should pass options to factory', () => {
      const util = createCryptoUtil('password', {
        iterations: 50000,
        hashAlgorithm: 'sha512'
      });

      const encrypted = util.encrypt('test');
      expect(encrypted.iterations).toBe(50000);
      expect(encrypted.hashAlgorithm).toBe('sha512');
    });

    it('should accept salt in factory options', () => {
      const salt = CryptoUtil.generateKey(32);
      const util = createCryptoUtil('password', { salt });

      expect(util.getSalt().toString('hex')).toBe(salt.toString('hex'));
    });
  });

  describe('large data', () => {
    it('should encrypt large strings', () => {
      const largeData = 'x'.repeat(1000000); // 1MB
      const encrypted = crypto.encrypt(largeData);

      const decrypted = crypto.decrypt(encrypted);
      expect(decrypted).toBe(largeData);
    });

    it('should encrypt large objects', () => {
      const obj: any = {};
      for (let i = 0; i < 10000; i++) {
        obj[`key${i}`] = {
          value: `value${i}`,
          timestamp: Date.now()
        };
      }

      const encrypted = crypto.encrypt(obj);
      const decrypted = crypto.decryptJSON(encrypted);

      expect(Object.keys(decrypted)).toHaveLength(10000);
      expect(decrypted.key0.value).toBe('value0');
    });
  });

  describe('key rotation scenarios', () => {
    it('should create crypto with explicit salt for key recovery', () => {
      const salt = CryptoUtil.generateKey(32);
      const crypto1 = new CryptoUtil({ password: 'my-password', salt });

      const encrypted = crypto1.encrypt('secret data');

      // Recreate with same salt (simulating key recovery)
      const crypto2 = new CryptoUtil({ password: 'my-password', salt });
      const decrypted = crypto2.decrypt(encrypted);
      expect(decrypted).toBe('secret data');
    });

    it('should fail decryption after password change without salt migration', () => {
      const oldCrypto = new CryptoUtil({ password: 'old-password' });
      const encrypted = oldCrypto.encrypt('sensitive data');

      const newCrypto = new CryptoUtil({ password: 'new-password' });
      expect(() => newCrypto.decrypt(encrypted)).toThrow('Decryption failed');
    });

    it('should support re-encrypting data during key rotation', () => {
      // Old key
      const oldCrypto = new CryptoUtil({ password: 'old-key' });
      const oldSalt = oldCrypto.getSalt();
      const encrypted = oldCrypto.encrypt('migrate me');

      // Decrypt with old key
      const oldCrypto2 = new CryptoUtil({ password: 'old-key', salt: oldSalt });
      const plaintext = oldCrypto2.decrypt(encrypted);

      // Re-encrypt with new key
      const newCrypto = new CryptoUtil({ password: 'new-key' });
      const reEncrypted = newCrypto.encrypt(plaintext);

      // Verify new key works
      const newCrypto2 = new CryptoUtil({
        password: 'new-key',
        salt: newCrypto.getSalt()
      });
      const decrypted = newCrypto2.decrypt(reEncrypted);
      expect(decrypted).toBe('migrate me');
    });

    it('should handle multiple key rotations', () => {
      let salt: Buffer;
      let encrypted: any;
      let plaintext = 'data-through-multiple-rotations';

      // Key version 1
      const v1 = new CryptoUtil({ password: 'key-v1' });
      salt = v1.getSalt();
      encrypted = v1.encrypt(plaintext);

      // Decrypt with v1, re-encrypt with v2
      const v1Reader = new CryptoUtil({ password: 'key-v1', salt });
      plaintext = v1Reader.decrypt(encrypted);

      const v2 = new CryptoUtil({ password: 'key-v2' });
      salt = v2.getSalt();
      encrypted = v2.encrypt(plaintext);

      // Decrypt with v2, re-encrypt with v3
      const v2Reader = new CryptoUtil({ password: 'key-v2', salt });
      plaintext = v2Reader.decrypt(encrypted);

      const v3 = new CryptoUtil({ password: 'key-v3' });
      encrypted = v3.encrypt(plaintext);

      // Final verification
      const v3Reader = new CryptoUtil({ password: 'key-v3', salt: v3.getSalt() });
      expect(v3Reader.decrypt(encrypted)).toBe('data-through-multiple-rotations');
    });

    it('should generate unique salt for each crypto instance', () => {
      const crypto1 = new CryptoUtil({ password: 'test' });
      const crypto2 = new CryptoUtil({ password: 'test' });

      expect(crypto1.getSalt().toString('hex')).not.toBe(crypto2.getSalt().toString('hex'));
    });
  });

  describe('searchable encryption (hashing)', () => {
    it('should produce deterministic hashes', () => {
      const hash1 = CryptoUtil.hash('search-term');
      const hash2 = CryptoUtil.hash('search-term');

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = CryptoUtil.hash('term-a');
      const hash2 = CryptoUtil.hash('term-b');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes with different salts', () => {
      const hash1 = CryptoUtil.hash('value', 'salt-a');
      const hash2 = CryptoUtil.hash('value', 'salt-b');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce consistent hashes with same salt', () => {
      const hash1 = CryptoUtil.hash('value', 'my-salt');
      const hash2 = CryptoUtil.hash('value', 'my-salt');

      expect(hash1).toBe(hash2);
    });

    it('should handle empty strings', () => {
      const hash1 = CryptoUtil.hash('');
      const hash2 = CryptoUtil.hash('');

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(64);
    });

    it('should handle special characters', () => {
      const hash = CryptoUtil.hash('hello world!@#$%^&*()');

      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64);
    });

    it('should handle unicode characters', () => {
      const hash = CryptoUtil.hash('你好世界 🎉');

      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64);
    });

    it('should hash consistently for long strings', () => {
      const long = 'a'.repeat(10000);
      const hash1 = CryptoUtil.hash(long);
      const hash2 = CryptoUtil.hash(long);

      expect(hash1).toBe(hash2);
    });

    it('should hash case-sensitively by default', () => {
      const hashLower = CryptoUtil.hash('test');
      const hashUpper = CryptoUtil.hash('TEST');

      expect(hashLower).not.toBe(hashUpper);
    });
  });

  describe('concurrent operations', () => {
    it('should handle multiple concurrent encryptions', async () => {
      const promises = Array.from({ length: 50 }, (_, i) => {
        const c = new CryptoUtil({ password: `pass-${i}` });
        return Promise.resolve(c.encrypt(`data-${i}`));
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(50);
      results.forEach((r, i) => {
        expect(r.data).toBeTruthy();
        expect(r.algorithm).toBe('aes-256-gcm');
      });
    });

    it('should handle concurrent encrypt/decrypt on same instance', async () => {
      const shared = new CryptoUtil({ password: 'shared' });

      const encrypted = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          Promise.resolve(shared.encrypt(`data-${i}`))
        )
      );

      const decrypted = await Promise.all(
        encrypted.map(e => Promise.resolve(shared.decrypt(e)))
      );

      decrypted.forEach((d, i) => {
        expect(d).toBe(`data-${i}`);
      });
    });
  });
});
