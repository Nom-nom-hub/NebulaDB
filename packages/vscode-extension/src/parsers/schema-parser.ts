import * as fs from 'fs';
import * as path from 'path';

export interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
}

export interface SchemaIndex {
  name: string;
  fields: string[];
  type: 'single' | 'unique' | 'multi';
}

export interface SchemaCollection {
  name: string;
  filePath: string;
  fields: SchemaField[];
  indexes: SchemaIndex[];
}

export class SchemaParser {
  private collections: Map<string, SchemaCollection> = new Map();
  
  constructor() {}
  
  /**
   * Parse a file for NebulaDB schemas
   */
  async parseFile(filePath: string): Promise<void> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      
      // Parse collections
      this.parseCollections(content, filePath);
      
      // Parse models (ORM)
      this.parseModels(content, filePath);
      
    } catch (error) {
      console.error(`Error parsing ${filePath}:`, error);
    }
  }
  
  /**
   * Remove a file from the schema cache
   */
  removeFile(filePath: string): void {
    // Remove collections defined in this file
    for (const [name, collection] of this.collections.entries()) {
      if (collection.filePath === filePath) {
        this.collections.delete(name);
      }
    }
  }
  
  /**
   * Get all collections
   */
  getCollections(): SchemaCollection[] {
    return Array.from(this.collections.values());
  }
  
  /**
   * Get a collection by name
   */
  getCollection(name: string): SchemaCollection | undefined {
    return this.collections.get(name);
  }
  
  /**
   * Parse collections from code
   */
  private parseCollections(content: string, filePath: string): void {
    // Look for collection definitions
    // Example: db.collection('users')
    const collectionRegex = /\.collection\s*\(\s*['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = collectionRegex.exec(content)) !== null) {
      const collectionName = match[1];
      
      // Create or update collection
      if (!this.collections.has(collectionName)) {
        this.collections.set(collectionName, {
          name: collectionName,
          filePath,
          fields: [],
          indexes: []
        });
      }
    }
    
    // Look for index definitions
    // Example: users.createIndex({ name: 'email_idx', fields: ['email'], type: 'unique' })
    const indexRegex = /\.createIndex\s*\(\s*\{([^}]+)\}\s*\)/g;
    
    while ((match = indexRegex.exec(content)) !== null) {
      const indexDef = match[1];
      
      // Extract collection name
      const collectionMatch = content.substring(0, match.index).match(/(\w+)\.createIndex/);
      if (!collectionMatch) continue;
      
      const collectionVarName = collectionMatch[1];
      
      // Find collection assignment
      const collectionAssignmentRegex = new RegExp(`(const|let|var)\\s+${collectionVarName}\\s*=\\s*\\w+\\.collection\\s*\\(\\s*['"]([^'"]+)['"]`, 'g');
      const assignmentMatch = collectionAssignmentRegex.exec(content);
      
      if (!assignmentMatch) continue;
      
      const collectionName = assignmentMatch[2];
      
      // Parse index properties
      const nameMatch = indexDef.match(/name\s*:\s*['"]([^'"]+)['"]/);
      const fieldsMatch = indexDef.match(/fields\s*:\s*\[([^\]]+)\]/);
      const typeMatch = indexDef.match(/type\s*:\s*['"]([^'"]+)['"]/);
      
      if (nameMatch && fieldsMatch) {
        const name = nameMatch[1];
        const fields = fieldsMatch[1].split(',').map(f => f.trim().replace(/['"]/g, ''));
        const type = (typeMatch ? typeMatch[1] : 'single') as 'single' | 'unique' | 'multi';
        
        // Add index to collection
        const collection = this.collections.get(collectionName);
        if (collection) {
          collection.indexes.push({ name, fields, type });
        }
      }
    }
  }
  
  /**
   * Parse ORM models from code
   */
  private parseModels(content: string, filePath: string): void {
    // Look for @Model decorator
    // Example: @Model('users')
    const modelRegex = /@Model\s*\(\s*['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = modelRegex.exec(content)) !== null) {
      const collectionName = match[1];
      
      // Create collection if it doesn't exist
      if (!this.collections.has(collectionName)) {
        this.collections.set(collectionName, {
          name: collectionName,
          filePath,
          fields: [],
          indexes: []
        });
      }
      
      const collection = this.collections.get(collectionName)!;
      
      // Find class definition
      const classMatch = content.substring(match.index).match(/class\s+(\w+)/);
      if (!classMatch) continue;
      
      // Parse fields
      const fieldRegex = /@Field\s*\(\s*\{([^}]+)\}\s*\)\s*(\w+)\s*:\s*([^;]+)/g;
      let fieldMatch;
      
      while ((fieldMatch = fieldRegex.exec(content)) !== null) {
        const fieldDef = fieldMatch[1];
        const fieldName = fieldMatch[2];
        const fieldType = fieldMatch[3].trim();
        
        // Parse field properties
        const requiredMatch = fieldDef.match(/required\s*:\s*(true|false)/);
        const defaultMatch = fieldDef.match(/default\s*:\s*([^,}]+)/);
        
        const required = requiredMatch ? requiredMatch[1] === 'true' : false;
        const defaultValue = defaultMatch ? defaultMatch[1].trim() : undefined;
        
        // Add field to collection
        collection.fields.push({
          name: fieldName,
          type: fieldType,
          required,
          defaultValue
        });
      }
      
      // Parse indexes
      const indexRegex = /@Index\s*\(\s*\{([^}]+)\}\s*\)/g;
      let indexMatch;
      
      while ((indexMatch = indexRegex.exec(content)) !== null) {
        const indexDef = indexMatch[1];
        
        // Parse index properties
        const nameMatch = indexDef.match(/name\s*:\s*['"]([^'"]+)['"]/);
        const fieldsMatch = indexDef.match(/fields\s*:\s*\[([^\]]+)\]/);
        const typeMatch = indexDef.match(/type\s*:\s*['"]([^'"]+)['"]/);
        
        if (nameMatch && fieldsMatch) {
          const name = nameMatch[1];
          const fields = fieldsMatch[1].split(',').map(f => f.trim().replace(/['"]/g, ''));
          const type = (typeMatch ? typeMatch[1] : 'single') as 'single' | 'unique' | 'multi';
          
          // Add index to collection
          collection.indexes.push({ name, fields, type });
        }
      }
    }
  }
}
