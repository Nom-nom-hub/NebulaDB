import { Plugin, Document } from '@nebula/core';

/**
 * Options for the encryption plugin
 */
export interface EncryptionPluginOptions {
  encryptionKey: string;
  fields?: Record<string, string[]>; // Collection name -> fields to encrypt
  encryptAll?: boolean;
}

/**
 * Simple encryption/decryption functions
 * Note: This is a simplified implementation for demonstration purposes.
 * In a real-world scenario, use a proper encryption library.
 */
function encrypt(value: string, key: string): string {
  // Simple XOR encryption for demonstration
  // DO NOT use this in production!
  let result = '';
  for (let i = 0; i < value.length; i++) {
    result += String.fromCharCode(value.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return Buffer.from(result).toString('base64');
}

function decrypt(value: string, key: string): string {
  // Simple XOR decryption for demonstration
  // DO NOT use this in production!
  const decoded = Buffer.from(value, 'base64').toString();
  let result = '';
  for (let i = 0; i < decoded.length; i++) {
    result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

/**
 * Process a document for encryption or decryption
 */
function processDocument(
  doc: Document,
  key: string,
  fieldsToProcess: string[] | undefined,
  processAll: boolean,
  operation: 'encrypt' | 'decrypt'
): Document {
  const result = { ...doc };
  
  const processValue = (value: any, field: string): any => {
    if (value === null || value === undefined) {
      return value;
    }
    
    if (typeof value === 'object' && !Array.isArray(value)) {
      return processDocument(value, key, fieldsToProcess, processAll, operation);
    }
    
    if (Array.isArray(value)) {
      return value.map(item => {
        if (typeof item === 'object' && item !== null) {
          return processDocument(item, key, fieldsToProcess, processAll, operation);
        }
        return item;
      });
    }
    
    if (typeof value === 'string' && (processAll || (fieldsToProcess && fieldsToProcess.includes(field)))) {
      return operation === 'encrypt' ? encrypt(value, key) : decrypt(value, key);
    }
    
    return value;
  };
  
  for (const [field, value] of Object.entries(result)) {
    if (field === 'id') continue; // Never encrypt the id field
    result[field] = processValue(value, field);
  }
  
  return result;
}

/**
 * Create an encryption plugin for NebulaDB
 */
export function createEncryptionPlugin(options: EncryptionPluginOptions): Plugin {
  const { encryptionKey, fields = {}, encryptAll = false } = options;
  
  return {
    name: 'encryption',
    
    async onBeforeInsert(collection: string, doc: Document): Promise<Document> {
      const fieldsToEncrypt = fields[collection];
      return processDocument(doc, encryptionKey, fieldsToEncrypt, encryptAll, 'encrypt');
    },
    
    async onAfterQuery(collection: string, query: any, results: Document[]): Promise<Document[]> {
      const fieldsToDecrypt = fields[collection];
      return results.map(doc => 
        processDocument(doc, encryptionKey, fieldsToDecrypt, encryptAll, 'decrypt')
      );
    }
  };
}
