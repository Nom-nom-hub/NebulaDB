import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';

/**
 * Initialize a new NebulaDB project
 */
export async function initProject(directory: string): Promise<void> {
  const spinner = ora('Initializing NebulaDB project...').start();
  
  try {
    // Create directory if it doesn't exist
    const projectDir = path.resolve(process.cwd(), directory);
    await fs.ensureDir(projectDir);
    
    // Check if directory is empty
    const files = await fs.readdir(projectDir);
    if (files.length > 0) {
      spinner.stop();
      
      // Ask for confirmation to continue
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Directory is not empty. Continue anyway?',
          default: false
        }
      ]);
      
      if (!confirm) {
        console.log(chalk.yellow('Initialization cancelled.'));
        return;
      }
      
      spinner.start('Initializing NebulaDB project...');
    }
    
    // Ask for project configuration
    spinner.stop();
    
    const { projectName, adapter, typescript } = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        default: path.basename(projectDir)
      },
      {
        type: 'list',
        name: 'adapter',
        message: 'Select a storage adapter:',
        choices: [
          { name: 'Memory (in-memory, no persistence)', value: 'memory' },
          { name: 'LocalStorage (browser)', value: 'localstorage' },
          { name: 'IndexedDB (browser)', value: 'indexeddb' },
          { name: 'FileSystem (Node.js)', value: 'filesystem' },
          { name: 'SQLite (Node.js)', value: 'sqlite' },
          { name: 'Redis (Node.js)', value: 'redis' }
        ],
        default: 'memory'
      },
      {
        type: 'confirm',
        name: 'typescript',
        message: 'Use TypeScript?',
        default: true
      }
    ]);
    
    spinner.start('Creating project files...');
    
    // Create package.json
    const packageJson = {
      name: projectName,
      version: '0.1.0',
      private: true,
      scripts: {
        start: typescript ? 'ts-node src/index.ts' : 'node src/index.js',
        build: typescript ? 'tsc' : 'echo "No build step required"',
        test: 'vitest run',
        'test:watch': 'vitest'
      },
      dependencies: {
        '@nebula/core': '^0.1.0'
      },
      devDependencies: {}
    };
    
    // Add adapter dependency
    if (adapter !== 'memory') {
      packageJson.dependencies[`@nebula/adapter-${adapter}`] = '^0.1.0';
    }
    
    // Add TypeScript dependencies if needed
    if (typescript) {
      Object.assign(packageJson.devDependencies, {
        typescript: '^5.3.3',
        'ts-node': '^10.9.2',
        '@types/node': '^20.11.5'
      });
    }
    
    // Add test dependencies
    Object.assign(packageJson.devDependencies, {
      vitest: '^1.2.1'
    });
    
    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // Create tsconfig.json if using TypeScript
    if (typescript) {
      const tsConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'CommonJS',
          moduleResolution: 'node',
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          outDir: 'dist',
          lib: ['ES2020', 'DOM']
        },
        include: ['src'],
        exclude: ['node_modules', 'dist', '**/*.test.ts']
      };
      
      await fs.writeFile(
        path.join(projectDir, 'tsconfig.json'),
        JSON.stringify(tsConfig, null, 2)
      );
    }
    
    // Create src directory
    await fs.ensureDir(path.join(projectDir, 'src'));
    
    // Create index file
    const extension = typescript ? 'ts' : 'js';
    const indexContent = getIndexFileContent(adapter, typescript);
    
    await fs.writeFile(
      path.join(projectDir, 'src', `index.${extension}`),
      indexContent
    );
    
    // Create migrations directory
    await fs.ensureDir(path.join(projectDir, 'migrations'));
    
    // Create example migration
    const migrationContent = getMigrationFileContent(typescript);
    
    await fs.writeFile(
      path.join(projectDir, 'migrations', `001_initial.${extension}`),
      migrationContent
    );
    
    // Create README.md
    const readme = `# ${projectName}

A NebulaDB project.

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start the application
npm start
\`\`\`

## Project Structure

- \`src/\`: Source code
- \`migrations/\`: Database migrations
- \`tests/\`: Test files

## Scripts

- \`npm start\`: Start the application
- \`npm run build\`: Build the application
- \`npm test\`: Run tests
- \`npm run test:watch\`: Run tests in watch mode

## License

MIT
`;
    
    await fs.writeFile(
      path.join(projectDir, 'README.md'),
      readme
    );
    
    // Create .gitignore
    const gitignore = `# Dependencies
node_modules/
.pnp/
.pnp.js

# Build outputs
dist/
build/
lib/
.next/
out/

# Testing
coverage/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Editor directories and files
.idea/
.vscode/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# OS files
.DS_Store
Thumbs.db

# Database files
*.sqlite
*.db
`;
    
    await fs.writeFile(
      path.join(projectDir, '.gitignore'),
      gitignore
    );
    
    spinner.succeed(`NebulaDB project ${chalk.cyan(projectName)} initialized successfully!`);
    console.log(`\nNext steps:`);
    console.log(`1. cd ${directory}`);
    console.log(`2. npm install`);
    console.log(`3. npm start`);
    
  } catch (error) {
    spinner.fail(`Failed to initialize project: ${error.message}`);
    throw error;
  }
}

