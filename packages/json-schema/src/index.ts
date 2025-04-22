import { z } from 'zod';

/**
 * JSON Schema type
 */
export interface JSONSchema {
  $schema?: string;
  $id?: string;
  title?: string;
  description?: string;
  type?: string | string[];
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema | JSONSchema[];
  enum?: any[];
  allOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  not?: JSONSchema;
  definitions?: Record<string, JSONSchema>;
  format?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean | number;
  exclusiveMaximum?: boolean | number;
  multipleOf?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minProperties?: number;
  maxProperties?: number;
  additionalProperties?: boolean | JSONSchema;
  patternProperties?: Record<string, JSONSchema>;
  dependencies?: Record<string, JSONSchema | string[]>;
  default?: any;
  examples?: any[];
  [key: string]: any;
}

/**
 * Options for converting Zod schema to JSON Schema
 */
export interface ZodToJSONSchemaOptions {
  /**
   * The schema ID
   */
  $id?: string;

  /**
   * The schema title
   */
  title?: string;

  /**
   * The schema description
   */
  description?: string;

  /**
   * Whether to include examples
   */
  includeExamples?: boolean;

  /**
   * Whether to include defaults
   */
  includeDefaults?: boolean;
}

/**
 * Convert a Zod schema to JSON Schema
 */
export function zodToJSONSchema(schema: z.ZodType, options: ZodToJSONSchemaOptions = {}): JSONSchema {
  const {
    $id,
    title,
    description,
    includeExamples = true,
    includeDefaults = true
  } = options;

  // Create base schema
  const jsonSchema: JSONSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#'
  };

  // Add metadata
  if ($id) jsonSchema.$id = $id;
  if (title) jsonSchema.title = title;
  if (description) jsonSchema.description = description;

  // Process schema
  processZodSchema(schema, jsonSchema, includeExamples, includeDefaults);

  return jsonSchema;
}

/**
 * Process a Zod schema and update the JSON Schema
 */
function processZodSchema(
  schema: z.ZodType,
  jsonSchema: JSONSchema,
  includeExamples: boolean,
  includeDefaults: boolean
): void {
  // Get schema description from Zod
  const zodDescription = (schema as any)._def.description;
  if (zodDescription && !jsonSchema.description) {
    jsonSchema.description = zodDescription;
  }

  // Handle different schema types
  if (schema instanceof z.ZodString) {
    processZodString(schema, jsonSchema);
  } else if (schema instanceof z.ZodNumber) {
    processZodNumber(schema, jsonSchema);
  } else if (schema instanceof z.ZodBoolean) {
    processZodBoolean(schema, jsonSchema);
  } else if (schema instanceof z.ZodArray) {
    processZodArray(schema, jsonSchema, includeExamples, includeDefaults);
  } else if (schema instanceof z.ZodObject) {
    processZodObject(schema, jsonSchema, includeExamples, includeDefaults);
  } else if (schema instanceof z.ZodEnum) {
    processZodEnum(schema, jsonSchema);
  } else if (schema instanceof z.ZodUnion) {
    processZodUnion(schema, jsonSchema, includeExamples, includeDefaults);
  } else if (schema instanceof z.ZodIntersection) {
    processZodIntersection(schema, jsonSchema, includeExamples, includeDefaults);
  } else if (schema instanceof z.ZodNullable) {
    processZodNullable(schema, jsonSchema, includeExamples, includeDefaults);
  } else if (schema instanceof z.ZodOptional) {
    processZodOptional(schema, jsonSchema, includeExamples, includeDefaults);
  } else if (schema instanceof z.ZodLiteral) {
    processZodLiteral(schema, jsonSchema);
  } else if (schema instanceof z.ZodRecord) {
    processZodRecord(schema, jsonSchema, includeExamples, includeDefaults);
  } else if (schema instanceof z.ZodTuple) {
    processZodTuple(schema, jsonSchema, includeExamples, includeDefaults);
  } else if (schema instanceof z.ZodAny) {
    // Any type
    jsonSchema.type = undefined;
  } else if (schema instanceof z.ZodUnknown) {
    // Unknown type
    jsonSchema.type = undefined;
  } else if (schema instanceof z.ZodNull) {
    // Null type
    jsonSchema.type = 'null';
  } else if (schema instanceof z.ZodUndefined) {
    // Undefined type (not valid in JSON Schema)
    jsonSchema.type = 'null';
  } else if (schema instanceof z.ZodVoid) {
    // Void type (not valid in JSON Schema)
    jsonSchema.type = 'null';
  } else if (schema instanceof z.ZodNever) {
    // Never type
    jsonSchema.not = {};
  } else {
    // Default to any type
    jsonSchema.type = undefined;
  }

  // Add examples if available
  if (includeExamples && (schema as any)._def.examples?.length > 0) {
    jsonSchema.examples = (schema as any)._def.examples;
  }

  // Add default if available
  if (includeDefaults && (schema as any)._def.defaultValue !== undefined) {
    jsonSchema.default = (schema as any)._def.defaultValue;
  }
}

