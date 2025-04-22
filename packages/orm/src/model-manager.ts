import { IDatabase, ICollection, Document, IndexType } from '@nebula/core';
import { MODEL_META_KEY, FIELD_META_KEY, INDEX_META_KEY, RELATION_META_KEY } from './decorators';

/**
 * Model manager for handling ORM operations
 */
export class ModelManager {
  private db: IDatabase;
  private models: Map<string, any> = new Map();
  private collections: Map<string, ICollection> = new Map();
  
  constructor(db: IDatabase) {
    this.db = db;
  }
  
  /**
   * Register a model with the manager
   */
  register(modelClass: any): void {
    // Get model metadata
    const metadata = Reflect.getMetadata(MODEL_META_KEY, modelClass);
    if (!metadata) {
      throw new Error(`Class ${modelClass.name} is not a valid model. Did you forget to add @Model decorator?`);
    }
    
    const { collection: collectionName } = metadata;
    
    // Register the model
    this.models.set(collectionName, modelClass);
    
    // Get or create the collection
    let collection = this.collections.get(collectionName);
    if (!collection) {
      collection = this.db.collection(collectionName);
      this.collections.set(collectionName, collection);
    }
    
    // Create indexes
    const indexes = Reflect.getMetadata(INDEX_META_KEY, modelClass) || [];
    for (const index of indexes) {
      collection.createIndex({
        name: index.name,
        fields: index.fields,
        type: index.type
      });
    }
    
    // Add static methods to the model class
    Object.defineProperty(modelClass, 'find', {
      value: async (query = {}) => {
        const docs = await collection.find(query);
        return docs.map(doc => this.mapToModel(modelClass, doc));
      }
    });
    
    Object.defineProperty(modelClass, 'findOne', {
      value: async (query) => {
        const doc = await collection.findOne(query);
        return doc ? this.mapToModel(modelClass, doc) : null;
      }
    });
    
    Object.defineProperty(modelClass, 'findById', {
      value: async (id) => {
        const doc = await collection.findOne({ id });
        return doc ? this.mapToModel(modelClass, doc) : null;
      }
    });
  }
  
  /**
   * Map a document to a model instance
   */
  private mapToModel(modelClass: any, doc: Document): any {
    const instance = new modelClass();
    
    // Copy document properties to the model instance
    Object.assign(instance, doc);
    
    // Add instance methods
    Object.defineProperty(instance, 'save', {
      value: async () => {
        return await this.save(instance);
      }
    });
    
    Object.defineProperty(instance, 'remove', {
      value: async () => {
        return await this.remove(instance);
      }
    });
    
    return instance;
  }
  
  /**
   * Save a model instance
   */
  async save(instance: any): Promise<any> {
    const modelClass = instance.constructor;
    const metadata = Reflect.getMetadata(MODEL_META_KEY, modelClass);
    if (!metadata) {
      throw new Error(`Instance of ${modelClass.name} is not a valid model.`);
    }
    
    const { collection: collectionName, timestamps } = metadata;
    const collection = this.collections.get(collectionName);
    
    if (!collection) {
      throw new Error(`Collection ${collectionName} not found.`);
    }
    
    // Get fields metadata
    const fieldsMetadata = Reflect.getMetadata(FIELD_META_KEY, modelClass) || {};
    
    // Prepare document
    const doc: any = {};
    
    // Copy fields from instance to document
    for (const [fieldName, fieldMeta] of Object.entries(fieldsMetadata)) {
      const value = instance[fieldName];
      
      // Skip undefined values
      if (value === undefined) {
        // If field is required and has no default, throw error
        if (fieldMeta.required && fieldMeta.default === undefined) {
          throw new Error(`Field ${fieldName} is required.`);
        }
        
        // Use default value if provided
        if (fieldMeta.default !== undefined) {
          doc[fieldName] = typeof fieldMeta.default === 'function' 
            ? fieldMeta.default() 
            : fieldMeta.default;
        }
        
        continue;
      }
      
      // Validate field value if validator is provided
      if (fieldMeta.validate && !await fieldMeta.validate(value)) {
        throw new Error(`Validation failed for field ${fieldName}.`);
      }
      
      // Copy value to document
      doc[fieldName] = value;
    }
    
    // Add timestamps if enabled
    if (timestamps) {
      const now = new Date().toISOString();
      
      if (!instance.id) {
        doc.createdAt = now;
      }
      
      doc.updatedAt = now;
    }
    
    // If instance has an ID, update it, otherwise insert it
    if (instance.id) {
      await collection.update({ id: instance.id }, { $set: doc });
      return instance;
    } else {
      const newDoc = await collection.insert(doc);
      return this.mapToModel(modelClass, newDoc);
    }
  }
  
  /**
   * Remove a model instance
   */
  async remove(instance: any): Promise<void> {
    const modelClass = instance.constructor;
    const metadata = Reflect.getMetadata(MODEL_META_KEY, modelClass);
    if (!metadata) {
      throw new Error(`Instance of ${modelClass.name} is not a valid model.`);
    }
    
    const { collection: collectionName } = metadata;
    const collection = this.collections.get(collectionName);
    
    if (!collection) {
      throw new Error(`Collection ${collectionName} not found.`);
    }
    
    if (!instance.id) {
      throw new Error('Cannot remove an instance without an ID.');
    }
    
    await collection.delete({ id: instance.id });
  }
  
  /**
   * Get a model class by name
   */
  getModel(name: string): any {
    return this.models.get(name);
  }
  
  /**
   * Get a collection by name
   */
  getCollection(name: string): ICollection {
    return this.collections.get(name);
  }
}
