import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0'; // Bind to all interfaces for iPad access

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.yaml': 'text/yaml'
};

const server = createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Parse URL
  let filePath = req.url === '/' ? '/index.html' : req.url;
  
  // Remove query string
  filePath = filePath.split('?')[0];

  // Determine file path
  let fullPath;
  if (filePath.startsWith('/css/') || filePath.startsWith('/js/') || filePath.startsWith('/config/')) {
    fullPath = join(__dirname, 'static', filePath);
  } else {
    fullPath = join(__dirname, filePath);
  }

  try {
    const data = await readFile(fullPath);
    const ext = extname(fullPath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    res.writeHead(200, { 
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n🚀 Cursive is running!`);
  console.log(`\n📱 Local:     http://localhost:${PORT}`);
  console.log(`📱 Network:   http://0.0.0.0:${PORT}`);
  console.log(`\n💡 To access from iPad:`);
  console.log(`   1. Find your computer's IP address (ifconfig or ipconfig)`);
  console.log(`   2. Open http://YOUR_IP:${PORT} on your iPad\n`);
});