/**
 * Get the content for the index file
 */
function getIndexFileContent(adapter: string, typescript: boolean): string {
  const importStatement = typescript
    ? `import { createDb } from '@nebula/core';`
    : `const { createDb } = require('@nebula/core');`;
  
  let adapterImport = '';
  let adapterInstance = 'new MemoryAdapter()';
  
  if (adapter !== 'memory') {
    adapterImport = typescript
      ? `import { ${adapter.charAt(0).toUpperCase() + adapter.slice(1)}Adapter } from '@nebula/adapter-${adapter}';`
      : `const { ${adapter.charAt(0).toUpperCase() + adapter.slice(1)}Adapter } = require('@nebula/adapter-${adapter}');`;
    
    adapterInstance = `new ${adapter.charAt(0).toUpperCase() + adapter.slice(1)}Adapter(`;
    
    switch (adapter) {
      case 'filesystem':
        adapterInstance += `'./data.json'`;
        break;
      case 'localstorage':
      case 'indexeddb':
        adapterInstance += `'my-database'`;
        break;
      case 'sqlite':
        adapterInstance += `'./database.sqlite'`;
        break;
      case 'redis':
        adapterInstance += `{ host: 'localhost', port: 6379 }`;
        break;
    }
    
    adapterInstance += `)`;
  } else {
    adapterImport = typescript
      ? `import { MemoryAdapter } from '@nebula/core';`
      : `const { MemoryAdapter } = require('@nebula/core');`;
  }
  
  return `${importStatement}
${adapterImport}

// Create a database
const db = createDb({
  adapter: ${adapterInstance}
});

// Create a collection
const users = db.collection('users');

// Example usage
async function main() {
  try {
    // Insert a document
    const user = await users.insert({
      name: 'Alice',
      email: 'alice@example.com',
      age: 30
    });
    
    console.log('User inserted:', user);
    
    // Find documents
    const allUsers = await users.find();
    console.log('All users:', allUsers);
    
    // Update a document
    await users.update(
      { id: user.id },
      { $set: { age: 31 } }
    );
    
    // Find one document
    const updatedUser = await users.findOne({ id: user.id });
    console.log('Updated user:', updatedUser);
    
    // Delete a document
    await users.delete({ id: user.id });
    
    // Save the database
    await db.save();
    
    console.log('Database saved successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
main();
`;
}

/**
 * Get the content for the migration file
 */
function getMigrationFileContent(typescript: boolean): string {
  const exportStatement = typescript
    ? `export default {`
    : `module.exports = {`;
  
  return `${exportStatement}
  version: 1,
  name: 'Initial migration',
  
  async up(db) {
    // Create collections
    const users = db.collection('users');
    const posts = db.collection('posts');
    
    // Create indexes
    users.createIndex({
      name: 'email_idx',
      fields: ['email'],
      type: 'unique'
    });
    
    posts.createIndex({
      name: 'author_idx',
      fields: ['authorId'],
      type: 'single'
    });
    
    console.log('Migration applied successfully!');
  },
  
  async down(db) {
    // Revert migration
    // This is optional but recommended for production environments
    console.log('Migration reverted successfully!');
  }
};
`;
}
