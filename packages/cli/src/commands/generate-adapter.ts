import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { pascalCase, kebabCase } from '../utils/string';

/**
 * Generate a new adapter
 */
export async function generateAdapter(name: string, directory: string): Promise<void> {
  const spinner = ora('Generating adapter...').start();

  try {
    // Format names
    const adapterName = kebabCase(name);
    const className = pascalCase(name) + 'Adapter';
    // const variableName = camelCase(name) + 'Adapter';

    // Create directory
    const adapterDir = path.resolve(process.cwd(), directory, adapterName);
    await fs.ensureDir(adapterDir);
    await fs.ensureDir(path.join(adapterDir, 'src'));

    // Create package.json
    const packageJson = {
      name: `@nebula/adapter-${adapterName}`,
      version: '0.1.0',
      description: `${name} adapter for NebulaDB`,
      main: 'dist/index.js',
      module: 'dist/index.mjs',
      types: 'dist/index.d.ts',
      files: ['dist'],
      scripts: {
        build: 'tsup src/index.ts --format cjs,esm --dts',
        test: 'vitest run',
        'test:watch': 'vitest'
      },
      keywords: ['database', 'nosql', adapterName, 'adapter'],
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
      path.join(adapterDir, 'package.json'),
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
      path.join(adapterDir, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    );

    // Create adapter implementation
    const adapterImplementation = `import { Adapter, Document } from '@nebula/core';

/**
 * ${name} adapter for NebulaDB
 */
export class ${className} implements Adapter {
  /**
   * Create a new ${className}
   */
  constructor() {
    // Initialize your adapter here
  }

  /**
   * Load data from ${name}
   */
  async load(): Promise<Record<string, Document[]>> {
    try {
      // Implement loading data from your storage
      return {};
    } catch (error) {
      console.error('Failed to load data from ${name}:', error);
      return {};
    }
  }

  /**
   * Save data to ${name}
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    try {
      // Implement saving data to your storage
    } catch (error) {
      console.error('Failed to save data to ${name}:', error);
      throw error;
    }
  }

  /**
   * Close the ${name} connection
   */
  async close(): Promise<void> {
    // Implement closing connection if needed
  }
}`;

    await fs.writeFile(
      path.join(adapterDir, 'src', 'index.ts'),
      adapterImplementation
    );

    // Create test file
    const testImplementation = `import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ${className} } from './index';

describe('${className}', () => {
  let adapter: ${className};

  beforeEach(() => {
    adapter = new ${className}();
  });

  afterEach(async () => {
    await adapter.close();
  });

  it('should load and save data', async () => {
    // Test implementation
    const testData = {
      users: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' }
      ]
    };

    await adapter.save(testData);
    const loadedData = await adapter.load();

    expect(loadedData).toEqual(testData);
  });
});`;

    await fs.writeFile(
      path.join(adapterDir, 'src', 'index.test.ts'),
      testImplementation
    );

    // Create README.md
    const readme = `# ${name} Adapter for NebulaDB

This adapter allows NebulaDB to store data in ${name}.

## Installation

\`\`\`bash
npm install @nebula/core @nebula/adapter-${adapterName}
\`\`\`

## Usage

\`\`\`typescript
import { createDb } from '@nebula/core';
import { ${className} } from '@nebula/adapter-${adapterName}';

// Create a database with ${name} adapter
const db = createDb({
  adapter: new ${className}()
});

// Use the database normally
const users = db.collection('users');
await users.insert({ name: 'Alice' });
\`\`\`

## API

### \`${className}\`

\`\`\`typescript
new ${className}()
\`\`\`

## License

MIT
`;

    await fs.writeFile(
      path.join(adapterDir, 'README.md'),
      readme
    );

    spinner.succeed(`Adapter ${chalk.cyan(adapterName)} generated successfully!`);
    console.log(`\nTo use your new adapter:`);
    console.log(`1. cd ${directory}/${adapterName}`);
    console.log(`2. npm install`);
    console.log(`3. npm run build`);
    console.log(`\nThen import it in your project:`);
    console.log(`import { ${className} } from '@nebula/adapter-${adapterName}';`);

  } catch (error) {
    spinner.fail(`Failed to generate adapter: ${error.message}`);
    throw error;
  }
}
