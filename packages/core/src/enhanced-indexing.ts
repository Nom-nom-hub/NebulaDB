import { Document, Query } from './types';
import { matchDocument } from './query';

/**
 * Index type
 */
export enum IndexType {
  SINGLE = 'single',
  COMPOUND = 'compound',
  UNIQUE = 'unique',
  TEXT = 'text',
  MULTI = 'multi'
}

/**
 * Index definition
 */
export interface IndexDefinition {
  name: string;
  fields: string[];
  type: IndexType;
  options?: {
    sparse?: boolean;
    caseInsensitive?: boolean;
    partial?: {
      filter: Query;
    };
    expireAfterSeconds?: number;
  };
}

/**
 * B-Tree node for range indexes
 */
class BTreeNode<T> {
  keys: (string | number)[] = [];
  values: T[][] = [];
  children: BTreeNode<T>[] = [];
  isLeaf: boolean = true;

  constructor(public order: number = 32) {}

  /**
   * Insert a key-value pair into the node
   */
  insert(key: string | number, value: T): void {
    let i = 0;
    while (i < this.keys.length && this.compareKeys(key, this.keys[i]) > 0) {
      i++;
    }

    // If key already exists, add value to the array
    if (i < this.keys.length && this.compareKeys(key, this.keys[i]) === 0) {
      this.values[i].push(value);
      return;
    }

    // Insert new key and value
    this.keys.splice(i, 0, key);
    this.values.splice(i, 0, [value]);
  }

  /**
   * Remove a key-value pair from the node
   */
  remove(key: string | number, value: T): boolean {
    let i = 0;
    while (i < this.keys.length && this.compareKeys(key, this.keys[i]) !== 0) {
      i++;
    }

    if (i === this.keys.length) {
      return false; // Key not found
    }

    // Remove value from the array
    const valueIndex = this.values[i].findIndex(v => v === value);
    if (valueIndex === -1) {
      return false; // Value not found
    }

    this.values[i].splice(valueIndex, 1);

    // If no values left, remove the key
    if (this.values[i].length === 0) {
      this.keys.splice(i, 1);
      this.values.splice(i, 1);
    }

    return true;
  }

  /**
   * Find values for a key
   */
  find(key: string | number): T[] {
    let i = 0;
    while (i < this.keys.length && this.compareKeys(key, this.keys[i]) !== 0) {
      i++;
    }

    if (i === this.keys.length) {
      return []; // Key not found
    }

    return [...this.values[i]];
  }

  /**
   * Find values in a range
   */
  findRange(start: string | number | null, end: string | number | null, inclusive: boolean = true): T[] {
    const result: T[] = [];

    for (let i = 0; i < this.keys.length; i++) {
      const key = this.keys[i];
      let lowerCheck = true;
      let upperCheck = true;
      if (start !== null && !(start === '' && typeof key === 'string')) {
        lowerCheck = this.compareKeys(key, start) >= (inclusive ? 0 : 1);
      }
      if (end !== null) {
        upperCheck = this.compareKeys(key, end) <= (inclusive ? 0 : -1);
      }
      if (process.env.DEBUG_INDEX) {
        // eslint-disable-next-line no-console
        console.log('[BTreeNode.findRange]', { key, start, end, lowerCheck, upperCheck });
      }
      if (!lowerCheck) continue;
      if (!upperCheck) break;
      result.push(...this.values[i]);
    }

    return result;
  }

  /**
   * Compare two keys
   */
  private compareKeys(a: string | number, b: string | number): number {
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    return String(a).localeCompare(String(b));
  }
}

/**
 * Enhanced index implementation with range query support
 */
export class EnhancedIndex {
  name: string;
  fields: string[];
  type: IndexType;
  options: {
    sparse: boolean;
    caseInsensitive: boolean;
    partial?: {
      filter: Query;
    };
    expireAfterSeconds?: number;
  };

  private btree: BTreeNode<string> = new BTreeNode<string>();
  private uniqueValues: Map<string | number, string> = new Map();
  private docToKeys: Map<string, (string | number)[]> = new Map();
  private expiryIndex: Map<string, number> = new Map(); // Document ID to expiry timestamp

