import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class PluginProvider implements vscode.TreeDataProvider<PluginItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<PluginItem | undefined | null | void> = new vscode.EventEmitter<PluginItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<PluginItem | undefined | null | void> = this._onDidChangeTreeData.event;
  
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
  
  getTreeItem(element: PluginItem): vscode.TreeItem {
    return element;
  }
  
  getChildren(element?: PluginItem): Thenable<PluginItem[]> {
    if (!element) {
      // Root level - find plugins in package.json
      return this.findPlugins();
    } else if (element.contextValue === 'plugin') {
      // Plugin level - show hooks
      return this.getPluginHooks(element.label as string, element.pluginPath);
    }
    
    return Promise.resolve([]);
  }
  
  private async findPlugins(): Promise<PluginItem[]> {
    const plugins: PluginItem[] = [];
    
    // Find all package.json files in the workspace
    const packageJsonFiles = await vscode.workspace.findFiles('**/package.json', '**/node_modules/**');
    
    for (const uri of packageJsonFiles) {
      try {
        const content = await fs.promises.readFile(uri.fsPath, 'utf-8');
        const packageJson = JSON.parse(content);
        
        // Check if this is a NebulaDB plugin
        if (
          packageJson.name &&
          (packageJson.name.startsWith('@nebula/plugin-') || packageJson.name.includes('nebula-plugin'))
        ) {
          const pluginName = packageJson.name.replace('@nebula/plugin-', '').replace('nebula-plugin-', '');
          
          plugins.push(new PluginItem(
            pluginName,
            path.dirname(uri.fsPath),
            vscode.TreeItemCollapsibleState.Collapsed,
            {
              command: 'vscode.open',
              title: 'Open Package',
              arguments: [uri]
            },
            'plugin'
          ));
        }
      } catch (error) {
        console.error(`Error parsing ${uri.fsPath}:`, error);
      }
    }
    
    return plugins;
  }
  
  private async getPluginHooks(pluginName: string, pluginPath: string): Promise<PluginItem[]> {
    const hooks: PluginItem[] = [];
    
    // Find the main plugin file
    const srcFiles = await vscode.workspace.findFiles(
      path.join(pluginPath, 'src', '**/*.{ts,js}'),
      '**/node_modules/**'
    );
    
    for (const uri of srcFiles) {
      try {
        const content = await fs.promises.readFile(uri.fsPath, 'utf-8');
        
        // Look for plugin hooks
        const hookRegex = /on[A-Z][a-zA-Z]+\s*[:(]/g;
        const matches = content.match(hookRegex);
        
        if (matches) {
          for (const match of matches) {
            const hookName = match.replace(/[:(]$/, '');
            
            hooks.push(new PluginItem(
              hookName,
              uri.fsPath,
              vscode.TreeItemCollapsibleState.None,
              {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [uri]
              },
              'hook'
            ));
          }
        }
      } catch (error) {
        console.error(`Error parsing ${uri.fsPath}:`, error);
      }
    }
    
    return hooks;
  }
}

export class PluginItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly pluginPath: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command,
    public readonly contextValue?: string
  ) {
    super(label, collapsibleState);
    
    // Set icon based on context value
    if (contextValue === 'plugin') {
      this.iconPath = new vscode.ThemeIcon('package');
    } else if (contextValue === 'hook') {
      this.iconPath = new vscode.ThemeIcon('symbol-event');
    }
  }
}
