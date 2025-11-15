import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { networkInterfaces } from 'os';

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

// Get local network IP address
function getNetworkAddress() {
  const nets = networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4;
      if (net.family === familyV4Value && !net.internal) {
        return net.address;
      }
    }
  }

  return null;
}

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
  const networkAddress = getNetworkAddress();

  console.log('');
  console.log('  🎨 Cursive - AI-Powered Digital Notebook');
  console.log('');
  console.log(`  - Local:    http://localhost:${PORT}`);

  if (networkAddress) {
    console.log(`  - Network:  http://${networkAddress}:${PORT}`);
  }

  console.log('');
  console.log('  💡 Open the Network URL on your iPad to test with Apple Pencil');
  console.log('');
});
