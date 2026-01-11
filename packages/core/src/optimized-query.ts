import { Document, Query, LogicalQuery } from './types';

/**
 * Deep equality check for two values
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }

  if (typeof a !== typeof b) return false;

  if (typeof a === 'object') {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => deepEqual(item, b[index]));
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every(key => keysB.includes(key) && deepEqual(a[key], b[key]));
  }

  return false;
}

/**
 * Check if a document matches a query
 */
export function matchDocument(doc: Document, query: Query): boolean {
  // Empty query matches everything
  if (Object.keys(query).length === 0) {
    return true;
  }

  // Check if it's a logical query
  if ('$and' in query || '$or' in query || '$not' in query) {
    return matchLogicalQuery(doc, query as LogicalQuery);
  }

  // Check each field in the query
  return Object.entries(query).every(([field, condition]) => {
    // Short-circuit if field doesn't exist in document
    if (!(field in doc) && condition !== undefined) {
      // Special case for $exists operator
      if (typeof condition === 'object' && condition !== null && '$exists' in condition) {
        return condition.$exists === false;
      }
      return false;
    }

    return matchField(doc, field, condition);
  });
}

/**
 * Matches a document against a logical query ($and, $or, $not)
 */
function matchLogicalQuery(doc: Document, query: LogicalQuery): boolean {
  // Short-circuit for $and
  if ('$and' in query && Array.isArray(query.$and)) {
    for (const subQuery of query.$and) {
      if (!matchDocument(doc, subQuery)) {
        return false; // Short-circuit on first false
      }
    }
    return true;
  }

  // Short-circuit for $or
  if ('$or' in query && Array.isArray(query.$or)) {
    for (const subQuery of query.$or) {
      if (matchDocument(doc, subQuery)) {
        return true; // Short-circuit on first true
      }
    }
    return false;
  }

  // Handle $not
  if ('$not' in query) {
    if (Array.isArray(query.$not)) {
      for (const subQuery of query.$not) {
        if (matchDocument(doc, subQuery)) {
          return false; // Short-circuit on first true
        }
      }
      return true;
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
      // Special case for $exists operator
      if (typeof condition === 'object' && condition !== null && '$exists' in condition) {
        return condition.$exists === false;
      }
      return false;
    }

    return matchField(nestedDoc, rest.join('.'), condition);
  }

  // Get the value from the document
  const value = doc[field];

  // If condition is a query operator object
  if (condition !== null && typeof condition === 'object' && !Array.isArray(condition)) {
    // Short-circuit for operators
    for (const [operator, operand] of Object.entries(condition)) {
      if (!matchOperator(value, operator, operand)) {
        return false;
      }
    }
    return true;
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
        // Short-circuit for $in
        if (Array.isArray(value)) {
          for (const val of value) {
            for (const item of operand) {
              if (deepEqual(val, item)) {
                return true; // Short-circuit on first match
              }
            }
          }
          return false;
        }

        // Check if value is in operand
        for (const item of operand) {
          if (deepEqual(value, item)) {
            return true; // Short-circuit on first match
          }
        }
        return false;
      }
      return false;
    case '$nin':
      if (Array.isArray(operand)) {
        // Short-circuit for $nin
        if (Array.isArray(value)) {
          for (const val of value) {
            for (const item of operand) {
              if (deepEqual(val, item)) {
                return false; // Short-circuit on first match
              }
            }
          }
          return true;
        }

        // Check that value is not in operand
        for (const item of operand) {
          if (deepEqual(value, item)) {
            return false; // Short-circuit on first match
          }
        }
        return true;
      }
      return true;
    case '$regex':
      try {
        return new RegExp(operand).test(String(value));
      } catch {
        return false;
      }
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
 * Apply an update operation to a document
 */
export function applyUpdate(doc: Document, update: any): Document {
  const result = { ...doc };

  for (const [operator, fields] of Object.entries(update)) {
    switch (operator) {
      case '$set':
        applySetOperation(result, fields);
        break;
      case '$unset':
        applyUnsetOperation(result, fields);
        break;
      case '$inc':
        applyIncOperation(result, fields);
        break;
      case '$push':
        applyPushOperation(result, fields);
        break;
      case '$pull':
        applyPullOperation(result, fields);
        break;
      case '$addToSet':
        applyAddToSetOperation(result, fields);
        break;
      case '$rename':
        applyRenameOperation(result, fields);
        break;
      case '$mul':
        applyMulOperation(result, fields);
        break;
      case '$min':
        applyMinOperation(result, fields);
        break;
      case '$max':
        applyMaxOperation(result, fields);
        break;
    }
  }

  return result;
}

/**
 * Apply a $set operation
 */
function applySetOperation(doc: Document, fields: any): void {
  for (const [field, value] of Object.entries(fields)) {
    if (field.includes('.')) {
      // Handle nested fields
      const parts = field.split('.');
      let current = doc;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] === undefined || current[part] === null) {
          current[part] = {};
        }
        current = current[part];
      }

      current[parts[parts.length - 1]] = value;
    } else {
      doc[field] = value;
    }
  }
}

/**
 * Apply a $unset operation
 */
function applyUnsetOperation(doc: Document, fields: any): void {
  for (const field of Object.keys(fields)) {
    if (field.includes('.')) {
      // Handle nested fields
      const parts = field.split('.');
      let current = doc;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] === undefined || current[part] === null) {
          return;
        }
        current = current[part];
      }

      delete current[parts[parts.length - 1]];
    } else {
      delete doc[field];
    }
  }
}

