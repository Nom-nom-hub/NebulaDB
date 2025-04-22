import * as vscode from 'vscode';

export class DevToolsPanel {
  /**
   * Track the currently panel. Only allow a single panel to exist at a time.
   */
  public static currentPanel: DevToolsPanel | undefined;
  
  public static readonly viewType = 'nebulaDevTools';
  
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  
  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;
    
    // If we already have a panel, show it.
    if (DevToolsPanel.currentPanel) {
      DevToolsPanel.currentPanel._panel.reveal(column);
      return;
    }
    
    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      DevToolsPanel.viewType,
      'NebulaDB DevTools',
      column || vscode.ViewColumn.One,
      {
        // Enable JavaScript in the webview
        enableScripts: true,
        
        // Restrict the webview to only load content from our extension's directory
        localResourceRoots: [extensionUri],
        
        // Retain context when hidden
        retainContextWhenHidden: true
      }
    );
    
    DevToolsPanel.currentPanel = new DevToolsPanel(panel, extensionUri);
  }
  
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    
    // Get DevTools port from configuration
    const config = vscode.workspace.getConfiguration('nebulaDB');
    const port = config.get<number>('devtools.port') || 3333;
    
    // Set the webview's initial html content
    this._update(port);
    
    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programmatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }
  
  public dispose() {
    DevToolsPanel.currentPanel = undefined;
    
    // Clean up our resources
    this._panel.dispose();
    
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
  
  private _update(port: number) {
    // Create iframe to DevTools
    this._panel.webview.html = `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NebulaDB DevTools</title>
        <style>
          body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            overflow: hidden;
          }
          
          iframe {
            width: 100%;
            height: 100%;
            border: none;
          }
          
          .error {
            padding: 20px;
            color: #e74c3c;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <iframe src="http://localhost:${port}" id="devtools-iframe"></iframe>
        
        <script>
          const iframe = document.getElementById('devtools-iframe');
          
          iframe.onerror = function() {
            document.body.innerHTML = '<div class="error">Failed to connect to NebulaDB DevTools. Make sure the DevTools server is running on port ${port}.</div>';
          };
          
          // Handle iframe load errors
          window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'iframe-error') {
              document.body.innerHTML = '<div class="error">Failed to connect to NebulaDB DevTools. Make sure the DevTools server is running on port ${port}.</div>';
            }
          });
        </script>
      </body>
      </html>`;
  }
}