  constructor(definition: IndexDefinition) {
    this.name = definition.name;
    this.fields = definition.fields;
    this.type = definition.type;
    this.options = {
      sparse: definition.options?.sparse || false,
      caseInsensitive: definition.options?.caseInsensitive || false,
      partial: definition.options?.partial,
      expireAfterSeconds: definition.options?.expireAfterSeconds
    };
  }

  /**
   * Check if a document matches the partial filter
   */
  private matchesPartialFilter(doc: Document): boolean {
    // If no partial filter is defined, all documents match
    if (!this.options.partial) return true;

    // Use the query matcher to check if the document matches the filter
    return matchDocument(doc, this.options.partial.filter);
  }

  /**
   * Add a document to the index
   */
  add(doc: Document): void {
    // Check if this document should be included in a partial index
    if (this.options.partial) {
      // Use the query matcher to check if the document matches the filter
      const matches = matchDocument(doc, this.options.partial.filter);
      if (!matches) {
        return; // Skip documents that don't match the partial filter
      }
    }

    const keys = this.getIndexKeys(doc);

    if (keys.length === 0) {
      return; // No valid keys for this document
    }

    // Store the keys for this document for faster removal
    this.docToKeys.set(doc.id, keys);

    // Handle expiry if configured
    if (this.options.expireAfterSeconds !== undefined) {
      const expiryTime = Date.now() + (this.options.expireAfterSeconds * 1000);
      this.expiryIndex.set(doc.id, expiryTime);
    }

    for (const key of keys) {
      if (this.type === IndexType.UNIQUE) {
        // Check if the key already exists
        if (this.uniqueValues.has(key)) {
          const existingId = this.uniqueValues.get(key);
          if (existingId !== doc.id) {
            throw new Error(`Unique constraint violation for index ${this.name}: ${key}`);
          }
        }

        // Add to unique values map
        this.uniqueValues.set(key, doc.id);
      }

      // Add to B-tree
      this.btree.insert(key, doc.id);
    }
  }

  /**
   * Remove a document from the index
   */
  remove(doc: Document): void {
    // Only remove if the doc was indexed (matched the partial filter)
    if (this.options.partial && !this.matchesPartialFilter(doc)) {
      // Not indexed, nothing to remove
      return;
    }

    // Get the keys for this document
    const keys = this.docToKeys.get(doc.id) || this.getIndexKeys(doc);

    for (const key of keys) {
      // Remove from unique values map
      if (this.type === IndexType.UNIQUE && this.uniqueValues.get(key) === doc.id) {
        this.uniqueValues.delete(key);
      }

      // Remove from B-tree
      this.btree.remove(key, doc.id);
    }

    // Remove from docToKeys map
    this.docToKeys.delete(doc.id);

    // Remove from expiry index if present
    this.expiryIndex.delete(doc.id);
  }

  /**
   * Update a document in the index
   */
  update(oldDoc: Document, newDoc: Document): void {
    const oldMatched = this.matchesPartialFilter(oldDoc);
    const newMatched = this.matchesPartialFilter(newDoc);
    if (oldMatched && !newMatched) {
      // Was indexed, should be removed
      this.remove(oldDoc);
    } else if (!oldMatched && newMatched) {
      // Was not indexed, should be added
      this.add(newDoc);
    } else if (oldMatched && newMatched) {
      // Was and remains indexed, update as usual
      this.remove(oldDoc);
      this.add(newDoc);
    }
    // If neither matched, do nothing
  }

