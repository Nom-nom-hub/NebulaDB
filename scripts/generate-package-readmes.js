#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to generate a README for a package
function generateReadme(packagePath, packageJson) {
  const packageName = packageJson.name;
  const packageDescription = packageJson.description || '';
  const packageType = packageName.includes('adapter') ? 'adapter' : 
                     packageName.includes('plugin') ? 'plugin' : 'core';
  
  let content = `# ${packageName}\n\n`;
  content += `${packageDescription}\n\n`;
  
  content += `Part of the [NebulaDB](https://github.com/Nom-nom-hub/NebulaDB) project - a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database.\n\n`;
  
  content += `## Installation\n\n`;
  content += `\`\`\`bash\nnpm install ${packageName}\n\`\`\`\n\n`;
  
  if (packageType === 'core') {
    content += `## Quick Start\n\n`;
    content += `\`\`\`typescript\nimport { createDb } from '${packageName}';\nimport { MemoryAdapter } from '@nebula-db/adapter-memory';\n\n`;
    content += `// Create a database with in-memory adapter\nconst db = createDb({\n  adapter: new MemoryAdapter()\n});\n\n`;
    content += `// Create a collection\nconst users = db.collection('users');\n\n`;
    content += `// Insert a document\nawait users.insert({ name: 'Alice', age: 30 });\n\n`;
    content += `// Query documents\nconst result = await users.find({ age: { $gt: 20 } });\nconsole.log(result);\n\`\`\`\n\n`;
  } else if (packageType === 'adapter') {
    const adapterName = packageName.split('/')[1].replace('adapter-', '');
    const adapterClassName = adapterName.charAt(0).toUpperCase() + adapterName.slice(1) + 'Adapter';
    
    content += `## Usage\n\n`;
    content += `\`\`\`typescript\nimport { createDb } from '@nebula-db/core';\nimport { ${adapterClassName} } from '${packageName}';\n\n`;
    content += `// Create a database with ${adapterName} adapter\nconst db = createDb({\n  adapter: new ${adapterClassName}()\n});\n\n`;
    content += `// Use the database\nconst users = db.collection('users');\nawait users.insert({ name: 'Alice', age: 30 });\n\`\`\`\n\n`;
  } else if (packageType === 'plugin') {
    const pluginName = packageName.split('/')[1].replace('plugin-', '');
    const pluginFunctionName = 'create' + pluginName.charAt(0).toUpperCase() + pluginName.slice(1) + 'Plugin';
    
    content += `## Usage\n\n`;
    content += `\`\`\`typescript\nimport { createDb } from '@nebula-db/core';\nimport { MemoryAdapter } from '@nebula-db/adapter-memory';\nimport { ${pluginFunctionName} } from '${packageName}';\n\n`;
    content += `// Create the plugin\nconst ${pluginName}Plugin = ${pluginFunctionName}();\n\n`;
    content += `// Create a database with the plugin\nconst db = createDb({\n  adapter: new MemoryAdapter(),\n  plugins: [${pluginName}Plugin]\n});\n\n`;
    content += `// Use the database with the plugin\nconst users = db.collection('users');\nawait users.insert({ name: 'Alice', age: 30 });\n\`\`\`\n\n`;
  }
  
  content += `## Documentation\n\n`;
  content += `For full documentation, visit the [NebulaDB GitHub repository](https://github.com/Nom-nom-hub/NebulaDB).\n\n`;
  
  content += `## License\n\n`;
  content += `MIT\n`;
  
  // Write the README.md file
  fs.writeFileSync(path.join(packagePath, 'README.md'), content);
  console.log(`Generated README for ${packageName}`);
}

// Function to process a package
function processPackage(packagePath) {
  try {
    const packageJsonPath = path.join(packagePath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Skip node_modules
    if (packagePath.includes('node_modules')) {
      return;
    }
    
    // Skip the root package
    if (packageJson.name === 'nebula-db') {
      return;
    }
    
    // Only process @nebula-db packages
    if (packageJson.name && packageJson.name.startsWith('@nebula-db/')) {
      generateReadme(packagePath, packageJson);
    }
  } catch (error) {
    console.error(`Error processing ${packagePath}:`, error);
  }
}

// Function to recursively find all package.json files
function findPackages(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules')) {
      if (fs.existsSync(path.join(filePath, 'package.json'))) {
        processPackage(filePath);
      }
      findPackages(filePath);
    }
  });
}

// Start the process from the packages directory
findPackages(path.join(__dirname, '..', 'packages'));
console.log('README files have been generated for all packages!');
