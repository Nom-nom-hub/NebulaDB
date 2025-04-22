import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Configuration template for NebulaDB
const nebulaConfigTemplate = `// NebulaDB Configuration
import { MemoryAdapter } from '@nebula-db/nebula-db';

export default {
  adapter: new MemoryAdapter(), // Use appropriate adapter: MemoryAdapter, IndexedDBAdapter, etc.
  options: {
    // Adapter-specific options
  },
  collections: {
    // Define your collections here
    users: {
      schema: {
        id: { type: 'string', optional: true },
        name: { type: 'string' },
        email: { type: 'string' },
        age: { type: 'number' }
      },
      indexes: ['email']
    }
  }
};
`;

// Project initialization template
const projectInitTemplate = `import { createDatabase } from '@nebula-db/nebula-db';
import config from './nebula.config.ts';

// Create database instance with configuration
const db = createDatabase(config);

// Export collections for use in your application
export const users = db.collection('users');

// Export the database instance
export default db;
`;

export function activate(context: vscode.ExtensionContext) {
	console.log('NebulaDB extension is now active!');

	// Command: Create NebulaDB configuration file
	const createConfigCommand = vscode.commands.registerCommand('nebuladb-vscode.createConfig', async () => {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			vscode.window.showErrorMessage('No workspace folder open. Please open a folder first.');
			return;
		}

		const rootPath = workspaceFolders[0].uri.fsPath;
		const configPath = path.join(rootPath, 'nebula.config.ts');

		// Check if file already exists
		if (fs.existsSync(configPath)) {
			const overwrite = await vscode.window.showWarningMessage(
				'NebulaDB configuration file already exists. Overwrite?',
				'Yes',
				'No'
			);
			if (overwrite !== 'Yes') {
				return;
			}
		}

		// Create the configuration file
		fs.writeFileSync(configPath, nebulaConfigTemplate);

		// Open the file in the editor
		const document = await vscode.workspace.openTextDocument(configPath);
		await vscode.window.showTextDocument(document);

		vscode.window.showInformationMessage('NebulaDB configuration file created successfully!');
	});

	// Command: Initialize NebulaDB project
	const initProjectCommand = vscode.commands.registerCommand('nebuladb-vscode.initializeProject', async () => {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			vscode.window.showErrorMessage('No workspace folder open. Please open a folder first.');
			return;
		}

		const rootPath = workspaceFolders[0].uri.fsPath;
		const configPath = path.join(rootPath, 'nebula.config.ts');
		const dbPath = path.join(rootPath, 'db.ts');

		// Create config file if it doesn't exist
		if (!fs.existsSync(configPath)) {
			fs.writeFileSync(configPath, nebulaConfigTemplate);
			vscode.window.showInformationMessage('Created NebulaDB configuration file.');
		}

		// Create db initialization file
		fs.writeFileSync(dbPath, projectInitTemplate);

		// Open the file in the editor
		const document = await vscode.workspace.openTextDocument(dbPath);
		await vscode.window.showTextDocument(document);

		vscode.window.showInformationMessage('NebulaDB project initialized successfully!');
	});

	// Command: Open NebulaDB documentation
	const showDocsCommand = vscode.commands.registerCommand('nebuladb-vscode.showDocs', () => {
		vscode.env.openExternal(vscode.Uri.parse('https://github.com/Nom-nom-hub/NebulaDB'));
	});

	context.subscriptions.push(createConfigCommand);
	context.subscriptions.push(initProjectCommand);
	context.subscriptions.push(showDocsCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}