  /**
   * Find document IDs matching a query
   */
  find(query: Query): Set<string> | null {
    // Check if the query can use this index
    const queryInfo = this.canUseIndex(query);
    if (!queryInfo) {
      return null; // Query can't use this index
    }
    const { operator, value } = queryInfo;
    let candidateIds: string[] = [];
    switch (operator) {
      case 'eq':
        candidateIds = this.btree.find(value);
        break;
      case 'gt':
      case 'gte':
        candidateIds = this.btree.findRange(value, null, operator === 'gte');
        break;
      case 'lt':
        candidateIds = this.btree.findRange(null, value, false);
        break;
      case 'lte':
        candidateIds = this.btree.findRange(null, value, true);
        break;
      case 'in':
        if (Array.isArray(value)) {
          candidateIds = [];
          for (const val of value) {
            candidateIds.push(...this.btree.find(val));
          }
        } else {
          candidateIds = [];
        }
        break;
      case 'prefix':
        candidateIds = [];
        for (let i = 0; i < this.btree.keys.length; i++) {
          if (typeof this.btree.keys[i] === 'string' && this.btree.keys[i].startsWith(value)) {
            candidateIds.push(...this.btree.values[i]);
          }
        }
        break;
      case 'range':
        if (Array.isArray(value) && value.length === 2) {
          candidateIds = this.btree.findRange(value[0], value[1], true);
        } else {
          candidateIds = [];
        }
        break;
      default:
        return null;
    }
    // Debug output for candidate IDs
    if (process.env.DEBUG_INDEX) {
      // eslint-disable-next-line no-console
      console.log('[EnhancedIndex.find] KEYS:', this.btree.keys);
      // eslint-disable-next-line no-console
      console.log('[EnhancedIndex.find]', { operator, value, candidateIds });
    }
    // Post-filter using matchDocument for all non-eq queries
    if (operator !== 'eq') {
      // We need access to the document data to do this. Assume docToKeys has all doc ids, but we need the actual docs.
      // This method currently only returns ids, so the caller (Collection) must still filter the docs.
      // For now, return all candidate ids as a Set, and let the Collection filter. (If we had a doc map, we could filter here.)
      // Optionally, if we had a doc map, we could:
      // const filtered = candidateIds.filter(id => matchDocument(docMap[id], query));
      // return new Set(filtered);
      // But for now, just:
      return new Set(candidateIds);
    }
    return new Set(candidateIds);
  }