/**
 * Process a Zod string schema
 */
function processZodString(schema: z.ZodString, jsonSchema: JSONSchema): void {
  jsonSchema.type = 'string';

  // Add string validations
  const checks = (schema as any)._def.checks || [];

  for (const check of checks) {
    switch (check.kind) {
      case 'min':
        jsonSchema.minLength = check.value;
        break;
      case 'max':
        jsonSchema.maxLength = check.value;
        break;
      case 'email':
        jsonSchema.format = 'email';
        break;
      case 'url':
        jsonSchema.format = 'uri';
        break;
      case 'uuid':
        jsonSchema.format = 'uuid';
        break;
      case 'cuid':
        jsonSchema.pattern = '^c[a-z0-9]+$';
        break;
      case 'regex':
        jsonSchema.pattern = check.regex.source;
        break;
      case 'datetime':
        jsonSchema.format = 'date-time';
        break;
      case 'startsWith':
        jsonSchema.pattern = `^${escapeRegExp(check.value)}`;
        break;
      case 'endsWith':
        jsonSchema.pattern = `${escapeRegExp(check.value)}$`;
        break;
    }
  }
}

/**
 * Process a Zod number schema
 */
function processZodNumber(schema: z.ZodNumber, jsonSchema: JSONSchema): void {
  jsonSchema.type = 'number';

  // Add number validations
  const checks = (schema as any)._def.checks || [];

  for (const check of checks) {
    switch (check.kind) {
      case 'min':
        if (check.inclusive) {
          jsonSchema.minimum = check.value;
        } else {
          jsonSchema.exclusiveMinimum = check.value;
        }
        break;
      case 'max':
        if (check.inclusive) {
          jsonSchema.maximum = check.value;
        } else {
          jsonSchema.exclusiveMaximum = check.value;
        }
        break;
      case 'int':
        jsonSchema.type = 'integer';
        break;
      case 'multipleOf':
        jsonSchema.multipleOf = check.value;
        break;
    }
  }
}

/**
 * Process a Zod boolean schema
 */
function processZodBoolean(schema: z.ZodBoolean, jsonSchema: JSONSchema): void {
  jsonSchema.type = 'boolean';
}

/**
 * Process a Zod array schema
 */
function processZodArray(
  schema: z.ZodArray<any>,
  jsonSchema: JSONSchema,
  includeExamples: boolean,
  includeDefaults: boolean
): void {
  jsonSchema.type = 'array';

  // Process array element type
  const itemSchema: JSONSchema = {};
  processZodSchema(schema.element, itemSchema, includeExamples, includeDefaults);
  jsonSchema.items = itemSchema;

  // Add array validations
  const minLength = (schema as any)._def.minLength;
  const maxLength = (schema as any)._def.maxLength;

  if (minLength !== undefined && minLength.value !== undefined) {
    jsonSchema.minItems = minLength.value;
  }

  if (maxLength !== undefined && maxLength.value !== undefined) {
    jsonSchema.maxItems = maxLength.value;
  }
}

/**
 * Process a Zod object schema
 */
function processZodObject(
  schema: z.ZodObject<any>,
  jsonSchema: JSONSchema,
  includeExamples: boolean,
  includeDefaults: boolean
): void {
  jsonSchema.type = 'object';
  jsonSchema.properties = {};
  jsonSchema.required = [];

  // Get shape
  const shape = schema.shape;

  // Process each property
  for (const [key, propertySchema] of Object.entries(shape)) {
    const propJsonSchema: JSONSchema = {};
    processZodSchema(propertySchema, propJsonSchema, includeExamples, includeDefaults);

    jsonSchema.properties![key] = propJsonSchema;

    // Check if property is required
    if (!(propertySchema instanceof z.ZodOptional)) {
      jsonSchema.required!.push(key);
    }
  }

  // Remove required array if empty
  if (jsonSchema.required!.length === 0) {
    delete jsonSchema.required;
  }

  // Handle additional properties
  const catchall = (schema as any)._def.catchall;
  if (catchall && !(catchall instanceof z.ZodNever)) {
    const additionalPropSchema: JSONSchema = {};
    processZodSchema(catchall, additionalPropSchema, includeExamples, includeDefaults);
    jsonSchema.additionalProperties = additionalPropSchema;
  } else {
    jsonSchema.additionalProperties = false;
  }
}

