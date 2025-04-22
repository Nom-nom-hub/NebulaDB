import * as vscode from 'vscode';
import { SchemaParser } from '../parsers/schema-parser';

export class SchemaPreviewPanel {
  /**
   * Track the currently panel. Only allow a single panel to exist at a time.
   */
  public static currentPanel: SchemaPreviewPanel | undefined;

  public static readonly viewType = 'nebulaSchemaPreview';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _schemaParser: SchemaParser;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri, schemaParser: SchemaParser) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it.
    if (SchemaPreviewPanel.currentPanel) {
      SchemaPreviewPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      SchemaPreviewPanel.viewType,
      'NebulaDB Schema Preview',
      column || vscode.ViewColumn.One,
      {
        // Enable JavaScript in the webview
        enableScripts: true,

        // Restrict the webview to only load content from our extension's directory
        localResourceRoots: [extensionUri]
      }
    );

    SchemaPreviewPanel.currentPanel = new SchemaPreviewPanel(panel, extensionUri, schemaParser);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, schemaParser: SchemaParser) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._schemaParser = schemaParser;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programmatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Update the content based on view changes
    this._panel.onDidChangeViewState(
      () => {
        if (this._panel.visible) {
          this._update();
        }
      },
      null,
      this._disposables
    );

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'refresh':
            this._update();
            return;
        }
      },
      null,
      this._disposables
    );
  }

  public dispose() {
    SchemaPreviewPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    const webview = this._panel.webview;

    // Get current editor
    const editor = vscode.window.activeTextEditor;

    if (editor) {
      // Parse the current file
      this._schemaParser.parseFile(editor.document.uri.fsPath);
    }

    // Get all collections
    const collections = this._schemaParser.getCollections();

    // Update the webview content
    this._panel.webview.html = this._getHtmlForWebview(webview, collections);
  }

  private _getHtmlForWebview(webview: vscode.Webview, collections: any[]) {
    // Create HTML for collections
    const collectionsHtml = collections.map(collection => {
      // Create HTML for fields
      const fieldsHtml = collection.fields.map(field => {
        return `
          <div class="field">
            <div class="field-name">${field.name}</div>
            <div class="field-type">${field.type}</div>
            <div class="field-required">${field.required ? 'Required' : 'Optional'}</div>
            ${field.defaultValue ? `<div class="field-default">Default: ${field.defaultValue}</div>` : ''}
          </div>
        `;
      }).join('');

      // Create HTML for indexes
      const indexesHtml = collection.indexes.map(index => {
        return `
          <div class="index">
            <div class="index-name">${index.name}</div>
            <div class="index-fields">Fields: ${index.fields.join(', ')}</div>
            <div class="index-type">Type: ${index.type}</div>
          </div>
        `;
      }).join('');

      return `
        <div class="collection">
          <h2 class="collection-name">${collection.name}</h2>
          <div class="collection-path">${collection.filePath}</div>

          <h3>Fields</h3>
          <div class="fields">
            ${fieldsHtml || '<div class="empty">No fields defined</div>'}
          </div>

          <h3>Indexes</h3>
          <div class="indexes">
            ${indexesHtml || '<div class="empty">No indexes defined</div>'}
          </div>
        </div>
      `;
    }).join('');

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NebulaDB Schema Preview</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
          }

          h1 {
            font-size: 1.5em;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
          }

          .collection {
            margin-bottom: 30px;
            padding: 15px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 5px;
          }

          .collection-name {
            font-size: 1.2em;
            margin-top: 0;
            margin-bottom: 5px;
            color: var(--vscode-symbolIcon-classForeground);
          }

          .collection-path {
            font-size: 0.8em;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 15px;
          }

          h3 {
            font-size: 1em;
            margin-top: 15px;
            margin-bottom: 10px;
            color: var(--vscode-symbolIcon-propertyForeground);
          }

          .fields, .indexes {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .field, .index {
            padding: 10px;
            background-color: var(--vscode-input-background);
            border-radius: 3px;
          }

          .field-name, .index-name {
            font-weight: bold;
            color: var(--vscode-symbolIcon-fieldForeground);
          }

          .field-type {
            color: var(--vscode-symbolIcon-typeParameterForeground);
          }

          .field-required {
            color: var(--vscode-inputValidation-infoForeground);
          }

          .field-default {
            color: var(--vscode-descriptionForeground);
          }

          .index-fields, .index-type {
            color: var(--vscode-descriptionForeground);
          }

          .empty {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
          }

          .refresh-button {
            position: absolute;
            top: 20px;
            right: 20px;
            padding: 5px 10px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
          }

          .refresh-button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }

          .no-collections {
            text-align: center;
            padding: 30px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <h1>NebulaDB Schema Preview</h1>

        <button class="refresh-button" onclick="refresh()">Refresh</button>

        ${collections.length > 0
          ? collectionsHtml
          : '<div class="no-collections">No collections found in the workspace</div>'}

        <script>
          const vscode = acquireVsCodeApi();

          function refresh() {
            vscode.postMessage({
              command: 'refresh'
            });
          }
        </script>
      </body>
      </html>`;
  }
}