  /**
   * Check if the query can use this index and extract query information
   * Now supports multi-field range queries for compound indexes.
   */
  private canUseIndex(query: Query): { field: string, operator: string, value: any } | null {
    // For single field indexes
    if (this.fields.length === 1) {
      const field = this.fields[0];
      if (field in query) {
        const condition = query[field as keyof typeof query];
        if (typeof condition !== 'object' || condition === null) {
          return { field, operator: 'eq', value: condition };
        }
        if (condition.$eq !== undefined) {
          return { field, operator: 'eq', value: condition.$eq };
        }
        if (condition.$gt !== undefined) {
          return { field, operator: 'gt', value: condition.$gt };
        }
        if (condition.$gte !== undefined) {
          return { field, operator: 'gte', value: condition.$gte };
        }
        if (condition.$lt !== undefined) {
          return { field, operator: 'lt', value: condition.$lt };
        }
        if (condition.$lte !== undefined) {
          return { field, operator: 'lte', value: condition.$lte };
        }
        if (condition.$in !== undefined && Array.isArray(condition.$in)) {
          return { field, operator: 'in', value: condition.$in };
        }
      }
    }

    // For compound indexes, support multi-field range queries
    if (this.fields.length > 1) {
      let prefixLen = 0;
      const lower: (string | number | null)[] = [];
      const upper: (string | number | null)[] = [];
      let allFieldsHaveCondition = true;
      for (let i = 0; i < this.fields.length; i++) {
        const fieldName = this.fields[i];
        if (!(fieldName in query)) {
          allFieldsHaveCondition = false;
          // Always use '' for missing lower, '\uffff' for missing upper
          lower.push('');
          upper.push('\uffff');
          break;
        }
        const condition = query[fieldName as keyof typeof query];
        if (typeof condition !== 'object' || condition === null) {
          lower.push(condition);
          upper.push(condition);
          prefixLen++;
        } else {
          // Range support: $gte/$gt for lower, $lte/$lt for upper
          let hasLower = false, hasUpper = false;
          if (condition.$gte !== undefined) {
            lower.push(condition.$gte);
            hasLower = true;
          } else if (condition.$gt !== undefined) {
            lower.push(condition.$gt);
            hasLower = true;
          } else {
            lower.push(''); // Use '' for missing lower bound
          }
          if (condition.$lte !== undefined) {
            upper.push(condition.$lte);
            hasUpper = true;
          } else if (condition.$lt !== undefined) {
            upper.push(condition.$lt);
            hasUpper = true;
          } else {
            upper.push('\uffff'); // Use '\uffff' for missing upper bound
          }
          if (hasLower || hasUpper) {
            prefixLen++;
          } else if (condition.$eq !== undefined) {
            lower[prefixLen] = condition.$eq;
            upper[prefixLen] = condition.$eq;
            prefixLen++;
          } else if (condition.$in !== undefined && Array.isArray(condition.$in)) {
            if (i === this.fields.length - 1) {
              return { field: this.fields.slice(0, prefixLen + 1).join(','), operator: 'in', value: condition.$in.map((v: any) => this.getCompoundKey([...lower.slice(0, i), v])) };
            } else {
              break;
            }
          } else {
            break;
          }
        }
      }
      if (prefixLen === 0) return null;
      // If all fields matched exactly
      if (allFieldsHaveCondition && lower.every((v, i) => v !== null && v === upper[i])) {
        return { field: this.fields.join(','), operator: 'eq', value: this.getCompoundKey(lower as (string | number)[]) };
      }
      // If at least one field has a range
      if (prefixLen > 0 && (lower.some((v, i) => v !== null && v !== upper[i]) || upper.some((v, i) => v !== null && v !== lower[i]))) {
        // Compose start and end keys for B-tree scan
        const fill = (arr: (string | number | null)[], fillTo: number, fillValue: string | number) => {
          const out = arr.slice();
          while (out.length < fillTo) out.push(fillValue);
          return out;
        };
        // Use '' for lowest, '\uffff' for highest
        const startKey = this.getCompoundKey(fill(lower, this.fields.length, ''));
        const endKey = this.getCompoundKey(fill(upper, this.fields.length, '\uffff'));
        return { field: this.fields.slice(0, prefixLen).join(','), operator: 'range', value: [startKey, endKey] };
      }
      // If only a prefix of fields matched (all eq)
      if (prefixLen > 0 && prefixLen < this.fields.length && lower.every((v, i) => v !== null && v === upper[i])) {
        const prefix = lower.slice(0, prefixLen).map(v => {
          if (v === null || v === undefined) return 'null';
          if (typeof v === 'string') return v.replace(/\|/g, '\\|');
          return String(v);
        }).join('|');
        return { field: this.fields.slice(0, prefixLen).join(','), operator: 'prefix', value: prefix };
      }
    }
    return null;
  }

  /**
   * Get the index keys for a document
   */
  private getIndexKeys(doc: Document): (string | number)[] {
    if (this.fields.length === 1) {
      // Single field index
      const fieldName = this.fields[0];
      const value = this.getFieldValue(doc, fieldName);

      if (value === undefined) {
        return this.options.sparse ? [] : [''];
      }

      if (this.type === IndexType.MULTI && Array.isArray(value)) {
        return value.map(v => this.normalizeValue(v));
      }

      return [this.normalizeValue(value)];
    } else {
      // Compound index
      const values = this.fields.map(field => {
        const value = this.getFieldValue(doc, field);
        return value === undefined ? '' : this.normalizeValue(value);
      });

      // If any required field is undefined and not sparse, skip
      if (!this.options.sparse && values.some(v => v === '')) {
        return [];
      }

      // Filter out empty values and cast to (string | number)[] to satisfy TypeScript
      const nonEmptyValues = values.filter(v => v !== '') as (string | number)[];
      return [this.getCompoundKey(nonEmptyValues)];
    }
  }

  /**
   * Get a field value from a document, supporting nested fields
   */
  private getFieldValue(doc: any, field: string): any {
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
   * Normalize a value for indexing
   */
  private normalizeValue(value: any): string | number {
    if (value === null || value === undefined) {
      return null as any;
    }

    if (typeof value === 'string' && this.options.caseInsensitive) {
      return value.toLowerCase();
    }

    if (typeof value === 'number' || typeof value === 'string') {
      return value;
    }

    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }

    if (value instanceof Date) {
      return value.getTime();
    }

    return JSON.stringify(value);
  }