/**
 * Process a Zod enum schema
 */
function processZodEnum(schema: z.ZodEnum<any>, jsonSchema: JSONSchema): void {
  jsonSchema.type = 'string';
  jsonSchema.enum = (schema as any)._def.values;
}

/**
 * Process a Zod union schema
 */
function processZodUnion(
  schema: z.ZodUnion<any>,
  jsonSchema: JSONSchema,
  includeExamples: boolean,
  includeDefaults: boolean
): void {
  jsonSchema.anyOf = [];

  // Process each option
  const options = (schema as any)._def.options;

  for (const option of options) {
    const optionSchema: JSONSchema = {};
    processZodSchema(option, optionSchema, includeExamples, includeDefaults);
    jsonSchema.anyOf.push(optionSchema);
  }
}

/**
 * Process a Zod intersection schema
 */
function processZodIntersection(
  schema: z.ZodIntersection<any, any>,
  jsonSchema: JSONSchema,
  includeExamples: boolean,
  includeDefaults: boolean
): void {
  jsonSchema.allOf = [];

  // Process left and right schemas
  const leftSchema: JSONSchema = {};
  processZodSchema((schema as any)._def.left, leftSchema, includeExamples, includeDefaults);

  const rightSchema: JSONSchema = {};
  processZodSchema((schema as any)._def.right, rightSchema, includeExamples, includeDefaults);

  jsonSchema.allOf.push(leftSchema, rightSchema);
}

/**
 * Process a Zod nullable schema
 */
function processZodNullable(
  schema: z.ZodNullable<any>,
  jsonSchema: JSONSchema,
  includeExamples: boolean,
  includeDefaults: boolean
): void {
  // Process inner schema
  processZodSchema((schema as any)._def.innerType, jsonSchema, includeExamples, includeDefaults);

  // Add null to type
  if (jsonSchema.type) {
    if (Array.isArray(jsonSchema.type)) {
      jsonSchema.type.push('null');
    } else {
      jsonSchema.type = [jsonSchema.type, 'null'];
    }
  } else {
    jsonSchema.type = 'null';
  }
}

/**
 * Process a Zod optional schema
 */
function processZodOptional(
  schema: z.ZodOptional<any>,
  jsonSchema: JSONSchema,
  includeExamples: boolean,
  includeDefaults: boolean
): void {
  // Process inner schema
  processZodSchema((schema as any)._def.innerType, jsonSchema, includeExamples, includeDefaults);
}

/**
 * Process a Zod literal schema
 */
function processZodLiteral(schema: z.ZodLiteral<any>, jsonSchema: JSONSchema): void {
  const value = (schema as any)._def.value;

  // Set type based on literal value type
  switch (typeof value) {
    case 'string':
      jsonSchema.type = 'string';
      break;
    case 'number':
      jsonSchema.type = 'number';
      break;
    case 'boolean':
      jsonSchema.type = 'boolean';
      break;
    default:
      jsonSchema.type = 'string';
  }

  // Set enum with the literal value
  jsonSchema.enum = [value];
}

/**
 * Process a Zod record schema
 */
function processZodRecord(
  schema: z.ZodRecord<any, any>,
  jsonSchema: JSONSchema,
  includeExamples: boolean,
  includeDefaults: boolean
): void {
  jsonSchema.type = 'object';

  // Process value schema
  const valueSchema: JSONSchema = {};
  processZodSchema((schema as any)._def.valueType, valueSchema, includeExamples, includeDefaults);

  // Set additional properties
  jsonSchema.additionalProperties = valueSchema;
}

/**
 * Process a Zod tuple schema
 */
