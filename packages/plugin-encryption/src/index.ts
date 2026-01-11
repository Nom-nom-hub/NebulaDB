/**
 * NebulaDB Encryption Plugin
 * 
 * Provides transparent encryption at rest and field-level encryption
 */

export { CryptoUtil, createCryptoUtil } from './crypto';
export type { EncryptionOptions, EncryptedData } from './crypto';

export { EncryptedAdapter, createEncryptedAdapter } from './encrypted-adapter';
export type { EncryptedAdapterOptions } from './encrypted-adapter';

export { createFieldEncryptionPlugin } from './field-encryption-plugin';
export type { FieldEncryptionConfig, FieldEncryptionPluginOptions } from './field-encryption-plugin';
