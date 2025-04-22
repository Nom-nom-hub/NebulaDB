import PouchDB from 'pouchdb';
import PouchDBMemoryAdapter from 'pouchdb-adapter-memory';
import { DatabaseAdapter, TestDocument } from '../types';

// Register memory adapter
PouchDB.plugin(PouchDBMemoryAdapter);

/**
 * PouchDB adapter for benchmarks
 */
export class PouchDBAdapter implements DatabaseAdapter {
  name = 'PouchDB';
  private db: any;
  
  async setup(): Promise<void> {
    // Create database
    this.db = new PouchDB('benchmark', {
      adapter: 'memory'
    });
    
    // Create index
    await this.db.createIndex({
      index: {
        fields: ['email']
      }
    });
  }
  
  async cleanup(): Promise<void> {
    await this.db.destroy();
  }
  
  async insert(data: TestDocument): Promise<TestDocument> {
    // PouchDB requires _id
    const doc = {
      _id: data.id || Math.random().toString(36).substring(2, 15),
      ...data
    };
    
    const result = await this.db.put(doc);
    
    return {
      ...doc,
      _rev: result.rev
    };
  }
  
  async find(query: any): Promise<TestDocument[]> {
    // Convert query to PouchDB format
    const selector = this.convertQuery(query);
    
    const result = await this.db.find({
      selector
    });
    
    return result.docs;
  }
  
  async findOne(query: any): Promise<TestDocument | null> {
    // Convert query to PouchDB format
    const selector = this.convertQuery(query);
    
    const result = await this.db.find({
      selector,
      limit: 1
    });
    
    return result.docs[0] || null;
  }
  
  async update(query: any, update: any): Promise<number> {
    // Find documents to update
    const docs = await this.find(query);
    
    // Apply updates
    const updatePromises = docs.map(async (doc) => {
      const updateData = update.$set || {};
      
      // Apply updates to document
      const updatedDoc = {
        ...doc,
        ...updateData
      };
      
      // Save document
      await this.db.put(updatedDoc);
    });
    
    await Promise.all(updatePromises);
    
    return docs.length;
  }
  
  async delete(query: any): Promise<number> {
    // Find documents to delete
    const docs = await this.find(query);
    
    // Delete documents
    const deletePromises = docs.map(async (doc) => {
      await this.db.remove(doc);
    });
    
    await Promise.all(deletePromises);
    
    return docs.length;
  }
  
  /**
   * Convert NebulaDB query to PouchDB query
   */
  private convertQuery(query: any): any {
    const selector: any = {};
    
    // Convert simple equality
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'object' && value !== null) {
        // Handle operators
        const operators = value as Record<string, any>;
        
        for (const [op, opValue] of Object.entries(operators)) {
          switch (op) {
            case '$eq':
              selector[key] = opValue;
              break;
            case '$gt':
              selector[key] = { $gt: opValue };
              break;
            case '$gte':
              selector[key] = { $gte: opValue };
              break;
            case '$lt':
              selector[key] = { $lt: opValue };
              break;
            case '$lte':
              selector[key] = { $lte: opValue };
              break;
            case '$in':
              selector[key] = { $in: opValue };
              break;
            case '$ne':
              selector[key] = { $ne: opValue };
              break;
          }
        }
      } else {
        // Simple equality
        selector[key] = value;
      }
    }
    
    return selector;
  }
}
