import { Document } from './types';
import * as zlib from 'zlib';

/**
 * Compression options
 */
export interface CompressionOptions {
  enabled: boolean;
  threshold: number; // Size in bytes above which to compress
  level: number; // Compression level (1-9)
  fields?: string[]; // Specific fields to compress, if empty compress the whole document
}

/**
 * Document with compression metadata
 */
interface CompressedDocument extends Document {
  __compressed?: {
    fields: string[];
    originalSize: number;
  };
}

/**
 * Document compression utility
 */
export class DocumentCompression {
  private options: CompressionOptions;
  
  constructor(options: Partial<CompressionOptions> = {}) {
    this.options = {
      enabled: options.enabled ?? false,
      threshold: options.threshold ?? 1024, // Default: 1KB
      level: options.level ?? 6, // Default: level 6 (good balance)
      fields: options.fields ?? []
    };
  }
  
  /**
   * Compress a document if it meets the threshold
   */
  compress(doc: Document): Document {
    if (!this.options.enabled) {
      return doc;
    }
    
    const result: CompressedDocument = { ...doc };
    const compressedFields: string[] = [];
    
    // Determine which fields to compress
    const fieldsToCompress = this.options.fields?.length 
      ? this.options.fields 
      : Object.keys(doc).filter(key => key !== 'id');
    
    let originalSize = 0;
    
    // Compress each field that meets the threshold
    for (const field of fieldsToCompress) {
      if (field === 'id' || field === '__compressed') continue;
      
      const value = doc[field];
      if (value === undefined || value === null) continue;
      
      // Skip small primitive values
      if (typeof value !== 'object' && typeof value !== 'string') continue;
      
      // Convert to string and check size
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      const valueSize = Buffer.byteLength(stringValue, 'utf8');
      
      if (valueSize >= this.options.threshold) {
        // Compress the value
        const compressed = this.compressValue(stringValue);
        
        // Only use compression if it actually saves space
        if (compressed.length < valueSize) {
          result[field] = compressed;
          compressedFields.push(field);
          originalSize += valueSize;
        }
      }
    }
    
    // Add compression metadata if any fields were compressed
    if (compressedFields.length > 0) {
      result.__compressed = {
        fields: compressedFields,
        originalSize
      };
    }
    
    return result;
  }
  
  /**
   * Decompress a document if it has compression metadata
   */
  decompress(doc: CompressedDocument): Document {
    if (!doc.__compressed) {
      return doc;
    }
    
    const result = { ...doc };
    
    // Decompress each compressed field
    for (const field of doc.__compressed.fields) {
      if (result[field]) {
        result[field] = this.decompressValue(result[field] as Buffer);
      }
    }
    
    // Remove compression metadata
    delete result.__compressed;
    
    return result;
  }
  
  /**
   * Check if a document is compressed
   */
  isCompressed(doc: Document): boolean {
    return !!(doc as CompressedDocument).__compressed;
  }
  
  /**
   * Compress a string or object value
   */
  private compressValue(value: string): Buffer {
    return zlib.deflateSync(value, { level: this.options.level });
  }
  
  /**
   * Decompress a buffer to its original value
   */
  private decompressValue(buffer: Buffer): any {
    const decompressed = zlib.inflateSync(buffer).toString('utf8');
    
    // Try to parse as JSON, otherwise return as string
    try {
      return JSON.parse(decompressed);
    } catch (e) {
      return decompressed;
    }
  }
  
  /**
   * Update compression options
   */
  setOptions(options: Partial<CompressionOptions>): void {
    this.options = {
      ...this.options,
      ...options
    };
  }
  
  /**
   * Get current compression options
   */
  getOptions(): CompressionOptions {
    return { ...this.options };
  }
}