function processZodTuple(
  schema: z.ZodTuple<any>,
  jsonSchema: JSONSchema,
  includeExamples: boolean,
  includeDefaults: boolean
): void {
  jsonSchema.type = 'array';

  // Process each item in the tuple
  const items: JSONSchema[] = [];
  const tupleItems = (schema as any)._def.items;

  for (const item of tupleItems) {
    const itemSchema: JSONSchema = {};
    processZodSchema(item, itemSchema, includeExamples, includeDefaults);
    items.push(itemSchema);
  }

  jsonSchema.items = items;
  jsonSchema.minItems = items.length;
  jsonSchema.maxItems = items.length;
}

/**
 * Escape a string for use in a regular expression
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Convert a JSON Schema to a Zod schema
 */
export function jsonSchemaToZod(schema: JSONSchema, name?: string): string {
  let zodCode = '';

  // Add imports
  zodCode += `import { z } from 'zod';\n\n`;

  // Generate schema
  const schemaCode = generateZodSchemaCode(schema);

  // Add export
  if (name) {
    zodCode += `export const ${name} = ${schemaCode};\n\n`;
    zodCode += `export type ${name} = z.infer<typeof ${name}>;\n`;
  } else {
    zodCode += `export default ${schemaCode};\n`;
  }

  return zodCode;
}

/**
 * Generate Zod schema code from JSON Schema
 */
function generateZodSchemaCode(schema: JSONSchema, indent = ''): string {
  // Handle type
  if (schema.type) {
    if (schema.type === 'string') {
      return generateZodStringCode(schema);
    } else if (schema.type === 'number' || schema.type === 'integer') {
      return generateZodNumberCode(schema);
    } else if (schema.type === 'boolean') {
      return generateZodBooleanCode(schema);
    } else if (schema.type === 'array') {
      return generateZodArrayCode(schema, indent);
    } else if (schema.type === 'object') {
      return generateZodObjectCode(schema, indent);
    } else if (schema.type === 'null') {
      return 'z.null()';
    } else if (Array.isArray(schema.type)) {
      // Union of types
      const typeSchemas = schema.type.map(type => {
        const typeSchema: JSONSchema = { ...schema, type };
        return generateZodSchemaCode(typeSchema, indent);
      });

      return `z.union([${typeSchemas.join(', ')}])`;
    }
  }

  // Handle enum
  if (schema.enum) {
    return generateZodEnumCode(schema);
  }

  // Handle oneOf
  if (schema.oneOf) {
    const oneOfSchemas = schema.oneOf.map(s => generateZodSchemaCode(s, indent));
    return `z.union([${oneOfSchemas.join(', ')}])`;
  }

  // Handle anyOf
  if (schema.anyOf) {
    const anyOfSchemas = schema.anyOf.map(s => generateZodSchemaCode(s, indent));
    return `z.union([${anyOfSchemas.join(', ')}])`;
  }

  // Handle allOf
  if (schema.allOf) {
    const allOfSchemas = schema.allOf.map(s => generateZodSchemaCode(s, indent));
    return allOfSchemas.reduce((acc, curr) => `${acc}.and(${curr})`);
  }

  // Default to any
  return 'z.any()';
}

/**
 * Generate Zod string schema code
 */
function generateZodStringCode(schema: JSONSchema): string {
  let code = 'z.string()';

  // Add validations
  if (schema.minLength !== undefined) {
    code += `.min(${schema.minLength})`;
  }

  if (schema.maxLength !== undefined) {
    code += `.max(${schema.maxLength})`;
  }

  if (schema.pattern) {
    code += `.regex(/${schema.pattern}/)`;
  }

  if (schema.format) {
    switch (schema.format) {
      case 'email':
        code += '.email()';
        break;
      case 'uri':
      case 'uri-reference':
        code += '.url()';
        break;
      case 'uuid':
        code += '.uuid()';
        break;
      case 'date-time':
        code += '.datetime()';
        break;
    }
  }

  // Add description
  if (schema.description) {
    code += `.describe(${JSON.stringify(schema.description)})`;
  }

  // Add default
  if (schema.default !== undefined) {
    code += `.default(${JSON.stringify(schema.default)})`;
  }

  return code;
}

/**
 * Generate Zod number schema code
 */
