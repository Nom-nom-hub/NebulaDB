import * as fs from 'fs';
import * as path from 'path';
import { AllBenchmarkResults } from './types';

/**
 * Generate benchmark report
 */
export async function generateReport(results: AllBenchmarkResults): Promise<void> {
  // Create report directory
  const reportDir = path.join(__dirname, '../report');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  // Generate HTML report
  const html = generateHtmlReport(results);
  fs.writeFileSync(path.join(reportDir, 'index.html'), html);
  
  // Generate JSON report
  fs.writeFileSync(
    path.join(reportDir, 'results.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log(`Report generated at ${reportDir}`);
}

/**
 * Generate HTML report
 */
function generateHtmlReport(results: AllBenchmarkResults): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NebulaDB Benchmark Results</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    h1, h2, h3 {
      color: #333;
    }
    .chart-container {
      position: relative;
      height: 400px;
      margin-bottom: 40px;
    }
    .summary {
      background-color: #f5f5f5;
      padding: 20px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 10px;
      border: 1px solid #ddd;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
  </style>
</head>
<body>
  <h1>NebulaDB Benchmark Results</h1>
  
  <div class="summary">
    <h2>Summary</h2>
    <p>
      This report compares the performance of NebulaDB against other NoSQL databases:
      RxDB and PouchDB. The benchmarks measure insert, query, and update operations.
    </p>
  </div>
  
  <h2>Insert Performance</h2>
  ${generateBenchmarkSection(results.insert)}
  
  <h2>Query Performance</h2>
  ${generateBenchmarkSection(results.query)}
  
  <h2>Update Performance</h2>
  ${generateBenchmarkSection(results.update)}
  
  <script>
    // Chart colors
    const colors = [
      'rgba(54, 162, 235, 0.8)',
      'rgba(255, 99, 132, 0.8)',
      'rgba(75, 192, 192, 0.8)',
      'rgba(255, 159, 64, 0.8)'
    ];
    
    // Create charts
    function createChart(canvasId, title, labels, datasets) {
      const ctx = document.getElementById(canvasId).getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: title,
              font: {
                size: 16
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.dataset.label + ': ' + context.raw.toFixed(2) + ' ops/sec';
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Operations per second'
              }
            }
          }
        }
      });
    }
    
    // Initialize charts
    document.addEventListener('DOMContentLoaded', function() {
      ${generateChartInitCode(results)}
    });
  </script>
</body>
</html>
  `;
}

/**
 * Generate benchmark section
 */
function generateBenchmarkSection(suites: any[]): string {
  let html = '';
  
  for (const suite of suites) {
    html += `
      <h3>${suite.name}</h3>
      <div class="chart-container">
        <canvas id="chart-${slugify(suite.name)}"></canvas>
      </div>
      <table>
        <thead>
          <tr>
            <th>Database</th>
            <th>Operations/sec</th>
            <th>Mean (ms)</th>
            <th>Deviation</th>
            <th>Margin of Error</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    for (const result of suite.results) {
      html += `
        <tr>
          <td>${result.name}</td>
          <td>${result.hz.toFixed(2)}</td>
          <td>${(result.stats.mean * 1000).toFixed(4)}</td>
          <td>${result.stats.deviation.toFixed(4)}</td>
          <td>${result.stats.moe.toFixed(4)}</td>
        </tr>
      `;
    }
    
    html += `
        </tbody>
      </table>
    `;
  }
  
  return html;
}

/**
 * Generate chart initialization code
 */
function generateChartInitCode(results: AllBenchmarkResults): string {
  let code = '';
  
  // Process all benchmark suites
  const allSuites = [
    ...results.insert,
    ...results.query,
    ...results.update
  ];
  
  for (const suite of allSuites) {
    const labels = suite.results.map(r => r.name);
    const data = suite.results.map(r => r.hz);
    
    code += `
      createChart(
        'chart-${slugify(suite.name)}',
        '${suite.name}',
        ${JSON.stringify(labels)},
        [{
          label: 'Operations per second',
          data: ${JSON.stringify(data)},
          backgroundColor: colors.slice(0, ${labels.length})
        }]
      );
    `;
  }
  
  return code;
}

/**
 * Convert string to slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
