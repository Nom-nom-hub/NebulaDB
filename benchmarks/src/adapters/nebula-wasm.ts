import { initWasm, WasmDatabase } from '@nebula/wasm';
import { DatabaseAdapter, TestDocument } from '../types';

/**
 * NebulaDB WASM adapter for benchmarks
 */
export class NebulaWasmAdapter implements DatabaseAdapter {
  name = 'NebulaDB (WASM)';
  private db: any;
  private collection: any;
  private initialized = false;
  
  async setup(): Promise<void> {
    if (!this.initialized) {
      await initWasm();
      this.initialized = true;
    }
    
    this.db = new WasmDatabase();
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