/**
 * Apply a $inc operation
 */
function applyIncOperation(doc: Document, fields: any): void {
  for (const [field, value] of Object.entries(fields)) {
    if (field.includes('.')) {
      // Handle nested fields
      const parts = field.split('.');
      let current = doc;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] === undefined || current[part] === null) {
          current[part] = {};
        }
        current = current[part];
      }

      const lastPart = parts[parts.length - 1];
      if (typeof current[lastPart] === 'number') {
        current[lastPart] += value as number;
      } else {
        current[lastPart] = value as number;
      }
    } else {
      if (typeof doc[field] === 'number') {
        doc[field] += value as number;
      } else {
        doc[field] = value as number;
      }
    }
  }
}

/**
 * Apply a $push operation
 */
function applyPushOperation(doc: Document, fields: any): void {
  for (const [field, value] of Object.entries(fields)) {
    if (field.includes('.')) {
      // Handle nested fields
      const parts = field.split('.');
      let current = doc;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] === undefined || current[part] === null) {
          current[part] = {};
        }
        current = current[part];
      }

      const lastPart = parts[parts.length - 1];
      if (!Array.isArray(current[lastPart])) {
        current[lastPart] = [];
      }
      current[lastPart].push(value);
    } else {
      if (!Array.isArray(doc[field])) {
        doc[field] = [];
      }
      doc[field].push(value);
    }
  }
}

/**
 * Apply a $pull operation
 */
function applyPullOperation(doc: Document, fields: any): void {
  for (const [field, value] of Object.entries(fields)) {
    if (field.includes('.')) {
      // Handle nested fields
      const parts = field.split('.');
      let current = doc;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] === undefined || current[part] === null) {
          return;
        }
        current = current[part];
      }

      const lastPart = parts[parts.length - 1];
      if (Array.isArray(current[lastPart])) {
        current[lastPart] = current[lastPart].filter(item => !deepEqual(item, value));
      }
    } else {
      if (Array.isArray(doc[field])) {
        doc[field] = doc[field].filter(item => !deepEqual(item, value));
      }
    }
  }
}

/**
 * Apply a $addToSet operation
 */
function applyAddToSetOperation(doc: Document, fields: any): void {
  for (const [field, value] of Object.entries(fields)) {
    if (field.includes('.')) {
      // Handle nested fields
      const parts = field.split('.');
      let current = doc;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] === undefined || current[part] === null) {
          current[part] = {};
        }
        current = current[part];
      }

      const lastPart = parts[parts.length - 1];
      if (!Array.isArray(current[lastPart])) {
        current[lastPart] = [];
      }

      if (!current[lastPart].some((item: any) => deepEqual(item, value))) {
        current[lastPart].push(value);
      }
    } else {
      if (!Array.isArray(doc[field])) {
        doc[field] = [];
      }

      if (!doc[field].some((item: any) => deepEqual(item, value))) {
        doc[field].push(value);
      }
    }
  }
}

/**
 * Apply a $rename operation
 */
function applyRenameOperation(doc: Document, fields: any): void {
  for (const [oldField, newField] of Object.entries(fields)) {
    if (oldField in doc) {
      doc[newField as string] = doc[oldField];
      delete doc[oldField];
    }
  }
}

/**
 * Apply a $mul operation
 */
function applyMulOperation(doc: Document, fields: any): void {
  for (const [field, value] of Object.entries(fields)) {
    if (field.includes('.')) {
      // Handle nested fields
      const parts = field.split('.');
      let current = doc;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] === undefined || current[part] === null) {
          current[part] = {};
        }
        current = current[part];
      }

      const lastPart = parts[parts.length - 1];
      if (typeof current[lastPart] === 'number') {
        current[lastPart] *= value as number;
      } else {
        current[lastPart] = 0;
      }
    } else {
      if (typeof doc[field] === 'number') {
        doc[field] *= value as number;
      } else {
        doc[field] = 0;
      }
    }
  }
}

/**
 * Apply a $min operation
 */
function applyMinOperation(doc: Document, fields: any): void {
  for (const [field, value] of Object.entries(fields)) {
    if (field.includes('.')) {
      // Handle nested fields
      const parts = field.split('.');
      let current = doc;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] === undefined || current[part] === null) {
          current[part] = {};
        }
        current = current[part];
      }

      const lastPart = parts[parts.length - 1];
      if (current[lastPart] === undefined || (typeof current[lastPart] === 'number' && current[lastPart] > (value as number))) {
        current[lastPart] = value;
      }
    } else {
      if (doc[field] === undefined || (typeof doc[field] === 'number' && doc[field] > (value as number))) {
        doc[field] = value;
      }
    }
  }
}

/**
 * Apply a $max operation
 */
function applyMaxOperation(doc: Document, fields: any): void {
  for (const [field, value] of Object.entries(fields)) {
    if (field.includes('.')) {
      // Handle nested fields
      const parts = field.split('.');
      let current = doc;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] === undefined || current[part] === null) {
          current[part] = {};
        }
        current = current[part];
      }

      const lastPart = parts[parts.length - 1];
      if (current[lastPart] === undefined || (typeof current[lastPart] === 'number' && current[lastPart] < (value as number))) {
        current[lastPart] = value;
      }
    } else {
      if (doc[field] === undefined || (typeof doc[field] === 'number' && doc[field] < (value as number))) {
        doc[field] = value;
      }
    }
  }
}
