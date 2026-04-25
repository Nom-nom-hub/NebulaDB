import * as fs from 'fs-extra';
import * as path from 'path';
import * as http from 'http';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Launch NebulaDB devtools - a simple web-based database explorer
 */
export async function launchDevtools(port: number): Promise<void> {
  const spinner = ora('Launching NebulaDB devtools...').start();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>NebulaDB Devtools</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 {
      color: #1a1a2e;
      border-bottom: 3px solid #4a90d9;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; font-weight: 600; }
    input, select, textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    button {
      background: #4a90d9;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    button:hover { background: #357abd; }
    .collections { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
    .collection-card {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .collection-card:hover { background: #e9e9e9; }
    .collection-card h3 { margin-bottom: 5px; }
    .stat { font-size: 24px; font-weight: bold; color: #4a90d9; }
    pre {
      background: #1a1a2e;
      color: #0f0;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      max-height: 400px;
    }
    .error { color: red; }
    .success { color: green; }
  </style>
</head>
<body>
  <h1>NebulaDB Devtools</h1>
  
  <div class="card">
    <h2>Collections</h2>
    <div id="collections" class="collections">Loading...</div>
  </div>
  
  <div class="card">
    <h2>Query Console</h2>
    <div class="form-group">
      <label>Collection</label>
      <select id="collectionSelect"></select>
    </div>
    <div class="form-group">
      <label>Query (JSON)</label>
      <textarea id="queryInput" rows="4" placeholder='{"age": {"$gt": 18}}'></textarea>
    </div>
    <button onclick="executeQuery()">Execute Query</button>
    <div id="queryResult" style="margin-top: 15px;"></div>
  </div>
  
  <div class="card">
    <h2>Insert Document</h2>
    <div class="form-group">
      <label>Collection</label>
      <input id="insertCollection" placeholder="users">
    </div>
    <div class="form-group">
      <label>Document (JSON)</label>
      <textarea id="insertData" rows="4" placeholder='{"name": "John", "age": 30}'></textarea>
    </div>
    <button onclick="insertDocument()">Insert</button>
    <div id="insertResult" style="margin-top: 15px;"></div>
  </div>

  <script>
    let dbData = { collections: {} };
    
    async function loadCollections() {
      try {
        const res = await fetch('/api/collections');
        dbData = await res.json();
        const container = document.getElementById('collections');
        const select = document.getElementById('collectionSelect');
        
        if (Object.keys(dbData.collections).length === 0) {
          container.innerHTML = '<p>No collections yet. Insert a document to create one.</p>';
          return;
        }
        
        container.innerHTML = '';
        select.innerHTML = '<option value="">Select collection</option>';
        
        for (const [name, docs] of Object.entries(dbData.collections)) {
          const count = Array.isArray(docs) ? docs.length : 0;
          container.innerHTML += '<div class="collection-card"><h3>' + name + '</h3><div class="stat">' + count + ' docs</div></div>';
          select.innerHTML += '<option value="' + name + '">' + name + ' (' + count + ')</option>';
        }
      } catch (e) {
        document.getElementById('collections').innerHTML = '<p class="error">Error: ' + e.message + '</p>';
      }
    }
    
    async function executeQuery() {
      const collection = document.getElementById('collectionSelect').value;
      const query = document.getElementById('queryInput').value;
      
      if (!collection) {
        document.getElementById('queryResult').innerHTML = '<p class="error">Please select a collection</p>';
        return;
      }
      
      try {
        const q = query ? JSON.parse(query) : {};
        const res = await fetch('/api/query', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({collection, query: q})
        });
        const result = await res.json();
        document.getElementById('queryResult').innerHTML = '<pre>' + JSON.stringify(result, null, 2) + '</pre>';
      } catch (e) {
        document.getElementById('queryResult').innerHTML = '<p class="error">Error: ' + e.message + '</p>';
      }
    }
    
    async function insertDocument() {
      const collection = document.getElementById('insertCollection').value;
      const data = document.getElementById('insertData').value;
      
      if (!collection || !data) {
        document.getElementById('insertResult').innerHTML = '<p class="error">Please provide collection and document data</p>';
        return;
      }
      
      try {
        const doc = JSON.parse(data);
        const res = await fetch('/api/insert', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({collection, doc})
        });
        const result = await res.json();
        document.getElementById('insertResult').innerHTML = '<p class="success">Inserted: ' + result.id + '</p>';
        loadCollections();
      } catch (e) {
        document.getElementById('insertResult').innerHTML = '<p class="error">Error: ' + e.message + '</p>';
      }
    }
    
    loadCollections();
  </script>
</body>
</html>
`;

  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(htmlContent);
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  server.listen(port, () => {
    spinner.succeed(`NebulaDB devtools running at ${chalk.cyan(`http://localhost:${port}`)}`);
    spinner.info('Press Ctrl+C to stop the server.');
  });

  server.on('error', (err) => {
    if ((err as any).code === 'EADDRINUSE') {
      spinner.fail(`Port ${port} is already in use. Try a different port.`);
    } else {
      spinner.fail(`Failed to start devtools server: ${err.message}`);
    }
    throw err;
  });
}