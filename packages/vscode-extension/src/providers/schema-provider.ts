import * as vscode from 'vscode';
import { SchemaParser } from '../parsers/schema-parser';

export class SchemaProvider implements vscode.TreeDataProvider<SchemaItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SchemaItem | undefined | null | void> = new vscode.EventEmitter<SchemaItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<SchemaItem | undefined | null | void> = this._onDidChangeTreeData.event;
  
  constructor(private schemaParser: SchemaParser) {}
  
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
  
  getTreeItem(element: SchemaItem): vscode.TreeItem {
    return element;
  }
  
  getChildren(element?: SchemaItem): Thenable<SchemaItem[]> {
    if (!element) {
      // Root level - show collections
      const collections = this.schemaParser.getCollections();
      
      return Promise.resolve(
        collections.map(collection => new SchemaItem(
          collection.name,
          collection.filePath,
          vscode.TreeItemCollapsibleState.Collapsed,
          {
            command: 'vscode.open',
            title: 'Open File',
            arguments: [vscode.Uri.file(collection.filePath)]
          },
          'collection'
        ))
      );
    } else if (element.contextValue === 'collection') {
      // Collection level - show fields
      const collection = this.schemaParser.getCollection(element.label as string);
      
      if (!collection) {
        return Promise.resolve([]);
      }
      
      const fields = collection.fields.map(field => new SchemaItem(
        `${field.name}: ${field.type}`,
        element.filePath,
        vscode.TreeItemCollapsibleState.None,
        undefined,
        'field'
      ));
      
      const indexes = collection.indexes.map(index => new SchemaItem(
        `Index: ${index.name} (${index.type})`,
        element.filePath,
        vscode.TreeItemCollapsibleState.None,
        undefined,
        'index'
      ));
      
      return Promise.resolve([...fields, ...indexes]);
    }
    
    return Promise.resolve([]);
  }
}

export class SchemaItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly filePath: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command,
    public readonly contextValue?: string
  ) {
    super(label, collapsibleState);
    
    // Set icon based on context value
    if (contextValue === 'collection') {
      this.iconPath = new vscode.ThemeIcon('database');
    } else if (contextValue === 'field') {
      this.iconPath = new vscode.ThemeIcon('symbol-field');
    } else if (contextValue === 'index') {
      this.iconPath = new vscode.ThemeIcon('list-ordered');
    }
  }
}
