import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { DatabaseAdapter, TestDocument } from '../types';

// Add plugins
addRxPlugin(RxDBQueryBuilderPlugin);

/**
 * RxDB adapter for benchmarks
 */
export class RxDBAdapter implements DatabaseAdapter {
  name = 'RxDB';
  private db: any;
  private collection: any;
  
  async setup(): Promise<void> {
    // Create database
    this.db = await createRxDatabase({
      name: 'benchmarkdb',
      storage: getRxStorageMemory()
    });
    
    // Create collection
    await this.db.addCollections({
      test: {
        schema: {
          version: 0,
          primaryKey: 'id',
          type: 'object',
          properties: {
            id: {
              type: 'string',
              maxLength: 100
            },
            name: {
              type: 'string'
            },
            email: {
              type: 'string'
            },
            age: {
              type: 'number'
            },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                zip: { type: 'string' }
              }
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            createdAt: {
              type: 'string'
            }
          },
          required: ['id', 'name', 'email', 'age', 'address', 'tags', 'createdAt']
        }
      }
    });
    
    this.collection = this.db.test;
  }
  
  async cleanup(): Promise<void> {
    await this.db.destroy();
  }
  
  async insert(data: TestDocument): Promise<TestDocument> {
    // Ensure ID is set
    if (!data.id) {
      data.id = Math.random().toString(36).substring(2, 15);
    }
    
    const doc = await this.collection.insert(data);
    return doc.toJSON();
  }
  
  async find(query: any): Promise<TestDocument[]> {
    const docs = await this.collection.find(query).exec();
    return docs.map((doc: any) => doc.toJSON());
  }
  
  async findOne(query: any): Promise<TestDocument | null> {
    const doc = await this.collection.findOne(query).exec();
    return doc ? doc.toJSON() : null;
  }
  
  async update(query: any, update: any): Promise<number> {
    const docs = await this.collection.find(query).exec();
    
    // Convert $set to direct updates
    const updateData = update.$set || {};
    
    // Update each document
    for (const doc of docs) {
      await doc.update({
        $set: updateData
      });
    }
    
    return docs.length;
  }
  
  async delete(query: any): Promise<number> {
    const docs = await this.collection.find(query).exec();
    
    // Delete each document
    for (const doc of docs) {
      await doc.remove();
    }
    
    return docs.length;
  }
}
