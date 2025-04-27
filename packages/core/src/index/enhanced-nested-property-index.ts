import { EnhancedNestedQueryOptimizer } from '../query/enhanced-nested-query-optimizer';

/**
 * Enhanced index for nested properties with improved performance
 */
export class EnhancedNestedPropertyIndex {
  private indexMap: Map<string, Map<any, Set<string>>> = new Map();
  private path: string;
  private pathAccessor: (obj: any) => any;
  private typeHierarchy: { [key: string]: number } = {
    'undefined': 0,
    'boolean': 1,
    'number': 2,
    'string': 3,
    'object': 4
  };

  /**
   * Create a new enhanced nested property index
   */
  constructor(path: string) {
    this.path = path;
    this.pathAccessor = EnhancedNestedQueryOptimizer.createOptimizedPathAccessor(path);
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
      case '$startsWith':
        return this.findStartsWithDocuments(value);
      case '$endsWith':
        return this.findEndsWithDocuments(value);
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
    const valueType = typeof value;
    const result = new Set<string>();
    
    // For each type in the hierarchy
    for (const [type, level] of Object.entries(this.typeHierarchy)) {
      // Skip types lower in hierarchy than the value type
      if (level < this.typeHierarchy[valueType]) continue;
      
      const valueMap = this.indexMap.get(type);
      if (!valueMap) continue;
      
      // If it's a higher type, include all documents
      if (level > this.typeHierarchy[valueType]) {
        for (const docSet of valueMap.values()) {
          for (const docId of docSet) {
            result.add(docId);
          }
        }
        continue;
      }
      
      // For the same type, compare values
      for (const [indexValue, docSet] of valueMap.entries()) {
        if (indexValue > value) {
          for (const docId of docSet) {
            result.add(docId);
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Find documents with value greater than or equal to the given value
   */
  private findGreaterThanOrEqualDocuments(value: any): Set<string> | null {
    const valueType = typeof value;
    const result = new Set<string>();
    
    // For each type in the hierarchy
    for (const [type, level] of Object.entries(this.typeHierarchy)) {
      // Skip types lower in hierarchy than the value type
      if (level < this.typeHierarchy[valueType]) continue;
      
      const valueMap = this.indexMap.get(type);
      if (!valueMap) continue;
      
      // If it's a higher type, include all documents
      if (level > this.typeHierarchy[valueType]) {
        for (const docSet of valueMap.values()) {
          for (const docId of docSet) {
            result.add(docId);
          }
        }
        continue;
      }
      
      // For the same type, compare values
      for (const [indexValue, docSet] of valueMap.entries()) {
        if (indexValue >= value) {
          for (const docId of docSet) {
            result.add(docId);
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Find documents with value less than the given value
   */
  private findLessThanDocuments(value: any): Set<string> | null {
    const valueType = typeof value;
    const result = new Set<string>();
    
    // For each type in the hierarchy
    for (const [type, level] of Object.entries(this.typeHierarchy)) {
      // Skip types higher in hierarchy than the value type
      if (level > this.typeHierarchy[valueType]) continue;
      
      const valueMap = this.indexMap.get(type);
      if (!valueMap) continue;
      
      // If it's a lower type, include all documents
      if (level < this.typeHierarchy[valueType]) {
        for (const docSet of valueMap.values()) {
          for (const docId of docSet) {
            result.add(docId);
          }
        }
        continue;
      }
      
      // For the same type, compare values
      for (const [indexValue, docSet] of valueMap.entries()) {
        if (indexValue < value) {
          for (const docId of docSet) {
            result.add(docId);
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Find documents with value less than or equal to the given value
   */
  private findLessThanOrEqualDocuments(value: any): Set<string> | null {
    const valueType = typeof value;
    const result = new Set<string>();
    
    // For each type in the hierarchy
    for (const [type, level] of Object.entries(this.typeHierarchy)) {
      // Skip types higher in hierarchy than the value type
      if (level > this.typeHierarchy[valueType]) continue;
      
      const valueMap = this.indexMap.get(type);
      if (!valueMap) continue;
      
      // If it's a lower type, include all documents
      if (level < this.typeHierarchy[valueType]) {
        for (const docSet of valueMap.values()) {
          for (const docId of docSet) {
            result.add(docId);
          }
        }
        continue;
      }
      
      // For the same type, compare values
      for (const [indexValue, docSet] of valueMap.entries()) {
        if (indexValue <= value) {
          for (const docId of docSet) {
            result.add(docId);
          }
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
   * Find documents with array containing the given value
   */
  private findContainsDocuments(value: any): Set<string> | null {
    // This is a specialized case for arrays
    // We need to check if any document has an array value that contains the given value
    const result = new Set<string>();
    
    // Only string type supports contains for non-array fields
    if (typeof value === 'string') {
      const stringMap = this.indexMap.get('string');
      if (stringMap) {
        for (const [indexValue, docSet] of stringMap.entries()) {
          if (typeof indexValue === 'string' && indexValue.includes(value)) {
            for (const docId of docSet) {
              result.add(docId);
            }
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Find documents with string values starting with the given prefix
   */
  private findStartsWithDocuments(prefix: string): Set<string> | null {
    if (typeof prefix !== 'string') return new Set();
    
    const result = new Set<string>();
    const stringMap = this.indexMap.get('string');
    
    if (!stringMap) return result;
    
    for (const [indexValue, docSet] of stringMap.entries()) {
      if (typeof indexValue === 'string' && indexValue.startsWith(prefix)) {
        for (const docId of docSet) {
          result.add(docId);
        }
      }
    }
    
    return result;
  }

  /**
   * Find documents with string values ending with the given suffix
   */
  private findEndsWithDocuments(suffix: string): Set<string> | null {
    if (typeof suffix !== 'string') return new Set();
    
    const result = new Set<string>();
    const stringMap = this.indexMap.get('string');
    
    if (!stringMap) return result;
    
    for (const [indexValue, docSet] of stringMap.entries()) {
      if (typeof indexValue === 'string' && indexValue.endsWith(suffix)) {
        for (const docId of docSet) {
          result.add(docId);
        }
      }
    }
    
    return result;
  }

  /**
   * Get statistics about this index
   */
  getStats(): { 
    path: string, 
    totalDocuments: number,
    valueTypes: { [type: string]: number },
    memoryUsageEstimate: number
  } {
    let totalDocuments = 0;
    const valueTypes: { [type: string]: number } = {};
    let memoryUsageEstimate = 0;
    
    // Calculate total documents and value types
    for (const [type, valueMap] of this.indexMap.entries()) {
      valueTypes[type] = 0;
      
      for (const docSet of valueMap.values()) {
        totalDocuments += docSet.size;
        valueTypes[type] += docSet.size;
        
        // Rough estimate: 8 bytes per reference + string length
        memoryUsageEstimate += docSet.size * 8;
      }
    }
    
    return {
      path: this.path,
      totalDocuments,
      valueTypes,
      memoryUsageEstimate
    };
  }
}
