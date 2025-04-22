import { Document } from './types';

/**
 * Memory manager for efficient document storage
 */
export class MemoryManager {
  private documents: Map<string, Document> = new Map();
  private documentIds: string[] = [];
  private chunkSize: number = 1000;
  private chunks: Document[][] = [];
  
  /**
   * Add a document to the memory manager
   */
  add(doc: Document): void {
    // Store in map for quick lookup by ID
    this.documents.set(doc.id, doc);
    
    // Add to ID list
    this.documentIds.push(doc.id);
    
    // Add to chunks
    const chunkIndex = Math.floor(this.documentIds.length / this.chunkSize);
    
    if (!this.chunks[chunkIndex]) {
      this.chunks[chunkIndex] = [];
    }
    
    this.chunks[chunkIndex].push(doc);
  }
  
  /**
   * Remove a document from the memory manager
   */
  remove(id: string): boolean {
    const doc = this.documents.get(id);
    
    if (!doc) {
      return false;
    }
    
    // Remove from map
    this.documents.delete(id);
    
    // Remove from ID list
    const idIndex = this.documentIds.indexOf(id);
    if (idIndex !== -1) {
      this.documentIds.splice(idIndex, 1);
    }
    
    // Remove from chunks
    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      const docIndex = chunk.findIndex(d => d.id === id);
      
      if (docIndex !== -1) {
        chunk.splice(docIndex, 1);
        
        // If chunk is empty, remove it
        if (chunk.length === 0) {
          this.chunks.splice(i, 1);
        }
        
        break;
      }
    }
    
    return true;
  }
  
  /**
   * Update a document in the memory manager
   */
  update(id: string, newDoc: Document): boolean {
    if (!this.documents.has(id)) {
      return false;
    }
    
    // Update in map
    this.documents.set(id, newDoc);
    
    // Update in chunks
    for (const chunk of this.chunks) {
      const docIndex = chunk.findIndex(d => d.id === id);
      
      if (docIndex !== -1) {
        chunk[docIndex] = newDoc;
        break;
      }
    }
    
    return true;
  }
  
  /**
   * Get a document by ID
   */
  get(id: string): Document | undefined {
    return this.documents.get(id);
  }
  
  /**
   * Get all documents
   */
  getAll(): Document[] {
    return [...this.documents.values()];
  }
  
  /**
   * Get documents in chunks for efficient iteration
   */
  getChunks(): Document[][] {
    return this.chunks;
  }
  
  /**
   * Get document IDs
   */
  getIds(): string[] {
    return [...this.documentIds];
  }
  
  /**
   * Check if a document exists
   */
  has(id: string): boolean {
    return this.documents.has(id);
  }
  
  /**
   * Get the number of documents
   */
  size(): number {
    return this.documents.size;
  }
  
  /**
   * Clear all documents
   */
  clear(): void {
    this.documents.clear();
    this.documentIds = [];
    this.chunks = [];
  }
  
  /**
   * Set all documents
   */
  setAll(docs: Document[]): void {
    this.clear();
    
    for (const doc of docs) {
      this.add(doc);
    }
  }
  
  /**
   * Optimize memory usage by compacting chunks
   */
  optimize(): void {
    // Rebuild chunks to ensure they're properly sized
    const allDocs = this.getAll();
    this.chunks = [];
    
    for (let i = 0; i < allDocs.length; i += this.chunkSize) {
      this.chunks.push(allDocs.slice(i, i + this.chunkSize));
    }
  }
  
  /**
   * Process documents in chunks to avoid blocking the main thread
   */
  async processInChunks<T>(
    processor: (docs: Document[]) => Promise<T[]>,
    chunkSize: number = this.chunkSize
  ): Promise<T[]> {
    const results: T[] = [];
    const allDocs = this.getAll();
    
    for (let i = 0; i < allDocs.length; i += chunkSize) {
      const chunk = allDocs.slice(i, i + chunkSize);
      const chunkResults = await processor(chunk);
      results.push(...chunkResults);
      
      // Yield to the event loop to avoid blocking
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return results;
  }
}
