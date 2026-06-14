const { isAuthenticated, sendError, sendJson, uploadImageToStorage } = require('../lib/portfolio-api');

async function readBody(req, maxBytes) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {};
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw Object.assign(new Error('File too large (max 15 MB)'), { status: 413 });
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');
  if (!isAuthenticated(req)) return sendError(res, 401, 'Login required');

  let body;
  try {
    body = await readBody(req, 15_000_000);
  } catch (err) {
    return sendError(res, err.status || 400, err.message || 'Invalid request body');
  }

  const { filename, data, contentType } = body;
  if (!filename || !data || !contentType) {
    return sendError(res, 400, 'filename, data, and contentType are required');
  }

  if (!data.startsWith('data:')) {
    return sendError(res, 400, 'data must be a base64 data URL');
  }

  try {
    const safeFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const url = await uploadImageToStorage(safeFilename, data, contentType);
    return sendJson(res, 200, { url, filename: safeFilename });
  } catch (err) {
    return sendError(res, err.status || 500, err.message || 'Upload failed');
  }
};
