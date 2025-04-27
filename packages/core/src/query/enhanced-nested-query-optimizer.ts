/**
 * Enhanced query optimizer for nested queries
 */
// Define query-related types outside the class
interface QueryCondition {
  [key: string]: any;
  $and?: QueryCondition[];
  $or?: QueryCondition[];
}

interface QueryOperators {
  $eq?: any;
  $in?: any[];
  $gt?: any;
  $lt?: any;
  $gte?: any;
  $lte?: any;
  $regex?: string | RegExp;
  [key: string]: any;
}

export class EnhancedNestedQueryOptimizer {
  /**
   * Creates an optimized path accessor function for nested properties
   * @param path The dot-notation path to access
   * @returns A function that efficiently accesses the path on an object
   */
  static createOptimizedPathAccessor(path: string): (obj: any) => any {
    const parts = path.split('.');

    // Optimize for common cases
    if (parts.length === 1) {
      return (obj: any) => obj?.[parts[0]];
    } else if (parts.length === 2) {
      return (obj: any) => obj?.[parts[0]]?.[parts[1]];
    } else if (parts.length === 3) {
      return (obj: any) => obj?.[parts[0]]?.[parts[1]]?.[parts[2]];
    }

    // For deeper paths, use a more general approach
    return (obj: any) => {
      let current = obj;
      for (const part of parts) {
        if (current == null) return undefined;
        current = current[part];
      }
      return current;
    };
  }

  /**
   * Optimizes a query by reordering conditions for better performance
   * @param query The query to optimize
   * @returns An optimized version of the query
   */
  static optimizeQuery(query: QueryCondition): QueryCondition {
    if (!query || typeof query !== 'object') {
      return query;
    }

    // Handle $and operator
    if (query.$and && Array.isArray(query.$and)) {
      // Optimize each condition in the $and array
      const optimizedConditions = query.$and.map((condition: QueryCondition) => this.optimizeQuery(condition));

      // Reorder conditions by selectivity (exact match first, then range, then regex)
      optimizedConditions.sort((a: QueryCondition, b: QueryCondition) => {
        return this.getConditionSelectivity(a) - this.getConditionSelectivity(b);
      });

      // Merge compatible conditions
      const mergedConditions = this.mergeCompatibleConditions(optimizedConditions);

      return { $and: mergedConditions };
    }

    // Handle $or operator
    if (query.$or && Array.isArray(query.$or)) {
      // Optimize each condition in the $or array
      const optimizedConditions = query.$or.map((condition: QueryCondition) => this.optimizeQuery(condition));
      return { $or: optimizedConditions };
    }

    // Handle regular field conditions
    const result: QueryCondition = {};
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'object' && value !== null) {
        result[key] = this.optimizeQuery(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Get the selectivity score of a condition (lower is more selective)
   * @param condition The condition to evaluate
   * @returns A selectivity score (lower means more selective)
   */
  private static getConditionSelectivity(condition: QueryCondition): number {
    // Exact equality is most selective
    if (typeof condition === 'string' || typeof condition === 'number' || typeof condition === 'boolean') {
      return 0;
    }

    // Check for operators
    for (const [/* key (unused) */, value] of Object.entries(condition)) {
      if (typeof value === 'object' && value !== null) {
        const operators = value as QueryOperators;
        // Check for equality operator
        if (operators.$eq !== undefined) {
          return 1;
        }
        // Check for in list operator
        if (operators.$in !== undefined) {
          return 2;
        }
        // Check for range operators
        if (operators.$gt !== undefined || operators.$lt !== undefined ||
            operators.$gte !== undefined || operators.$lte !== undefined) {
          return 3;
        }
        // Check for regex operator (least selective)
        if (operators.$regex !== undefined) {
          return 4;
        }
      }
    }

    // Default selectivity for other conditions
    return 5;
  }

  /**
   * Merge compatible conditions on the same field
   * @param conditions Array of conditions to merge
   * @returns Array with merged conditions
   */
  private static mergeCompatibleConditions(conditions: QueryCondition[]): QueryCondition[] {
    const fieldConditions: Record<string, any> = {};
    const result: QueryCondition[] = [];

    // Group conditions by field
    for (const condition of conditions) {
      // Skip complex conditions ($and, $or)
      if (condition.$and || condition.$or) {
        result.push(condition);
        continue;
      }

      // Process simple field conditions
      for (const [field, value] of Object.entries(condition)) {
        if (!fieldConditions[field]) {
          fieldConditions[field] = {};
        }

        // Merge operators
        if (typeof value === 'object' && value !== null) {
          for (const [op, opValue] of Object.entries(value)) {
            fieldConditions[field][op] = opValue;
          }
        } else {
          // Direct value assignment
          fieldConditions[field] = value;
        }
      }
    }

    // Create merged conditions
    for (const [field, value] of Object.entries(fieldConditions)) {
      result.push({ [field]: value });
    }

    return result;
  }

  /**
   * Creates a batch path accessor for efficiently accessing multiple paths on multiple objects
   * @param paths Array of dot-notation paths to access
   * @returns A function that returns a Map of path to array of values
   */
  static createBatchPathAccessor(paths: string[]): (objects: any[]) => Map<string, any[]> {
    // Create optimized accessors for each path
    const accessors = new Map<string, (obj: any) => any>();
    for (const path of paths) {
      accessors.set(path, this.createOptimizedPathAccessor(path));
    }

    // Return a function that applies all accessors to all objects
    return (objects: any[]): Map<string, any[]> => {
      const results = new Map<string, any[]>();

      // Initialize result arrays
      for (const path of paths) {
        results.set(path, new Array(objects.length));
      }

      // Process all objects
      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];

        // Apply each accessor
        for (const [path, accessor] of accessors.entries()) {
          results.get(path)![i] = accessor(obj);
        }
      }

      return results;
    };
  }
}
