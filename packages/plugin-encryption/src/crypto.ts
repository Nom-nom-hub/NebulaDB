import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';

/**
 * Encryption options
 */
export interface EncryptionOptions {
  /**
   * Password/passphrase
   */
  password: string;

  /**
   * Algorithm (default: aes-256-gcm)
   */
  algorithm?: string;

  /**
   * Key iterations for PBKDF2 (default: 100000)
   */
  iterations?: number;

  /**
   * Hash algorithm for PBKDF2 (default: sha256)
   */
  hashAlgorithm?: string;

  /**
   * Salt for key derivation (default: random)
   */
  salt?: Buffer;
}

/**
 * Encrypted data with metadata
 */
export interface EncryptedData {
  /**
   * IV (initialization vector)
   */
  iv: string;

  /**
   * Auth tag for GCM
   */
  authTag: string;

  /**
   * Encrypted data (base64)
   */
  data: string;

  /**
   * Salt used (base64)
   */
  salt: string;

  /**
   * Algorithm used
   */
  algorithm: string;

  /**
   * Key iterations
   */
  iterations: number;

  /**
   * Hash algorithm used
   */
  hashAlgorithm: string;

  /**
   * Version
   */
  version: number;
}

/**
 * Crypto utility class
 */
export class CryptoUtil {
  private password: string;
  private algorithm: string;
  private iterations: number;
  private hashAlgorithm: string;
  private salt: Buffer;

  constructor(options: EncryptionOptions) {
    this.password = options.password;
    this.algorithm = options.algorithm ?? 'aes-256-gcm';
    this.iterations = options.iterations ?? 100000;
    this.hashAlgorithm = options.hashAlgorithm ?? 'sha256';
    this.salt = options.salt ?? randomBytes(32);

    if (!this.password) {
      throw new Error('Password is required for encryption');
    }
  }

  /**
   * Get salt (for saving)
   */
  getSalt(): Buffer {
    return this.salt;
  }

  /**
   * Derive encryption key from password
   */
  private deriveKey(): Buffer {
    const keyLength = this.algorithm === 'aes-256-gcm' ? 32 : 16;
    return pbkdf2Sync(this.password, this.salt, this.iterations, keyLength, this.hashAlgorithm);
  }

  /**
   * Encrypt data
   */
  encrypt(data: string | Buffer | object): EncryptedData {
    const key = this.deriveKey();
    const iv = randomBytes(16);

    // Convert data to buffer if needed
    let buffer: Buffer;
    if (typeof data === 'string') {
      buffer = Buffer.from(data, 'utf8');
    } else if (Buffer.isBuffer(data)) {
      buffer = data;
    } else {
      buffer = Buffer.from(JSON.stringify(data), 'utf8');
    }

    // Create cipher
    const cipher = createCipheriv(this.algorithm, key, iv);

    // Encrypt
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);

    // Get auth tag (for GCM)
    const authTag = (cipher as any).getAuthTag();

    return {
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      data: encrypted.toString('base64'),
      salt: this.salt.toString('base64'),
      algorithm: this.algorithm,
      iterations: this.iterations,
      hashAlgorithm: this.hashAlgorithm,
      version: 1
    };
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData: EncryptedData): string {
    // Validate version
    if (encryptedData.version !== 1) {
      throw new Error(`Unsupported encryption version: ${encryptedData.version}`);
    }

    // Validate algorithm matches
    if (encryptedData.algorithm !== this.algorithm) {
      throw new Error(
        `Algorithm mismatch: expected ${this.algorithm}, got ${encryptedData.algorithm}`
      );
    }

    const key = this.deriveKey();
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');
    const encrypted = Buffer.from(encryptedData.data, 'base64');

    // Create decipher
    const decipher = createDecipheriv(this.algorithm, key, iv);
    (decipher as any).setAuthTag(authTag);

    // Decrypt
    try {
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error('Decryption failed: invalid key or corrupted data');
    }
  }

  /**
   * Decrypt and parse JSON
   */
  decryptJSON<T = any>(encryptedData: EncryptedData): T {
    const decrypted = this.decrypt(encryptedData);
    try {
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error('Failed to parse decrypted JSON');
    }
  }

  /**
   * Hash a string (for searchable encryption)
   */
  static hash(value: string, salt: string = ''): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(value + salt);
    return hash.digest('hex');
  }

  /**
   * Generate random key
   */
  static generateKey(length: number = 32): Buffer {
    return randomBytes(length);
  }

  /**
   * Generate random IV
   */
  static generateIV(length: number = 16): Buffer {
    return randomBytes(length);
  }
}

/**
 * Create a crypto utility from password
 */
export function createCryptoUtil(password: string, options?: Partial<EncryptionOptions>): CryptoUtil {
  return new CryptoUtil({
    password,
    ...options
  });
}
