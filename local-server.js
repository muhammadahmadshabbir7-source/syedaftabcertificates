const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {
  config,
  handleCategories,
  handleDeleteRecord,
  handleLogin,
  handleLogout,
  handleRecords,
  handleSession,
  sendError
} = require('./lib/portfolio-api');

const ROOT = __dirname;
const recordEventClients = new Set();

function sendRecordsChangedEvent() {
  const payload = JSON.stringify({ type: 'records-updated', at: Date.now() });
  for (const client of recordEventClients) {
    client.write(`event: records-updated\ndata: ${payload}\n\n`);
  }
}

function handleRecordEvents(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write(': connected\n\n');
  recordEventClients.add(res);

  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    recordEventClients.delete(res);
  });
}

async function handleLocalRecords(req, res) {
  await handleRecords(req, res);
  if (['POST', 'DELETE'].includes(req.method) && res.statusCode < 400) {
    sendRecordsChangedEvent();
  }
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/auth/login') return handleLogin(req, res);
  if (url.pathname === '/api/auth/session') return handleSession(req, res);
  if (url.pathname === '/api/auth/logout') return handleLogout(req, res);
  if (url.pathname === '/api/categories') return handleCategories(req, res);
  if (url.pathname === '/api/training-records/events' && req.method === 'GET') return handleRecordEvents(req, res);
  if (url.pathname === '/api/training-records') return handleLocalRecords(req, res);
  if (url.pathname.startsWith('/api/training-records/')) {
    const recordId = decodeURIComponent(url.pathname.split('/').pop());
    await handleDeleteRecord(req, res, recordId);
    if (res.statusCode < 400) sendRecordsChangedEvent();
    return;
  }
  return sendError(res, 404, 'API endpoint not found');
}

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf'
};

function serveStatic(req, res, url) {
  const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const filePath = path.resolve(ROOT, `.${requested}`);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': contentTypes[ext] || 'application/octet-stream',
      'Cache-Control': ['.html', '.js'].includes(ext) ? 'no-store' : 'public, max-age=31536000, immutable'
    });
    res.end(data);
  });
}

async function requestHandler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
      return;
    }
    serveStatic(req, res, url);
  } catch (error) {
    sendError(res, error.status || 500, error.message || 'Server error', error.details);
  }
}

function createServer() {
  return http.createServer(requestHandler);
}

if (require.main === module) {
  createServer().listen(config.port, () => {
    console.log(`Portfolio running at http://localhost:${config.port}`);
  });
}

module.exports = requestHandler;
module.exports.createServer = createServer;
Object.assign(module.exports, require('./lib/portfolio-api'));
