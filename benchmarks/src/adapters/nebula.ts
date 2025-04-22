import { createDb, MemoryAdapter } from '@nebula/core';
import { DatabaseAdapter, TestDocument } from '../types';

/**
 * NebulaDB adapter for benchmarks
 */
export class NebulaAdapter implements DatabaseAdapter {
  name = 'NebulaDB (Memory)';
  private db: any;
  private collection: any;
  
  async setup(): Promise<void> {
    this.db = createDb({
      adapter: new MemoryAdapter()
    });
    
    this.collection = this.db.collection('test');
    
    // Create index
    await this.collection.createIndex({
      name: 'email_idx',
      fields: ['email'],
      type: 'unique'
    });
  }
  
  async cleanup(): Promise<void> {
    await this.db.close();
  }
  
  async insert(data: TestDocument): Promise<TestDocument> {
    return this.collection.insert(data);
  }
  
  async find(query: any): Promise<TestDocument[]> {
    return this.collection.find(query);
  }
  
  async findOne(query: any): Promise<TestDocument | null> {
    return this.collection.findOne(query);
  }
  
  async update(query: any, update: any): Promise<number> {
    return this.collection.update(query, update);
  }
  
  async delete(query: any): Promise<number> {
    return this.collection.delete(query);
  }
}
