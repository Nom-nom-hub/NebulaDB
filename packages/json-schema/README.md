# NebulaDB JSON Schema

A utility package for converting between Zod schemas and JSON Schema in NebulaDB.

## Installation

```bash
npm install @nebula/json-schema
```

## Usage

### Converting Zod to JSON Schema

```typescript
import { z } from 'zod';
import { zodToJSONSchema } from '@nebula/json-schema';

// Define a Zod schema
const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).optional(),
  roles: z.array(z.enum(['admin', 'user', 'guest'])),
  metadata: z.record(z.string(), z.any())
});

// Convert to JSON Schema
const jsonSchema = zodToJSONSchema(userSchema, {
  $id: 'https://example.com/schemas/user.json',
  title: 'User',
  description: 'A user schema'
});

console.log(JSON.stringify(jsonSchema, null, 2));
```

### Converting JSON Schema to Zod

```typescript
import { jsonSchemaToZod } from '@nebula/json-schema';

// Define a JSON Schema
const jsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://example.com/schemas/user.json',
  title: 'User',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid'
    },
    name: {
      type: 'string',
      minLength: 2,
      maxLength: 100
    },
    email: {
      type: 'string',
      format: 'email'
    },
    age: {
      type: 'integer',
      minimum: 0
    },
    roles: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['admin', 'user', 'guest']
      }
    },
    metadata: {
      type: 'object',
      additionalProperties: true
    }
  },
  required: ['id', 'name', 'email', 'roles']
};

// Convert to Zod schema code
const zodCode = jsonSchemaToZod(jsonSchema, 'UserSchema');

console.log(zodCode);
```

## API

### `zodToJSONSchema(schema, options)`

Converts a Zod schema to JSON Schema.

#### Options

- `$id`: The schema ID
- `title`: The schema title
- `description`: The schema description
- `includeExamples`: Whether to include examples (default: `true`)
- `includeDefaults`: Whether to include defaults (default: `true`)

### `jsonSchemaToZod(schema, name)`

Converts a JSON Schema to Zod schema code.

#### Parameters

- `schema`: The JSON Schema to convert
- `name`: Optional name for the exported schema

## Supported Features

### Zod to JSON Schema

- Basic types: string, number, boolean, array, object
- String validations: min, max, email, url, uuid, regex, etc.
- Number validations: min, max, int, multipleOf
- Array validations: min, max
- Object validations: required fields, additional properties
- Enums
- Unions
- Intersections
- Nullable types
- Optional types
- Literals
- Records
- Tuples

### JSON Schema to Zod

- Basic types: string, number, boolean, array, object
- String validations: minLength, maxLength, pattern, format
- Number validations: minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf
- Array validations: minItems, maxItems
- Object validations: required fields, additionalProperties
- Enums
- oneOf, anyOf, allOf
- Tuples

## License

MIT