  /**
   * Get a compound key from multiple values
   */
  private getCompoundKey(values: (string | number)[]): string {
    return values.map(v => {
      if (v === '' || v === undefined) {
        return '';
      }
      if (typeof v === 'string') {
        // Escape pipe characters in strings
        return v.replace(/\|/g, '\\|');
      }
      return String(v);
    }).join('|');
  }

  /**
   * Clear the index
   */
  clear(): void {
    this.btree = new BTreeNode<string>();
    this.uniqueValues.clear();
    this.docToKeys.clear();
    this.expiryIndex.clear();
  }

  /**
   * Check for expired documents and return their IDs
   */
  getExpiredDocumentIds(): string[] {
    if (!this.options.expireAfterSeconds) {
      return [];
    }

    const now = Date.now();
    const expiredIds: string[] = [];

    for (const [id, expiryTime] of this.expiryIndex.entries()) {
      if (expiryTime <= now) {
        expiredIds.push(id);
      }
    }

    return expiredIds;
  }
}

/**
 * Enhanced index manager for a collection
 */
export class EnhancedIndexManager {
  private indexes: Map<string, EnhancedIndex> = new Map();
  private defaultIndexes: Set<string> = new Set();

  /**
   * Create a new index
   */
  createIndex(definition: IndexDefinition): EnhancedIndex {
    if (this.indexes.has(definition.name)) {
      throw new Error(`Index ${definition.name} already exists`);
    }

    const index = new EnhancedIndex(definition);
    this.indexes.set(definition.name, index);
    return index;
  }

  /**
   * Create a default index for a field
   */
  createDefaultIndex(field: string): EnhancedIndex {
    const name = `${field}_idx`;

    if (this.indexes.has(name)) {
      return this.indexes.get(name)!;
    }

    const index = this.createIndex({
      name,
      fields: [field],
      type: IndexType.SINGLE
    });

    this.defaultIndexes.add(name);
    return index;
  }

  /**
   * Drop an index
   */
  dropIndex(name: string): boolean {
    this.defaultIndexes.delete(name);
    return this.indexes.delete(name);
  }

  /**
   * Get an index by name
   */
  getIndex(name: string): EnhancedIndex | undefined {
    return this.indexes.get(name);
  }

  /**
   * Get all indexes
   */
  getAllIndexes(): EnhancedIndex[] {
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

    // Create a map of document IDs to documents for faster lookup
    const docMap = new Map<string, Document>();
    for (const doc of allDocs) {
      docMap.set(doc.id, doc);
    }

    // Try to find the best index for this query
    const bestIndex = this.findBestIndex(query);

    if (bestIndex) {
      const { matchingIds } = bestIndex;

      // Use the index to filter documents
      const indexedResults: Document[] = [];
      for (const id of matchingIds) {
        const doc = docMap.get(id);
        if (doc) {
          indexedResults.push(doc);
        }
      }

      // Further filter the results with the full query
      return indexedResults.filter((doc: Document) => matchDocument(doc, query));
    }

    // No suitable index found, fall back to full scan
    return allDocs.filter(doc => matchDocument(doc, query));
  }

