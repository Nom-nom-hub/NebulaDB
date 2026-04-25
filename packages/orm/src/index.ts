import 'reflect-metadata';
import {
  createDb,
  Database,
  Document,
  Collection
} from '@nebula-db/core';
import { Model, ModelOptions, FieldOptions, IndexOptions, RelationOptions, RelationType } from './decorators';

export { Model, Field, Index, Relation, RelationType };
export type { ModelOptions, FieldOptions, IndexOptions, RelationOptions };

export interface ORMConfig {
  adapter?: any;
  debug?: boolean;
}

export class ModelManager {
  private db: Database;
  private modelClasses: Map<string, any> = new Map();
  private collectionCache: Map<string, Collection> = new Map();

  constructor(config: ORMConfig = {}) {
    this.db = createDb({ adapter: config.adapter });
  }

  getDatabase(): Database {
    return this.db;
  }

  registerModel<T extends Document>(modelClass: new () => T, options: ModelOptions = {}): void {
    const meta = modelClass.getModelMetadata();
    if (!meta) {
      throw new Error(`No model metadata found for ${modelClass.name}. Did you add @Model() decorator?`);
    }
    this.modelClasses.set(meta.collection, modelClass);
  }

  getCollection<T extends Document>(collectionName: string): Collection {
    if (!this.collectionCache.has(collectionName)) {
      this.collectionCache.set(collectionName, this.db.collection(collectionName));
    }
    return this.collectionCache.get(collectionName)!;
  }

  async create<T extends Document>(modelClass: new () => T, data: Partial<T>): Promise<T> {
    const meta = modelClass.getModelMetadata();
    const collectionName = meta.collection;
    const fields = modelClass.getFieldsMetadata();

    const doc: any = { id: data.id || this.generateId() };

    for (const [fieldName, fieldMeta] of Object.entries(fields)) {
      if (data[fieldName] !== undefined) {
        doc[fieldName] = data[fieldName];
      } else if (fieldMeta.default !== undefined) {
        doc[fieldName] = fieldMeta.default;
      }
    }

    if (meta.timestamps) {
      doc.createdAt = doc.createdAt || new Date().toISOString();
      doc.updatedAt = doc.updatedAt || new Date().toISOString();
    }

    const collection = this.getCollection(collectionName);
    await collection.insert(doc);

    return doc as T;
  }

  async find<T extends Document>(
    modelClass: new () => T,
    query: any = {}
  ): Promise<T[]> {
    const meta = modelClass.getModelMetadata();
    const collection = this.getCollection(meta.collection);
    const results = await collection.find(query);
    return results as T[];
  }

  async findOne<T extends Document>(
    modelClass: new () => T,
    query: any
  ): Promise<T | null> {
    const meta = modelClass.getModelMetadata();
    const collection = this.getCollection(meta.collection);
    const result = await collection.findOne(query);
    return result as T | null;
  }

  async findById<T extends Document>(
    modelClass: new () => T,
    id: string
  ): Promise<T | null> {
    const meta = modelClass.getModelMetadata();
    const collection = this.getCollection(meta.collection);
    const result = await collection.findOne({ id });
    return result as T | null;
  }

  async update<T extends Document>(
    modelClass: new () => T,
    id: string,
    data: Partial<T>
  ): Promise<T | null> {
    const existing = await this.findById(modelClass, id);
    if (!existing) return null;

    const meta = modelClass.getModelMetadata();
    const collection = this.getCollection(meta.collection);

    const updates: any = { ...data };
    if (meta.timestamps) {
      updates.updatedAt = new Date().toISOString();
    }

    await collection.update({ id }, updates);
    return this.findById(modelClass, id);
  }

  async delete<T extends Document>(
    modelClass: new () => T,
    id: string
  ): Promise<boolean> {
    const meta = modelClass.getModelMetadata();
    const collection = this.getCollection(meta.collection);
    const result = await collection.delete({ id });
    return result > 0;
  }

  async count<T extends Document>(modelClass: new () => T): Promise<number> {
    const meta = modelClass.getModelMetadata();
    const collection = this.getCollection(meta.collection);
    return collection.count();
  }

  getModelIndexes(modelClass: any): any[] {
    return modelClass.getIndexesMetadata();
  }

  getModelRelations(modelClass: any): any {
    return modelClass.getRelationsMetadata();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

export function createORM(config?: ORMConfig): ModelManager {
  return new ModelManager(config);
}