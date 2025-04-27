import { Document, Query } from './types';
import { matchDocument } from './query';

/**
 * Index type
 */
export enum IndexType {
  SINGLE = 'single',
  COMPOUND = 'compound',
  UNIQUE = 'unique',
  TEXT = 'text'
}

/**
 * Index definition
 */
export interface IndexDefinition {
  name: string;
  fields: string[];
  type: IndexType;
}

/**
 * Index entry
 */
// interface IndexEntry {
//   key: string | number;
//   ids: Set<string>;
// }

/**
 * Index implementation
 */
export class Index {
  name: string;
  fields: string[];
  type: IndexType;
  private entries: Map<string | number, Set<string>> = new Map();
  private uniqueValues: Map<string, string> = new Map();

  constructor(definition: IndexDefinition) {
    this.name = definition.name;
    this.fields = definition.fields;
    this.type = definition.type;
  }

  /**
   * Add a document to the index
   */
  add(doc: Document): void {
    const key = this.getIndexKey(doc);

    if (key === undefined) return;

    if (this.type === IndexType.UNIQUE) {
      // Check if the key already exists
      if (this.uniqueValues.has(String(key))) {
        const existingId = this.uniqueValues.get(String(key));
        if (existingId !== doc.id) {
          throw new Error(`Unique constraint violation for index ${this.name}: ${key}`);
        }
      }

      // Add to unique values map
      this.uniqueValues.set(String(key), doc.id);
    }

    // Add to entries map
    if (!this.entries.has(key)) {
      this.entries.set(key, new Set());
    }

    this.entries.get(key)?.add(doc.id);
  }

  /**
   * Remove a document from the index
   */
  remove(doc: Document): void {
    const key = this.getIndexKey(doc);

    if (key === undefined) return;

    // Remove from unique values map
    if (this.type === IndexType.UNIQUE) {
      this.uniqueValues.delete(String(key));
    }

    // Remove from entries map
    const ids = this.entries.get(key);
    if (ids) {
      ids.delete(doc.id);
      if (ids.size === 0) {
        this.entries.delete(key);
      }
    }
  }

  /**
   * Update a document in the index
   */
  update(oldDoc: Document, newDoc: Document): void {
    // First check if the new document would violate unique constraints
    if (this.type === IndexType.UNIQUE) {
      const newKey = this.getIndexKey(newDoc);
      
      if (newKey !== undefined) {
        const existingId = this.uniqueValues.get(String(newKey));
        if (existingId !== undefined && existingId !== newDoc.id) {
          throw new Error(`Unique constraint violation for index ${this.name}: ${newKey}`);
        }
      }
    }
    
    // If no violation, proceed with update
    this.remove(oldDoc);
    this.add(newDoc);
  }

  /**
   * Find document IDs matching a query
   */
  find(query: Query): Set<string> | null {
    // Check if the query can use this index
    const indexKey = this.getQueryIndexKey(query);

    if (indexKey === null) {
      return null; // Query can't use this index
    }

    // Return matching document IDs
    return this.entries.get(indexKey) || new Set();
  }

  /**
   * Get the index key for a document
   */
  private getIndexKey(doc: Document): string | number | undefined {
    if (this.fields.length === 1) {
      // Single field index
      const field = this.fields[0];
      return this.getFieldValue(doc, field);
    } else {
      // Compound index
      const values = this.fields.map(field => this.getFieldValue(doc, field));

      // If any value is undefined, the compound key is undefined
      if (values.some(v => v === undefined)) {
        return undefined;
      }

      // Join values with a separator that won't appear in the values
      return values.join('|:|');
    }
  }

  /**
   * Get a field value from a document, supporting nested fields
   */
  private getFieldValue(doc: any, field: string): string | number | undefined {
    if (field.includes('.')) {
      const parts = field.split('.');
      let current = doc;

      for (const part of parts) {
        if (current === undefined || current === null) {
          return undefined;
        }
        current = current[part];
      }

      return current;
    }

    return doc[field];
  }

