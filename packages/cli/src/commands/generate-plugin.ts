import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { camelCase, pascalCase, kebabCase } from '../utils/string';

/**
 * Generate a new plugin
 */
export async function generatePlugin(name: string, directory: string): Promise<void> {
  const spinner = ora('Generating plugin...').start();
  
  try {
    // Format names
    const pluginName = kebabCase(name);
    const functionName = camelCase('create-' + name + '-plugin');
    
    // Create directory
    const pluginDir = path.resolve(process.cwd(), directory, pluginName);
    await fs.ensureDir(pluginDir);
    await fs.ensureDir(path.join(pluginDir, 'src'));
    
    // Create package.json
    const packageJson = {
      name: `@nebula/plugin-${pluginName}`,
      version: '0.1.0',
      description: `${name} plugin for NebulaDB`,
      main: 'dist/index.js',
      module: 'dist/index.mjs',
      types: 'dist/index.d.ts',
      files: ['dist'],
      scripts: {
        build: 'tsup src/index.ts --format cjs,esm --dts',
        test: 'vitest run',
        'test:watch': 'vitest'
      },
      keywords: ['database', 'nosql', pluginName, 'plugin'],
      author: '',
      license: 'MIT',
      devDependencies: {
        tsup: '^8.0.1',
        typescript: '^5.3.3',
        vitest: '^1.2.1'
      },
      peerDependencies: {
        '@nebula/core': '^0.1.0'
      }
    };
    
    await fs.writeFile(
      path.join(pluginDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // Create tsconfig.json
    const tsConfig = {
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'node',
        esModuleInterop: true,
        strict: true,
        declaration: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        outDir: 'dist',
        lib: ['ES2020']
      },
      include: ['src'],
      exclude: ['node_modules', 'dist', '**/*.test.ts']
    };
    
    await fs.writeFile(
      path.join(pluginDir, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    );
    
    // Create plugin implementation
    const pluginImplementation = `import { Plugin, Document, Query, UpdateOperation } from '@nebula/core';

/**
 * Options for the ${name} plugin
 */
export interface ${pascalCase(name)}PluginOptions {
  // Define your plugin options here
}

/**
 * Create a ${name} plugin for NebulaDB
 */
export function ${functionName}(options: ${pascalCase(name)}PluginOptions = {}): Plugin {
  return {
    name: '${pluginName}',
    
    onInit(db: any): void {
      // Initialize your plugin here
      console.log('${pascalCase(name)} plugin initialized');
    },
    
    async onBeforeInsert(collection: string, doc: Document): Promise<Document> {
      // Modify document before insertion
      return doc;
    },
    
    onAfterInsert(collection: string, doc: Document): void {
      // Handle document after insertion
    },
    
    async onBeforeUpdate(collection: string, query: Query, update: UpdateOperation): Promise<[Query, UpdateOperation]> {
      // Modify query and update before update operation
      return [query, update];
    },
    
    onAfterUpdate(collection: string, query: Query, update: UpdateOperation, affectedDocs: Document[]): void {
      // Handle documents after update
    },
    
    async onBeforeDelete(collection: string, query: Query): Promise<Query> {
      // Modify query before delete operation
      return query;
    },
    
    onAfterDelete(collection: string, query: Query, deletedDocs: Document[]): void {
      // Handle documents after deletion
    },
    
    async onBeforeQuery(collection: string, query: Query): Promise<Query> {
      // Modify query before find operation
      return query;
    },
    
    async onAfterQuery(collection: string, query: Query, results: Document[]): Promise<Document[]> {
      // Modify results after find operation
      return results;
    }
  };
}`;
    
    await fs.writeFile(
      path.join(pluginDir, 'src', 'index.ts'),
      pluginImplementation
    );
    
    // Create test file
    const testImplementation = `import { describe, it, expect, vi } from 'vitest';
import { createDb, MemoryAdapter } from '@nebula/core';
import { ${functionName} } from './index';

describe('${pascalCase(name)} Plugin', () => {
  it('should initialize correctly', async () => {
    // Mock console.log
    const consoleSpy = vi.spyOn(console, 'log');
    
    // Create plugin
    const plugin = ${functionName}();
    
    // Create database with plugin
    const db = createDb({
      adapter: new MemoryAdapter(),
      plugins: [plugin]
    });
    
    // Check if plugin was initialized
    expect(consoleSpy).toHaveBeenCalledWith('${pascalCase(name)} plugin initialized');
    
    // Restore console.log
    consoleSpy.mockRestore();
  });
  
  it('should handle document operations', async () => {
    // Create plugin
    const plugin = ${functionName}();
    
    // Create database with plugin
    const db = createDb({
      adapter: new MemoryAdapter(),
      plugins: [plugin]
    });
    
    // Get a collection
    const users = db.collection('users');
    
    // Insert a document
    const user = await users.insert({ name: 'Alice' });
    
    // Find the document
    const foundUser = await users.findOne({ id: user.id });
    
    // Check if document was inserted correctly
    expect(foundUser).toEqual(user);
  });
});`;
    
    await fs.writeFile(
      path.join(pluginDir, 'src', 'index.test.ts'),
      testImplementation
    );
    
    // Create README.md
    const readme = `# ${pascalCase(name)} Plugin for NebulaDB

This plugin adds ${name} functionality to NebulaDB.

## Installation

\`\`\`bash
npm install @nebula/core @nebula/plugin-${pluginName}
\`\`\`

## Usage

\`\`\`typescript
import { createDb } from '@nebula/core';
import { MemoryAdapter } from '@nebula/adapter-memory';
import { ${functionName} } from '@nebula/plugin-${pluginName}';

// Create the plugin
const ${camelCase(name)}Plugin = ${functionName}({
  // Plugin options
});

// Create a database with the plugin
const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [${camelCase(name)}Plugin]
});

// Use the database normally
const users = db.collection('users');
await users.insert({ name: 'Alice' });
\`\`\`

## API

### \`${functionName}(options)\`

Creates a new ${name} plugin.

#### Options

- \`option1\`: Description of option1
- \`option2\`: Description of option2

## License

MIT
`;
    
    await fs.writeFile(
      path.join(pluginDir, 'README.md'),
      readme
    );
    
    spinner.succeed(`Plugin ${chalk.cyan(pluginName)} generated successfully!`);
    console.log(`\nTo use your new plugin:`);
    console.log(`1. cd ${directory}/${pluginName}`);
    console.log(`2. npm install`);
    console.log(`3. npm run build`);
    console.log(`\nThen import it in your project:`);
    console.log(`import { ${functionName} } from '@nebula/plugin-${pluginName}';`);
    
  } catch (error) {
    spinner.fail(`Failed to generate plugin: ${error.message}`);
    throw error;
  }
}
