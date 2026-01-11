import { Plugin, Document } from '@nebula-db/core';
import { CryptoUtil, EncryptedData } from './crypto';

/**
 * Field encryption configuration
 */
export interface FieldEncryptionConfig {
  /**
   * Field name to encrypt
   */
  field: string;

  /**
   * Whether field is searchable (uses hashing instead)
   */
  searchable?: boolean;

  /**
   * Nested field path (e.g., 'address.street')
   */
  nestedPath?: boolean;
}

/**
 * Field encryption plugin options
 */
export interface FieldEncryptionPluginOptions {
  /**
   * Password for encryption
   */
  password: string;

  /**
   * Fields to encrypt
   */
  fields: FieldEncryptionConfig[];

  /**
   * Collections to apply to (empty = all)
   */
  collections?: string[];

  /**
   * Exclude collections
   */
  excludeCollections?: string[];

  /**
   * Logging
   */
  logging?: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
  };
}

/**
 * Field-level encryption plugin
 */
export function createFieldEncryptionPlugin(
  options: FieldEncryptionPluginOptions
): Plugin {
  const crypto = new CryptoUtil({ password: options.password });
  const fieldConfigs = new Map<string, FieldEncryptionConfig>();
  const collections = new Set(options.collections || []);
  const excludeCollections = new Set(options.excludeCollections || []);

  // Build field config map
  for (const config of options.fields) {
    fieldConfigs.set(config.field, config);
  }

  const logging = options.logging ?? { enabled: false, level: 'info' as const };

  function log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any) {
    if (!logging.enabled) return;

    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    if (levels[level] >= levels[logging.level]) {
      const msg = `[FieldEncryption] ${message}`;
      console.log(`[${level.toUpperCase()}] ${msg}`, data || '');
    }
  }

  function shouldEncryptCollection(collectionName: string): boolean {
    if (excludeCollections.has(collectionName)) return false;
    if (collections.size === 0) return true;
    return collections.has(collectionName);
  }

  function encryptField(value: any, config: FieldEncryptionConfig): any {
    if (value === null || value === undefined) return value;

    if (config.searchable) {
      // For searchable fields, use hash instead of encryption
      return CryptoUtil.hash(String(value));
    }

    // Encrypt the field value
    try {
      const encrypted = crypto.encrypt(String(value));
      return {
        __encrypted: true,
        ...encrypted
      };
    } catch (error) {
      log('error', `Failed to encrypt field ${config.field}`, error);
      return value;
    }
  }

  function decryptField(value: any, config: FieldEncryptionConfig): any {
    if (value === null || value === undefined) return value;

    if (config.searchable) {
      // Searchable fields are hashed, can't decrypt
      return value;
    }

    if (typeof value !== 'object' || !value.__encrypted) {
      return value;
    }

    try {
      return crypto.decrypt(value as EncryptedData);
    } catch (error) {
      log('error', `Failed to decrypt field ${config.field}`, error);
      return value;
    }
  }

  function encryptDocument(doc: Document): Document {
    const encrypted = { ...doc };

    for (const [fieldName, config] of fieldConfigs) {
      if (fieldName in encrypted) {
        const value = encrypted[fieldName];

        if (config.nestedPath) {
          // Handle nested paths like 'address.street'
          const parts = fieldName.split('.');
          let current = encrypted;

          for (let i = 0; i < parts.length - 1; i++) {
            if (!(parts[i] in current)) break;
            current = current[parts[i]];
          }

          if (current && typeof current === 'object') {
            const lastPart = parts[parts.length - 1];
            current[lastPart] = encryptField(current[lastPart], config);
          }
        } else {
          encrypted[fieldName] = encryptField(value, config);
        }
      }
    }

    return encrypted;
  }

  function decryptDocument(doc: Document): Document {
    const decrypted = { ...doc };

    for (const [fieldName, config] of fieldConfigs) {
      if (fieldName in decrypted) {
        const value = decrypted[fieldName];

        if (config.nestedPath) {
          // Handle nested paths
          const parts = fieldName.split('.');
          let current = decrypted;

          for (let i = 0; i < parts.length - 1; i++) {
            if (!(parts[i] in current)) break;
            current = current[parts[i]];
          }

          if (current && typeof current === 'object') {
            const lastPart = parts[parts.length - 1];
            current[lastPart] = decryptField(current[lastPart], config);
          }
        } else {
          decrypted[fieldName] = decryptField(value, config);
        }
      }
    }

    return decrypted;
  }

  return {
    name: 'field-encryption',

    onBeforeInsert: (collectionName, doc) => {
      if (!shouldEncryptCollection(collectionName)) return doc;

      log('debug', `Encrypting fields in insert for ${collectionName}`);
      return encryptDocument(doc);
    },

    onAfterQuery: (collectionName: string, query: any, results: any[]) => {
      if (!shouldEncryptCollection(collectionName)) return results;

      log('debug', `Decrypting fields in query for ${collectionName}`);
      return results.map((doc: any) => decryptDocument(doc));
    },

    onBeforeUpdate: (collectionName: string, query: any, update: any) => {
      if (!shouldEncryptCollection(collectionName)) {
        return [query, update];
      }

      // Encrypt values in $set operations
      const encrypted = { ...update };

      if (encrypted.$set) {
        encrypted.$set = encryptDocument(encrypted.$set as Document) as any;
      }

      log('debug', `Encrypting fields in update for ${collectionName}`);
      return [query, encrypted];
    },

    onAfterDelete: (collectionName, query, deletedCount) => {
      log('debug', `Deleted ${deletedCount} documents from ${collectionName}`);
    }
  };
}