  /**
   * Get the index key for a query, or null if the query can't use this index
   */
  private getQueryIndexKey(query: Query): string | number | null {
    // For single field indexes
    if (this.fields.length === 1) {
      const field = this.fields[0];

      // Check if the query is for this field
      if (field in query) {
        const condition = query[field as keyof typeof query];

        // Simple equality
        if (typeof condition !== 'object' || condition === null) {
          return condition;
        }

        // Equality operator
        if (condition.$eq !== undefined) {
          return condition.$eq;
        }
      }
    }

    // For compound indexes, all fields must be exact matches
    if (this.fields.length > 1) {
      const values: (string | number)[] = [];

      for (const field of this.fields) {
        if (!(field in query)) {
          return null;
        }

        const condition = query[field as keyof typeof query];

        // Must be simple equality or $eq
        if (condition === undefined) {
          return null;
        }

        if (typeof condition !== 'object' || condition === null) {
          values.push(condition);
        } else if (condition.$eq !== undefined) {
          values.push(condition.$eq);
        } else {
          return null;
        }
      }

      return values.join('|:|');
    }

    return null;
  }

  /**
   * Clear the index
   */
  clear(): void {
    this.entries.clear();
    this.uniqueValues.clear();
  }
}

/**
 * Index manager for a collection
 */
export class IndexManager {
  private indexes: Map<string, Index> = new Map();

  /**
   * Create a new index
   */
  createIndex(definition: IndexDefinition): Index {
    if (this.indexes.has(definition.name)) {
      throw new Error(`Index ${definition.name} already exists`);
    }

    const index = new Index(definition);
    this.indexes.set(definition.name, index);
    return index;
  }

  /**
   * Drop an index
   */
  dropIndex(name: string): boolean {
    return this.indexes.delete(name);
  }

  /**
   * Get an index by name
   */
  getIndex(name: string): Index | undefined {
    return this.indexes.get(name);
  }

  /**
   * Get all indexes
   */
  getAllIndexes(): Index[] {
    return Array.from(this.indexes.values());
  }

  /**
   * Add a document to all indexes
   */
  addDocument(doc: Document): void {
    for (const index of this.indexes.values()) {
      index.add(doc);
    }
  }

  /**
   * Remove a document from all indexes
   */
  removeDocument(doc: Document): void {
    for (const index of this.indexes.values()) {
      index.remove(doc);
    }
  }

  /**
   * Update a document in all indexes
   */
  updateDocument(oldDoc: Document, newDoc: Document): void {
    for (const index of this.indexes.values()) {
      index.update(oldDoc, newDoc);
    }
  }

  /**
   * Find documents matching a query using indexes
   */
  findDocuments(query: Query, allDocs: Document[]): Document[] {
    // If query is empty, return all documents
    if (!query || Object.keys(query).length === 0) {
      return allDocs;
    }

    // Try to find an index that can be used for this query
    for (const index of this.indexes.values()) {
      const matchingIds = index.find(query);

      if (matchingIds !== null) {
        // Use the index to filter documents
        const indexedResults = allDocs.filter(doc => matchingIds.has(doc.id));

        // Further filter the results with the full query
        return indexedResults.filter(doc => matchDocument(doc, query));
      }
    }

    // No suitable index found, fall back to full scan
    return allDocs.filter(doc => matchDocument(doc, query));
  }

  /**
   * Clear all indexes
   */
  clear(): void {
    for (const index of this.indexes.values()) {
      index.clear();
    }
  }

  /**
   * Rebuild all indexes from documents
   */
  rebuild(documents: Document[]): void {
    this.clear();

    for (const doc of documents) {
      this.addDocument(doc);
    }
  }

  /**
   * Creates a composite index for multiple fields
   * @param fields Array of field names to index
   * @returns The created index
   */
  createCompositeIndex(fields: string[]): Index {
    if (!fields || fields.length === 0) {
      throw new Error('Cannot create composite index with empty fields array');
    }

    const indexName = fields.join('_');
    
    if (this.indexes.has(indexName)) {
      return this.indexes.get(indexName)!;
    }

    const index = new CompositeIndex(fields);
    this.indexes.set(indexName, index);
    
    // Index existing documents
    this.documents.forEach(doc => {
      index.addDocument(doc);
    });
    
    return index;
  }

  /**
   * Creates a partial index based on a filter condition
   * @param field Field name to index
   * @param filterQuery Query to filter documents for indexing
   * @returns The created index
   */
  createPartialIndex(field: string, filterQuery: Query): Index {
    const indexName = `${field}_partial`;
    
    if (this.indexes.has(indexName)) {
      return this.indexes.get(indexName)!;
    }

    const index = new PartialIndex(field, filterQuery);
    this.indexes.set(indexName, index);
    
    // Index existing documents that match the filter
    this.documents.forEach(doc => {
      if (matchDocument(doc, filterQuery)) {
        index.addDocument(doc);
      }
    });
    
    return index;
  }
}
