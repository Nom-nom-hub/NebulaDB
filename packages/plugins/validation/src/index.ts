import { Plugin, Document } from '@nebula/core';
import { z } from 'zod';

/**
 * Options for the validation plugin
 */
export interface ValidationPluginOptions {
  schemas: Record<string, z.ZodType<any>>;
  strict?: boolean;
}

/**
 * Validation error class
 */
export class ValidationError extends Error {
  errors: z.ZodError;
  
  constructor(message: string, errors: z.ZodError) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Schema validation plugin for NebulaDB using Zod
 */
export function createValidationPlugin(options: ValidationPluginOptions): Plugin {
  const { schemas, strict = false } = options;
  
  return {
    name: 'validation',
    
    async onBeforeInsert(collection: string, doc: Document): Promise<Document> {
      const schema = schemas[collection];
      
      if (!schema) {
        if (strict) {
          throw new Error(`No schema defined for collection "${collection}" and strict mode is enabled`);
        }
        return doc;
      }
      
      try {
        return schema.parse(doc);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(`Validation failed for document in collection "${collection}"`, error);
        }
        throw error;
      }
    },
    
    async onBeforeUpdate(collection: string, query: any, update: any): Promise<[any, any]> {
      // For updates, we can't fully validate since we're only updating parts of documents
      // We could implement partial validation in the future
      return [query, update];
    }
  };
}
