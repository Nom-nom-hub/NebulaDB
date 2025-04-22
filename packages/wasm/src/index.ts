import { Adapter, Document, Query, UpdateOperation, IDatabase } from '@nebula/core';

// Import WASM module
let wasmModule: any;

/**
 * Initialize the WASM module
 */
export async function initWasm(): Promise<void> {
  if (typeof window !== 'undefined') {
    // Browser environment
    try {
      wasmModule = await import('../wasm/pkg/nebula_wasm');
    } catch (error) {
      console.error('Failed to load WASM module:', error);
      throw new Error('Failed to load WASM module. Make sure the WASM module is built and available.');
    }
  } else {
    // Node.js environment
    try {
      wasmModule = await import('../wasm/pkg/nebula_wasm_node');
    } catch (error) {
      console.error('Failed to load WASM module:', error);
      throw new Error('Failed to load WASM module. Make sure the WASM module is built and available.');
    }
  }
}

/**
 * WASM adapter for NebulaDB
 */
export class WasmAdapter implements Adapter {
  private db: any;
  private collections: Map<string, any> = new Map();
  
  /**
   * Create a new WASM adapter
   */
  constructor() {
    if (!wasmModule) {
      throw new Error('WASM module not initialized. Call initWasm() before creating a WasmAdapter.');
    }
    
    this.db = new wasmModule.Database();
  }
  
  /**
   * Load data from WASM
   */
  async load(): Promise<Record<string, Document[]>> {
    try {
      const json = this.db.to_json();
      return JSON.parse(json);
    } catch (error) {
      console.error('Failed to load data from WASM:', error);
      return {};
    }
  }
  
  /**
   * Save data to WASM
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    try {
      const json = JSON.stringify(data);
      this.db.from_json(json);
    } catch (error) {
      console.error('Failed to save data to WASM:', error);
      throw error;
    }
  }
  
  /**
   * Close the WASM connection
   */
  async close(): Promise<void> {
    // Nothing to do
  }
  
  /**
   * Get a collection from WASM
   */
  getCollection(name: string): any {
    if (!this.collections.has(name)) {
      const collection = this.db.collection(name);
      this.collections.set(name, collection);
    }
    
    return this.collections.get(name);
  }
}

/**
 * WASM-optimized database implementation
 */
export class WasmDatabase implements IDatabase {
  private adapter: WasmAdapter;
  private collections: Map<string, WasmCollection> = new Map();
  
  /**
   * Create a new WASM database
   */
  constructor() {
    this.adapter = new WasmAdapter();
  }
  
  /**
   * Get a collection
   */
  collection<T extends Document = Document>(name: string): WasmCollection<T> {
    if (!this.collections.has(name)) {
      const collection = new WasmCollection<T>(name, this.adapter);
      this.collections.set(name, collection);
    }
    
    return this.collections.get(name) as WasmCollection<T>;
  }
  
  /**
   * Save the database
   */
  async save(): Promise<void> {
    const data: Record<string, Document[]> = {};
    
    for (const [name, collection] of this.collections.entries()) {
      data[name] = await collection.find();
    }
    
    await this.adapter.save(data);
  }
  
  /**
   * Load the database
   */
  async load(): Promise<void> {
    const data = await this.adapter.load();
    
    for (const [name, docs] of Object.entries(data)) {
      const collection = this.collection(name);
      
      // Clear existing data
      await collection.delete({});
      
      // Insert new data
      for (const doc of docs) {
        await collection.insert(doc);
      }
    }
  }
  
  /**
   * Close the database
   */
  async close(): Promise<void> {
    await this.adapter.close();
  }
}

/**
 * WASM-optimized collection implementation
 */
export class WasmCollection<T extends Document = Document> {
  private name: string;
  private adapter: WasmAdapter;
  private wasmCollection: any;
  
  /**
   * Create a new WASM collection
   */
  constructor(name: string, adapter: WasmAdapter) {
    this.name = name;
    this.adapter = adapter;
    this.wasmCollection = adapter.getCollection(name);
  }
  
  /**
   * Insert a document
   */
  async insert(doc: Partial<T>): Promise<T> {
    try {
      const json = JSON.stringify(doc);
      const id = this.wasmCollection.insert(json);
      
      return { ...doc, id } as T;
    } catch (error) {
      console.error(`Failed to insert document into ${this.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Find documents
   */
  async find(query: Query = {}): Promise<T[]> {
    try {
      const json = JSON.stringify(query);
      const results = this.wasmCollection.find(json);
      
      return JSON.parse(results);
    } catch (error) {
      console.error(`Failed to find documents in ${this.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Find one document
   */
  async findOne(query: Query = {}): Promise<T | null> {
    try {
      const json = JSON.stringify(query);
      const result = this.wasmCollection.find_one(json);
      
      if (result === 'null') {
        return null;
      }
      
      return JSON.parse(result);
    } catch (error) {
      console.error(`Failed to find document in ${this.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Update documents
   */
  async update(query: Query, update: UpdateOperation): Promise<number> {
    try {
      const queryJson = JSON.stringify(query);
      const updateJson = JSON.stringify(update);
      
      return this.wasmCollection.update(queryJson, updateJson);
    } catch (error) {
      console.error(`Failed to update documents in ${this.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete documents
   */
  async delete(query: Query = {}): Promise<number> {
    try {
      const json = JSON.stringify(query);
      
      return this.wasmCollection.delete(json);
    } catch (error) {
      console.error(`Failed to delete documents from ${this.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Create an index
   */
  async createIndex(options: {
    name: string;
    fields: string[];
    type?: 'single' | 'unique' | 'multi';
  }): Promise<void> {
    try {
      const { name, fields, type = 'single' } = options;
      const fieldsJson = JSON.stringify(fields);
      
      this.wasmCollection.create_index(name, fieldsJson, type);
    } catch (error) {
      console.error(`Failed to create index in ${this.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Drop an index
   */
  async dropIndex(name: string): Promise<boolean> {
    try {
      return this.wasmCollection.drop_index(name);
    } catch (error) {
      console.error(`Failed to drop index in ${this.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all indexes
   */
  async getIndexes(): Promise<string[]> {
    try {
      const json = this.wasmCollection.get_indexes();
      
      return JSON.parse(json);
    } catch (error) {
      console.error(`Failed to get indexes from ${this.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Subscribe to changes
   * 
   * Note: This is a simplified implementation that doesn't actually
   * use WASM for reactivity. In a real implementation, we would need
   * to set up a proper subscription system with the WASM module.
   */
  subscribe(query: Query, callback: (docs: T[]) => void): () => void {
    // Initial call
    this.find(query).then(callback);
    
    // Return unsubscribe function
    return () => {};
  }
}

// Export types
export { Document, Query, UpdateOperation };
