import faker from 'faker';
import { TestDocument } from './types';

/**
 * Generate a test document
 */
export function generateDocument(): TestDocument {
  return {
    name: faker.name.findName(),
    email: faker.internet.email(),
    age: faker.datatype.number({ min: 18, max: 80 }),
    address: {
      street: faker.address.streetAddress(),
      city: faker.address.city(),
      state: faker.address.state(),
      zip: faker.address.zipCode()
    },
    tags: Array.from({ length: faker.datatype.number({ min: 1, max: 5 }) }, () => faker.random.word()),
    createdAt: new Date().toISOString()
  };
}

/**
 * Generate multiple test documents
 */
export function generateDocuments(count: number): TestDocument[] {
  return Array.from({ length: count }, generateDocument);
}

/**
 * Generate a random query
 */
export function generateQuery(): any {
  const queryType = faker.datatype.number({ min: 1, max: 5 });
  
  switch (queryType) {
    case 1:
      // Simple equality
      return { age: faker.datatype.number({ min: 18, max: 80 }) };
    case 2:
      // Range query
      return {
        age: {
          $gte: faker.datatype.number({ min: 18, max: 40 }),
          $lte: faker.datatype.number({ min: 41, max: 80 })
        }
      };
    case 3:
      // Nested field
      return { 'address.state': faker.address.stateAbbr() };
    case 4:
      // Multiple conditions
      return {
        age: { $gt: 30 },
        'address.city': faker.address.city()
      };
    case 5:
      // Array query
      return {
        tags: faker.random.word()
      };
    default:
      return { age: faker.datatype.number({ min: 18, max: 80 }) };
  }
}

/**
 * Generate a random update
 */
export function generateUpdate(): any {
  const updateType = faker.datatype.number({ min: 1, max: 3 });
  
  switch (updateType) {
    case 1:
      // Simple field update
      return {
        $set: {
          age: faker.datatype.number({ min: 18, max: 80 })
        }
      };
    case 2:
      // Nested field update
      return {
        $set: {
          'address.city': faker.address.city()
        }
      };
    case 3:
      // Multiple field update
      return {
        $set: {
          age: faker.datatype.number({ min: 18, max: 80 }),
          name: faker.name.findName(),
          'address.zip': faker.address.zipCode()
        }
      };
    default:
      return {
        $set: {
          age: faker.datatype.number({ min: 18, max: 80 })
        }
      };
  }
}
