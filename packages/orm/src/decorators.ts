import 'reflect-metadata';
import { IndexType } from '@nebula/core';

// Metadata keys
const MODEL_META_KEY = 'nebula:model';
const FIELD_META_KEY = 'nebula:field';
const INDEX_META_KEY = 'nebula:index';
const RELATION_META_KEY = 'nebula:relation';

// Model options
export interface ModelOptions {
  collection?: string;
  timestamps?: boolean;
}

// Field options
export interface FieldOptions {
  type?: any;
  required?: boolean;
  default?: any;
  unique?: boolean;
  validate?: (value: any) => boolean | Promise<boolean>;
}

// Index options
export interface IndexOptions {
  name?: string;
  type?: IndexType;
  fields?: string[];
}

// Relation types
export enum RelationType {
  ONE_TO_ONE = 'one-to-one',
  ONE_TO_MANY = 'one-to-many',
  MANY_TO_ONE = 'many-to-one',
  MANY_TO_MANY = 'many-to-many'
}

// Relation options
export interface RelationOptions {
  type: RelationType;
  target: () => any;
  foreignKey?: string;
  inverseSide?: string;
  cascade?: boolean;
}

/**
 * Model decorator - defines a NebulaDB model
 */
export function Model(options: ModelOptions = {}) {
  return function (target: any) {
    // Set default collection name if not provided
    const collectionName = options.collection || target.name.toLowerCase();
    
    // Store model metadata
    Reflect.defineMetadata(MODEL_META_KEY, {
      collection: collectionName,
      timestamps: options.timestamps !== false, // Default to true
      target
    }, target);
    
    // Add static methods to the model class
    Object.defineProperty(target, 'getModelMetadata', {
      value: function() {
        return Reflect.getMetadata(MODEL_META_KEY, target);
      }
    });
    
    Object.defineProperty(target, 'getFieldsMetadata', {
      value: function() {
        return Reflect.getMetadata(FIELD_META_KEY, target) || {};
      }
    });
    
    Object.defineProperty(target, 'getIndexesMetadata', {
      value: function() {
        return Reflect.getMetadata(INDEX_META_KEY, target) || [];
      }
    });
    
    Object.defineProperty(target, 'getRelationsMetadata', {
      value: function() {
        return Reflect.getMetadata(RELATION_META_KEY, target) || {};
      }
    });
    
    return target;
  };
}

/**
 * Field decorator - defines a field in a model
 */
export function Field(options: FieldOptions = {}) {
  return function (target: any, propertyKey: string) {
    // Get the field type from reflection if not provided
    const type = options.type || Reflect.getMetadata('design:type', target, propertyKey);
    
    // Get existing fields or initialize empty object
    const fields = Reflect.getMetadata(FIELD_META_KEY, target.constructor) || {};
    
    // Add field metadata
    fields[propertyKey] = {
      ...options,
      type,
      name: propertyKey
    };
    
    // Update fields metadata
    Reflect.defineMetadata(FIELD_META_KEY, fields, target.constructor);
  };
}

/**
 * Index decorator - defines an index on a model
 */
export function Index(options: IndexOptions = {}) {
  return function (target: any, propertyKey?: string) {
    // Get existing indexes or initialize empty array
    const indexes = Reflect.getMetadata(INDEX_META_KEY, target.constructor) || [];
    
    // If used on a property, create a single-field index
    if (propertyKey) {
      indexes.push({
        name: options.name || `${propertyKey}_idx`,
        type: options.type || IndexType.SINGLE,
        fields: [propertyKey]
      });
    } 
    // If used on a class, create a multi-field index
    else {
      if (!options.fields || options.fields.length === 0) {
        throw new Error('Fields must be specified for class-level @Index decorator');
      }
      
      indexes.push({
        name: options.name || `${options.fields.join('_')}_idx`,
        type: options.type || (options.fields.length > 1 ? IndexType.COMPOUND : IndexType.SINGLE),
        fields: options.fields
      });
    }
    
    // Update indexes metadata
    Reflect.defineMetadata(INDEX_META_KEY, indexes, propertyKey ? target.constructor : target);
  };
}

/**
 * Relation decorator - defines a relationship between models
 */
export function Relation(options: RelationOptions) {
  return function (target: any, propertyKey: string) {
    // Get existing relations or initialize empty object
    const relations = Reflect.getMetadata(RELATION_META_KEY, target.constructor) || {};
    
    // Add relation metadata
    relations[propertyKey] = {
      ...options,
      name: propertyKey
    };
    
    // Update relations metadata
    Reflect.defineMetadata(RELATION_META_KEY, relations, target.constructor);
  };
}
