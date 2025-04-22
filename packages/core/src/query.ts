import { Document, Query, /* QueryCondition, */ LogicalQuery } from './types';

/**
 * Matches a document against a query
 */
export function matchDocument(doc: Document, query: Query): boolean {
  // If query is empty, match all documents
  if (!query || Object.keys(query).length === 0) {
    return true;
  }

  // Check if query is a logical query
  if ('$and' in query || '$or' in query || '$not' in query) {
    return matchLogicalQuery(doc, query as LogicalQuery);
  }

  // Otherwise, match all fields in the query
  return Object.entries(query).every(([field, condition]) => {
    return matchField(doc, field, condition);
  });
}

/**
 * Matches a document against a logical query ($and, $or, $not)
 */
function matchLogicalQuery(doc: Document, query: LogicalQuery): boolean {
  if ('$and' in query && Array.isArray(query.$and)) {
    return query.$and.every(subQuery => matchDocument(doc, subQuery));
  }

  if ('$or' in query && Array.isArray(query.$or)) {
    return query.$or.some(subQuery => matchDocument(doc, subQuery));
  }

  if ('$not' in query) {
    if (Array.isArray(query.$not)) {
      return !query.$not.some(subQuery => matchDocument(doc, subQuery));
    } else if (typeof query.$not === 'object') {
      return !matchDocument(doc, query.$not as Query);
    }
  }

  // Check for other fields in the query (mixed logical and field queries)
  const nonLogicalFields = Object.entries(query).filter(([key]) => !['$and', '$or', '$not'].includes(key));
  if (nonLogicalFields.length > 0) {
    return nonLogicalFields.every(([field, condition]) => matchField(doc, field, condition));
  }

  return false;
}

/**
 * Matches a field in a document against a condition
 */
function matchField(doc: Document, field: string, condition: any): boolean {
  // Handle nested fields using dot notation
  if (field.includes('.')) {
    const [first, ...rest] = field.split('.');
    const nestedDoc = doc[first];

    if (nestedDoc === undefined) {
      return false;
    }

    return matchField(nestedDoc, rest.join('.'), condition);
  }

  // Get the value from the document
  const value = doc[field];

  // If condition is a query operator object
  if (condition !== null && typeof condition === 'object' && !Array.isArray(condition)) {
    return Object.entries(condition).every(([operator, operand]) => {
      return matchOperator(value, operator, operand);
    });
  }

  // Handle array values - check if any element matches the condition
  if (Array.isArray(value)) {
    return value.some(item => deepEqual(item, condition));
  }

  // Simple equality check
  return deepEqual(value, condition);
}

/**
 * Matches a value against a query operator
 */
function matchOperator(value: any, operator: string, operand: any): boolean {
  switch (operator) {
    case '$eq':
      return deepEqual(value, operand);
    case '$ne':
      return !deepEqual(value, operand);
    case '$gt':
      return value > operand;
    case '$gte':
      return value >= operand;
    case '$lt':
      return value < operand;
    case '$lte':
      return value <= operand;
    case '$in':
      if (Array.isArray(operand)) {
        // If value is an array, check if any element in value is in operand
        if (Array.isArray(value)) {
          return value.some(val => operand.some(item => deepEqual(val, item)));
        }
        // Otherwise check if value is in operand
        return operand.some(item => deepEqual(value, item));
      }
      return false;
    case '$nin':
      if (Array.isArray(operand)) {
        // If value is an array, check that no element in value is in operand
        if (Array.isArray(value)) {
          return !value.some(val => operand.some(item => deepEqual(val, item)));
        }
        // Otherwise check that value is not in operand
        return !operand.some(item => deepEqual(value, item));
      }
      return true;
    case '$regex':
      return new RegExp(operand).test(value);
    case '$exists':
      return operand ? value !== undefined : value === undefined;
    default:
      // If not a recognized operator, treat as a field name for nested queries
      if (value && typeof value === 'object') {
        return matchField(value, operator, operand);
      }
      return false;
  }
}

/**
 * Deep equality check for any two values
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  return keysA.every(key => keysB.includes(key) && deepEqual(a[key], b[key]));
}

/**
 * Applies an update operation to a document
 */
export function applyUpdate(doc: Document, update: any): Document {
  const result = { ...doc };

  if (update.$set) {
    Object.entries(update.$set).forEach(([field, value]) => {
      setNestedField(result, field, value);
    });
  }

  if (update.$unset) {
    Object.entries(update.$unset).forEach(([field]) => {
      unsetNestedField(result, field);
    });
  }

  if (update.$inc) {
    Object.entries(update.$inc).forEach(([field, value]) => {
      const currentValue = getNestedField(result, field) || 0;
      if (typeof currentValue === 'number' && typeof value === 'number') {
        setNestedField(result, field, currentValue + value);
      }
    });
  }

  if (update.$push) {
    Object.entries(update.$push).forEach(([field, value]) => {
      const currentValue = getNestedField(result, field);
      if (Array.isArray(currentValue)) {
        setNestedField(result, field, [...currentValue, value]);
      } else {
        setNestedField(result, field, [value]);
      }
    });
  }

  if (update.$pull) {
    Object.entries(update.$pull).forEach(([field, value]) => {
      const currentValue = getNestedField(result, field);
      if (Array.isArray(currentValue)) {
        setNestedField(
          result,
          field,
          currentValue.filter(item => !deepEqual(item, value))
        );
      }
    });
  }

  return result;
}

/**
 * Gets a nested field value using dot notation
 */
function getNestedField(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Sets a nested field value using dot notation
 */
function setNestedField(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || current[part] === null) {
      current[part] = {};
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Unsets a nested field using dot notation
 */
function unsetNestedField(obj: any, path: string): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      return;
    }
    current = current[part];
  }

  delete current[parts[parts.length - 1]];
}