function generateZodNumberCode(schema: JSONSchema): string {
  let code = schema.type === 'integer' ? 'z.number().int()' : 'z.number()';

  // Add validations
  if (schema.minimum !== undefined) {
    code += `.min(${schema.minimum})`;
  }

  if (schema.maximum !== undefined) {
    code += `.max(${schema.maximum})`;
  }

  if (schema.exclusiveMinimum !== undefined) {
    if (typeof schema.exclusiveMinimum === 'boolean') {
      if (schema.exclusiveMinimum && schema.minimum !== undefined) {
        code += `.gt(${schema.minimum})`;
      }
    } else {
      code += `.gt(${schema.exclusiveMinimum})`;
    }
  }

  if (schema.exclusiveMaximum !== undefined) {
    if (typeof schema.exclusiveMaximum === 'boolean') {
      if (schema.exclusiveMaximum && schema.maximum !== undefined) {
        code += `.lt(${schema.maximum})`;
      }
    } else {
      code += `.lt(${schema.exclusiveMaximum})`;
    }
  }

  if (schema.multipleOf !== undefined) {
    code += `.multipleOf(${schema.multipleOf})`;
  }

  // Add description
  if (schema.description) {
    code += `.describe(${JSON.stringify(schema.description)})`;
  }

  // Add default
  if (schema.default !== undefined) {
    code += `.default(${schema.default})`;
  }

  return code;
}

/**
 * Generate Zod boolean schema code
 */
function generateZodBooleanCode(schema: JSONSchema): string {
  let code = 'z.boolean()';

  // Add description
  if (schema.description) {
    code += `.describe(${JSON.stringify(schema.description)})`;
  }

  // Add default
  if (schema.default !== undefined) {
    code += `.default(${schema.default})`;
  }

  return code;
}

/**
 * Generate Zod array schema code
 */
function generateZodArrayCode(schema: JSONSchema, indent: string): string {
  let code = '';

  if (schema.items) {
    if (Array.isArray(schema.items)) {
      // Tuple
      const itemsCode = schema.items.map(item => generateZodSchemaCode(item, indent + '  ')).join(', ');
      code = `z.tuple([${itemsCode}])`;
    } else {
      // Array
      const itemCode = generateZodSchemaCode(schema.items, indent + '  ');
      code = `z.array(${itemCode})`;
    }
  } else {
    // Array of any
    code = 'z.array(z.any())';
  }

  // Add validations
  if (schema.minItems !== undefined) {
    code += `.min(${schema.minItems})`;
  }

  if (schema.maxItems !== undefined) {
    code += `.max(${schema.maxItems})`;
  }

  // Add description
  if (schema.description) {
    code += `.describe(${JSON.stringify(schema.description)})`;
  }

  // Add default
  if (schema.default !== undefined) {
    code += `.default(${JSON.stringify(schema.default)})`;
  }

  return code;
}

/**
 * Generate Zod object schema code
 */
function generateZodObjectCode(schema: JSONSchema, indent: string): string {
  const properties = schema.properties || {};
  const required = schema.required || [];

  // Generate shape
  const shapeEntries: string[] = [];

  for (const [key, prop] of Object.entries(properties)) {
    const isRequired = required.includes(key);
    const propCode = generateZodSchemaCode(prop, indent + '  ');

    shapeEntries.push(`${indent}  ${JSON.stringify(key)}: ${isRequired ? propCode : `${propCode}.optional()`}`);
  }

  const shapeCode = shapeEntries.join(',\n');

  // Generate object schema
  let code = `z.object({\n${shapeCode}\n${indent}})`;

  // Add additional properties
  if (schema.additionalProperties !== undefined && schema.additionalProperties !== false) {
    if (typeof schema.additionalProperties === 'object') {
      const additionalPropCode = generateZodSchemaCode(schema.additionalProperties, indent + '  ');
      code += `.catchall(${additionalPropCode})`;
    }
  }

  // Add description
  if (schema.description) {
    code += `.describe(${JSON.stringify(schema.description)})`;
  }

  return code;
}

/**
 * Generate Zod enum schema code
 */
function generateZodEnumCode(schema: JSONSchema): string {
  if (!schema.enum || schema.enum.length === 0) {
    return 'z.any()';
  }

  // Check if all enum values are strings
  const allStrings = schema.enum.every(value => typeof value === 'string');

  if (allStrings) {
    // Use z.enum for string enums
    const values = schema.enum.map(value => JSON.stringify(value)).join(', ');
    return `z.enum([${values}])`;
  } else {
    // Use z.union of literals for mixed types
    const literals = schema.enum.map(value => `z.literal(${JSON.stringify(value)})`).join(', ');
    return `z.union([${literals}])`;
  }
}
