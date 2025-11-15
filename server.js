/**
 * Simple HTTP server for Cursive (replaces Flask)
 * Serves static files only - all logic moved to Supabase
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 5022;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.yaml': 'text/yaml',
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Parse URL
  let filePath = req.url === '/' ? '/index.html' : req.url;

  // Remove query string
  filePath = filePath.split('?')[0];

  // Security: prevent directory traversal
  if (filePath.includes('..')) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Map paths
  if (filePath.startsWith('/static/')) {
    filePath = filePath;  // Already correct
  } else if (filePath === '/index.html' || filePath === '/') {
    filePath = '/index.html';
  } else if (filePath.startsWith('/pages/')) {
    // Serve shared pages
    filePath = filePath;
  } else {
    // Try as static file
    filePath = '/static' + filePath;
  }

  const fullPath = path.join(BASE_DIR, filePath);
  const ext = path.extname(fullPath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Read and serve file
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found - serve index.html for SPA
        fs.readFile(path.join(BASE_DIR, 'index.html'), (err, data) => {
          if (err) {
            res.writeHead(500);
            res.end('Server error');
            return;
          }
          res.writeHead(200, {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-store, no-cache, must-revalidate'
          });
          res.end(data);
        });
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
      return;
    }

    // Serve file with no-cache headers
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`✅ Cursive server running on http://localhost:${PORT}`);
  console.log(`📁 Serving static files from ${BASE_DIR}`);
  console.log(`🔌 Connected to Supabase cloud database`);
});
