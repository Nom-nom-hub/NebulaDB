#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const marked = require('marked');

// Create a simple HTML template
function createHtmlTemplate(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - NebulaDB Documentation</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            padding-top: 60px;
            padding-bottom: 40px;
        }
        .navbar {
            background: linear-gradient(135deg, #6e8efb, #a777e3);
        }
        pre {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
        }
        code {
            color: #6e8efb;
        }
        .content {
            max-width: 900px;
            margin: 0 auto;
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5rem;
            margin-bottom: 1rem;
        }
        table {
            width: 100%;
            margin-bottom: 1rem;
            border-collapse: collapse;
        }
        table, th, td {
            border: 1px solid #dee2e6;
        }
        th, td {
            padding: 0.75rem;
            vertical-align: top;
        }
        th {
            background-color: #f8f9fa;
        }
    </style>
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark fixed-top">
        <div class="container">
            <a class="navbar-brand" href="index.html">NebulaDB</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item">
                        <a class="nav-link" href="index.html#features">Features</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="index.html#getting-started">Getting Started</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="index.html#documentation">Documentation</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="https://github.com/Nom-nom-hub/NebulaDB" target="_blank">GitHub</a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>

    <div class="container mt-5 content">
        ${content}
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;
}

// Function to convert markdown to HTML
function convertMarkdownToHtml(markdownPath) {
  try {
    const markdown = fs.readFileSync(markdownPath, 'utf8');
    const htmlContent = marked.parse(markdown);
    
    // Extract title from the first heading
    let title = 'Documentation';
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1];
    }
    
    // Create HTML file
    const htmlPath = markdownPath.replace('.md', '.html');
    const htmlContent2 = createHtmlTemplate(title, htmlContent);
    fs.writeFileSync(htmlPath, htmlContent2);
    
    console.log(`Converted ${markdownPath} to ${htmlPath}`);
  } catch (error) {
    console.error(`Error converting ${markdownPath}:`, error);
  }
}

// Install marked if not already installed
try {
  require.resolve('marked');
} catch (e) {
  console.log('Installing marked package...');
  require('child_process').execSync('npm install marked', { stdio: 'inherit' });
}

// Convert all markdown files in the docs directory
const docsDir = __dirname;
const files = fs.readdirSync(docsDir);

files.forEach(file => {
  if (file.endsWith('.md')) {
    convertMarkdownToHtml(path.join(docsDir, file));
  }
});

console.log('All markdown files have been converted to HTML!');
