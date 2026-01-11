import { Adapter } from '@nebula-db/core';
import { CryptoUtil, EncryptedData, EncryptionOptions } from './crypto';

/**
 * Encrypted adapter wrapper options
 */
export interface EncryptedAdapterOptions extends EncryptionOptions {
  /**
   * Underlying adapter to wrap
   */
  adapter: Adapter;

  /**
   * Collections to encrypt (empty = all)
   */
  encryptedCollections?: string[];

  /**
   * Exclude collections from encryption
   */
  excludeCollections?: string[];
}

/**
 * Wraps an adapter with transparent encryption/decryption
 */
export class EncryptedAdapter implements Adapter {
  private crypto: CryptoUtil;
  private innerAdapter: Adapter;
  private encryptedCollections: Set<string>;
  private excludeCollections: Set<string>;
  private encryptionMetadataKey = '__encryption_metadata__';

  constructor(options: EncryptedAdapterOptions) {
    this.crypto = new CryptoUtil({
      password: options.password,
      algorithm: options.algorithm,
      iterations: options.iterations,
      hashAlgorithm: options.hashAlgorithm,
      salt: options.salt
    });

    this.innerAdapter = options.adapter as Adapter;
    this.encryptedCollections = new Set(options.encryptedCollections || []);
    this.excludeCollections = new Set(options.excludeCollections || []);
  }

  /**
   * Check if collection should be encrypted
   */
  private shouldEncrypt(collectionName: string): boolean {
    // If exclude list has it, don't encrypt
    if (this.excludeCollections.has(collectionName)) {
      return false;
    }

    // If encrypted collections is empty, encrypt all (except excluded)
    if (this.encryptedCollections.size === 0) {
      return true;
    }

    // Otherwise only encrypt if in the list
    return this.encryptedCollections.has(collectionName);
  }

  /**
   * Encrypt document
   */
  private encryptDocument(doc: any): any {
    if (!doc || typeof doc !== 'object') {
      return doc;
    }

    try {
      const encrypted = this.crypto.encrypt(JSON.stringify(doc));
      return {
        [this.encryptionMetadataKey]: encrypted
      };
    } catch (error) {
      throw new Error(`Failed to encrypt document: ${error}`);
    }
  }

  /**
   * Decrypt document
   */
  private decryptDocument(doc: any): any {
    if (!doc || typeof doc !== 'object') {
      return doc;
    }

    // Check if document is encrypted
    if (!(this.encryptionMetadataKey in doc)) {
      return doc;
    }

    try {
      const encrypted = doc[this.encryptionMetadataKey] as EncryptedData;
      return this.crypto.decryptJSON(encrypted);
    } catch (error) {
      throw new Error(`Failed to decrypt document: ${error}`);
    }
  }

  /**
   * Encrypt collection data
   */
  private encryptCollectionData(collectionName: string, data: any[]): any[] {
    if (!this.shouldEncrypt(collectionName)) {
      return data;
    }

    return data.map(doc => this.encryptDocument(doc));
  }

  /**
   * Decrypt collection data
   */
  private decryptCollectionData(collectionName: string, data: any[]): any[] {
    if (!this.shouldEncrypt(collectionName)) {
      return data;
    }

    return data.map(doc => this.decryptDocument(doc));
  }

  /**
   * Save data
   */
  async save(data: Record<string, any[]>): Promise<void> {
    const encrypted: Record<string, any[]> = {};

    for (const [collectionName, collectionData] of Object.entries(data)) {
      encrypted[collectionName] = this.encryptCollectionData(collectionName, collectionData);
    }

    await this.innerAdapter.save(encrypted);
  }

  /**
   * Load data
   */
  async load(): Promise<Record<string, any[]>> {
    const encrypted = await this.innerAdapter.load();
    const decrypted: Record<string, any[]> = {};

    for (const [collectionName, collectionData] of Object.entries(encrypted)) {
      decrypted[collectionName] = this.decryptCollectionData(collectionName, collectionData);
    }

    return decrypted;
  }

  /**
   * Get salt (for key recovery)
   */
  getSalt(): Buffer {
    return this.crypto.getSalt();
  }
}

/**
 * Create an encrypted adapter
 */
export function createEncryptedAdapter(options: EncryptedAdapterOptions): EncryptedAdapter {
  return new EncryptedAdapter(options);
}
