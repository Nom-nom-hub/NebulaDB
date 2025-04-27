/**
 * Optimizes queries with nested properties
 */
export class NestedQueryOptimizer {
  /**
   * Flatten nested query paths for faster access
   */
  static flattenQueryPaths(query: any): any {
    if (!query || typeof query !== 'object') {
      return query;
    }

    // Handle special operators
    if (query.$or || query.$and) {
      const key = query.$or ? '$or' : '$and';
      return {
        [key]: query[key].map((subQuery: any) => this.flattenQueryPaths(subQuery))
      };
    }

    const result: any = {};
    
    for (const [key, value] of Object.entries(query)) {
      if (key.includes('.')) {
        // This is a nested path query
        result[key] = this.optimizeNestedValue(value);
      } else if (typeof value === 'object' && value !== null && !Object.keys(value).some(k => k.startsWith('$'))) {
        // This is a nested object query, flatten it
        const flattenedSubQueries = this.flattenNestedObject(key, value);
        Object.assign(result, flattenedSubQueries);
      } else {
        // Regular query or operator
        result[key] = this.optimizeNestedValue(value);
      }
    }
    
    return result;
  }

  /**
   * Optimize nested value (recursively process objects)
   */
  private static optimizeNestedValue(value: any): any {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Check if this is an operator object
      const isOperator = Object.keys(value).some(k => k.startsWith('$'));
      
      if (isOperator) {
        // Process operator values
        const result: any = {};
        for (const [opKey, opValue] of Object.entries(value)) {
          result[opKey] = this.optimizeNestedValue(opValue);
        }
        return result;
      } else {
        // Recursively flatten nested object
        return this.flattenQueryPaths(value);
      }
    }
    
    return value;
  }

  /**
   * Flatten a nested object into dot notation
   */
  private static flattenNestedObject(prefix: string, obj: any): any {
    const result: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const newKey = `${prefix}.${key}`;
      
      if (value && typeof value === 'object' && !Array.isArray(value) && 
          !Object.keys(value).some(k => k.startsWith('$'))) {
        // Recursively flatten nested objects
        Object.assign(result, this.flattenNestedObject(newKey, value));
      } else {
        // Add leaf node
        result[newKey] = value;
      }
    }
    
    return result;
  }

  /**
   * Create optimized path accessor function for nested properties
   */
  static createPathAccessor(path: string): (obj: any) => any {
    const parts = path.split('.');
    
    // Optimize for common cases
    if (parts.length === 1) {
      return (obj: any) => obj[parts[0]];
    } else if (parts.length === 2) {
      return (obj: any) => {
        const first = obj[parts[0]];
        return first ? first[parts[1]] : undefined;
      };
    } else if (parts.length === 3) {
      return (obj: any) => {
        const first = obj[parts[0]];
        if (!first) return undefined;
        const second = first[parts[1]];
        return second ? second[parts[2]] : undefined;
      };
    }
    
    // General case for deeply nested paths
    return (obj: any) => {
      let current = obj;
      for (const part of parts) {
        if (current == null) return undefined;
        current = current[part];
      }
      return current;
    };
  }
}