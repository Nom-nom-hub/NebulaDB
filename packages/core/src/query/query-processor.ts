import { NestedQueryOptimizer } from './nested-query-optimizer';

export class QueryProcessor {
  // Cache for path accessors to avoid recreating them for each document
  private static pathAccessorCache: Map<string, (obj: any) => any> = new Map();

  /**
   * Process a query against a collection of documents
   */
  static processQuery(documents: any[], query: any): any[] {
    // Optimize query structure for nested properties
    const optimizedQuery = NestedQueryOptimizer.flattenQueryPaths(query);
    
    // Create a matcher function based on the optimized query
    const matcher = this.createMatcher(optimizedQuery);
    
    // Apply the matcher to each document
    return documents.filter(matcher);
  }

  /**
   * Create a matcher function for the given query
   */
  private static createMatcher(query: any): (doc: any) => boolean {
    // Handle special operators
    if (query.$or) {
      const orMatchers = query.$or.map((subQuery: any) => this.createMatcher(subQuery));
      return (doc: any) => orMatchers.some((matcher: (doc: any) => boolean) => matcher(doc));
    }
    
    if (query.$and) {
      const andMatchers = query.$and.map((subQuery: any) => this.createMatcher(subQuery));
      return (doc: any) => andMatchers.every((matcher: (doc: any) => boolean) => matcher(doc));
    }
    
    // Handle regular field conditions
    const conditions = Object.entries(query).map(([field, condition]) => {
      return this.createFieldMatcher(field, condition);
    });
    
    // Document matches if all conditions match
    return (doc: any) => conditions.every(condition => condition(doc));
  }

  /**
   * Create a matcher function for a specific field
   */
  private static createFieldMatcher(field: string, condition: any): (doc: any) => boolean {
    // Get or create path accessor function
    let accessor = this.pathAccessorCache.get(field);
    if (!accessor) {
      accessor = NestedQueryOptimizer.createPathAccessor(field);
      this.pathAccessorCache.set(field, accessor);
    }
    
    // Handle different condition types
    if (condition === null) {
      return (doc: any) => accessor(doc) === null;
    }
    
    if (typeof condition !== 'object') {
      return (doc: any) => accessor(doc) === condition;
    }
    
    // Handle operator conditions
    const operatorMatchers = Object.entries(condition).map(([op, value]) => {
      return this.createOperatorMatcher(op, value, accessor);
    });
    
    return (doc: any) => operatorMatchers.every(matcher => matcher(doc));
  }

  /**
   * Create a matcher function for a specific operator
   */
  private static createOperatorMatcher(
    operator: string, 
    value: any, 
    accessor: (doc: any) => any
  ): (doc: any) => boolean {
    switch (operator) {
      case '$eq':
        return (doc: any) => accessor(doc) === value;
      case '$ne':
        return (doc: any) => accessor(doc) !== value;
      case '$gt':
        return (doc: any) => accessor(doc) > value;
      case '$gte':
        return (doc: any) => accessor(doc) >= value;
      case '$lt':
        return (doc: any) => accessor(doc) < value;
      case '$lte':
        return (doc: any) => accessor(doc) <= value;
      case '$in':
        return (doc: any) => {
          const fieldValue = accessor(doc);
          return Array.isArray(value) && value.includes(fieldValue);
        };
      case '$nin':
        return (doc: any) => {
          const fieldValue = accessor(doc);
          return !Array.isArray(value) || !value.includes(fieldValue);
        };
      case '$contains':
        return (doc: any) => {
          const fieldValue = accessor(doc);
          return Array.isArray(fieldValue) && fieldValue.includes(value);
        };
      default:
        // Unknown operator, always return false
        return () => false;
    }
  }
}