  /**
   * Find the best index for a query
   */
  private findBestIndex(query: Query): { index: EnhancedIndex, matchingIds: Set<string> } | null {
    let bestIndex: EnhancedIndex | null = null;
    let bestMatchingIds: Set<string> | null = null;
    let bestScore = 0;

    // First, try to find an exact match for the query fields
    const queryFields = Object.keys(query);

    // Check for compound indexes that exactly match the query fields
    for (const index of this.indexes.values()) {
      if (index.fields.length > 1) {
        // For compound indexes, check if all index fields are in the query
        const allFieldsInQuery = index.fields.every(field => queryFields.includes(field));

        if (allFieldsInQuery) {
          const matchingIds = index.find(query);

          if (matchingIds !== null) {
            // Compound indexes that match all fields get a high score
            const score = 2000000 / (matchingIds.size + 1);

            if (score > bestScore) {
              bestIndex = index;
              bestMatchingIds = matchingIds;
              bestScore = score;
            }
          }
        }
      }
    }

    // If no compound index was found, check single field indexes
    if (!bestIndex) {
      for (const index of this.indexes.values()) {
        if (index.fields.length === 1) {
          // For single field indexes, check if the field is in the query
          const field = index.fields[0];

          if (queryFields.includes(field)) {
            const matchingIds = index.find(query);

            if (matchingIds !== null) {
              // Score based on selectivity and query complexity
              let score = 1000000 / (matchingIds.size + 1);

              // Boost score for equality queries on this field
              if (field in query) {
                const condition = query[field as keyof typeof query];
                if (typeof condition !== 'object' || (condition && '$eq' in condition)) {
                  score *= 1.5;
                }
              }

              if (score > bestScore) {
                bestIndex = index;
                bestMatchingIds = matchingIds;
                bestScore = score;
              }
            }
          }
        }
      }
    }

    // If still no index found, check all indexes as a fallback
    if (!bestIndex) {
      for (const index of this.indexes.values()) {
        const matchingIds = index.find(query);

        if (matchingIds !== null) {
          // Score the index based on selectivity (fewer matches is better)
          const score = 1000000 / (matchingIds.size + 1);

          if (score > bestScore) {
            bestIndex = index;
            bestMatchingIds = matchingIds;
            bestScore = score;
          }
        }
      }
    }

    if (bestIndex && bestMatchingIds) {
      return { index: bestIndex, matchingIds: bestMatchingIds };
    }

    return null;
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
   * Analyze a collection and create indexes for frequently queried fields
   */
  analyzeAndCreateIndexes(_documents: Document[], queryHistory: Query[]): void {
    // Count field occurrences in queries
    const fieldCounts = new Map<string, number>();

    for (const query of queryHistory) {
      for (const field of Object.keys(query)) {
        fieldCounts.set(field, (fieldCounts.get(field) || 0) + 1);
      }
    }

    // Create indexes for frequently queried fields
    for (const [field, count] of fieldCounts.entries()) {
      if (count >= 3 && !this.hasIndexForField(field)) {
        this.createDefaultIndex(field);
      }
    }

    // Analyze for compound indexes
    this.analyzeForCompoundIndexes(queryHistory);
  }

  /**
   * Analyze query history for potential compound indexes
   */
  private analyzeForCompoundIndexes(queryHistory: Query[]): void {
    // Count field combinations in queries
    const fieldComboCounts = new Map<string, number>();

    for (const query of queryHistory) {
      const fields = Object.keys(query).sort();

      // Consider combinations of 2 or more fields
      if (fields.length >= 2) {
        const fieldKey = fields.join(',');
        fieldComboCounts.set(fieldKey, (fieldComboCounts.get(fieldKey) || 0) + 1);
      }
    }

    // Create compound indexes for frequently queried field combinations
    for (const [fieldCombo, count] of fieldComboCounts.entries()) {
      if (count >= 2) { // Lower threshold for compound indexes
        const fields = fieldCombo.split(',');
        const indexName = `${fields.join('_')}_idx`;

        // Check if this compound index already exists
        if (!this.indexes.has(indexName)) {
          this.createIndex({
            name: indexName,
            fields,
            type: IndexType.COMPOUND
          });
        }
      }
    }
  }

  /**
   * Check for and remove expired documents
   * Returns the IDs of expired documents that were removed
   */
  removeExpiredDocuments(): string[] {
    const expiredIds: string[] = [];

    // Check each index for expired documents
    for (const index of this.indexes.values()) {
      const indexExpiredIds = index.getExpiredDocumentIds();

      // Add unique IDs to the result
      for (const id of indexExpiredIds) {
        if (!expiredIds.includes(id)) {
          expiredIds.push(id);
        }
      }
    }

    return expiredIds;
  }

  /**
   * Check if there's an index for a field
   */
  private hasIndexForField(field: string): boolean {
    for (const index of this.indexes.values()) {
      if (index.fields.length === 1 && index.fields[0] === field) {
        return true;
      }
    }
    return false;
  }
}
