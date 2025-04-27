import { NestedQueryOptimizer } from '../query/nested-query-optimizer';

/**
 * Index for nested properties
 */
export class NestedPropertyIndex {
  private indexMap: Map<string, Map<any, Set<string>>> = new Map();
  private path: string;
  private pathAccessor: (obj: any) => any;

  /**
   * Create a new nested property index
   */
  constructor(path: string) {
    this.path = path;
    this.pathAccessor = NestedQueryOptimizer.createPathAccessor(path);
  }

  /**
   * Add a document to the index
   */
  addDocument(docId: string, document: any): void {
    const value = this.pathAccessor(document);
    
    // Handle array values
    if (Array.isArray(value)) {
      for (const item of value) {
        this.addValueToIndex(item, docId);
      }
    } else {
      this.addValueToIndex(value, docId);
    }
  }

  /**
   * Add a value to the index
   */
  private addValueToIndex(value: any, docId: string): void {
    // Skip undefined values
    if (value === undefined) return;
    
    // Get or create the value map
    let valueMap = this.indexMap.get(typeof value);
    if (!valueMap) {
      valueMap = new Map();
      this.indexMap.set(typeof value, valueMap);
    }
    
    // Get or create the document set
    let docSet = valueMap.get(value);
    if (!docSet) {
      docSet = new Set();
      valueMap.set(value, docSet);
    }
    
    // Add the document ID
    docSet.add(docId);
  }

  /**
   * Remove a document from the index
   */
  removeDocument(docId: string, document: any): void {
    const value = this.pathAccessor(document);
    
    // Handle array values
    if (Array.isArray(value)) {
      for (const item of value) {
        this.removeValueFromIndex(item, docId);
      }
    } else {
      this.removeValueFromIndex(value, docId);
    }
  }

  /**
   * Remove a value from the index
   */
  private removeValueFromIndex(value: any, docId: string): void {
    // Skip undefined values
    if (value === undefined) return;
    
    // Get the value map
    const valueMap = this.indexMap.get(typeof value);
    if (!valueMap) return;
    
    // Get the document set
    const docSet = valueMap.get(value);
    if (!docSet) return;
    
    // Remove the document ID
    docSet.delete(docId);
    
    // Clean up empty sets
    if (docSet.size === 0) {
      valueMap.delete(value);
      
      // Clean up empty maps
      if (valueMap.size === 0) {
        this.indexMap.delete(typeof value);
      }
    }
  }

  /**
   * Find documents matching a query
   */
  findDocuments(operator: string, value: any): Set<string> | null {
    // Handle different operators
    switch (operator) {
      case '$eq':
        return this.findEqualDocuments(value);
      case '$gt':
        return this.findGreaterThanDocuments(value);
      case '$gte':
        return this.findGreaterThanOrEqualDocuments(value);
      case '$lt':
        return this.findLessThanDocuments(value);
      case '$lte':
        return this.findLessThanOrEqualDocuments(value);
      case '$in':
        return this.findInDocuments(value);
      case '$contains':
        return this.findContainsDocuments(value);
      default:
        return null; // Operator not supported by index
    }
  }

  /**
   * Find documents with equal value
   */
  private findEqualDocuments(value: any): Set<string> | null {
    const valueMap = this.indexMap.get(typeof value);
    if (!valueMap) return new Set(); // No documents with this type
    
    const docSet = valueMap.get(value);
    return docSet || new Set(); // Return empty set if no documents match
  }

  /**
   * Find documents with value greater than the given value
   */
  private findGreaterThanDocuments(value: any): Set<string> | null {
    const valueMap = this.indexMap.get(typeof value);
    if (!valueMap) return null; // Cannot use index for this query
    
    const result = new Set<string>();
    
    for (const [indexValue, docSet] of valueMap.entries()) {
      if (indexValue > value) {
        for (const docId of docSet) {
          result.add(docId);
        }
      }
    }
    
    return result;
  }

  /**
   * Find documents with value greater than or equal to the given value
   */
  private findGreaterThanOrEqualDocuments(value: any): Set<string> | null {
    const valueMap = this.indexMap.get(typeof value);
    if (!valueMap) return null; // Cannot use index for this query
    
    const result = new Set<string>();
    
    for (const [indexValue, docSet] of valueMap.entries()) {
      if (indexValue >= value) {
        for (const docId of docSet) {
          result.add(docId);
        }
      }
    }
    
    return result;
  }

  /**
   * Find documents with value less than the given value
   */
  private findLessThanDocuments(value: any): Set<string> | null {
    const valueMap = this.indexMap.get(typeof value);
    if (!valueMap) return null; // Cannot use index for this query
    
    const result = new Set<string>();
    
    for (const [indexValue, docSet] of valueMap.entries()) {
      if (indexValue < value) {
        for (const docId of docSet) {
          result.add(docId);
        }
      }
    }
    
    return result;
  }

  /**
   * Find documents with value less than or equal to the given value
   */
  private findLessThanOrEqualDocuments(value: any): Set<string> | null {
    const valueMap = this.indexMap.get(typeof value);
    if (!valueMap) return null; // Cannot use index for this query
    
    const result = new Set<string>();
    
    for (const [indexValue, docSet] of valueMap.entries()) {
      if (indexValue <= value) {
        for (const docId of docSet) {
          result.add(docId);
        }
      }
    }
    
    return result;
  }

  /**
   * Find documents with value in the given array
   */
  private findInDocuments(values: any[]): Set<string> | null {
    if (!Array.isArray(values)) return new Set();
    
    const result = new Set<string>();
    
    for (const value of values) {
      const valueMap = this.indexMap.get(typeof value);
      if (!valueMap) continue;
      
      const docSet = valueMap.get(value);
      if (!docSet) continue;
      
      for (const docId of docSet) {
        result.add(docId);
      }
    }
    
    return result;
  }

  /**
   * Find documents containing the given value
   */
  private findContainsDocuments(value: any): Set<string> | null {
    // This is for arrays containing a specific value
    // We've indexed each array item separately, so we can use the equal index
    return this.findEqualDocuments(value);
  }
}