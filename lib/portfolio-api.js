const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');

function parseEnvFile(text) {
  const values = {};
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const separator = trimmed.indexOf('=');
    if (separator === -1) return;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  });
  return values;
}

function loadEnv() {
  if (fs.existsSync(ENV_PATH)) {
    Object.assign(process.env, parseEnvFile(fs.readFileSync(ENV_PATH, 'utf8')));
  }
}

loadEnv();

const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY,
  sessionSecret: process.env.SESSION_SECRET,
  port: Number(process.env.PORT || 3000)
};

function assertConfig() {
  const missing = [];
  if (!config.supabaseUrl) missing.push('SUPABASE_URL');
  if (!config.supabaseKey) missing.push('SUPABASE_PUBLISHABLE_KEY');
  if (!config.sessionSecret) missing.push('SESSION_SECRET');
  if (missing.length) {
    throw new Error(`Missing required env values: ${missing.join(', ')}`);
  }
}

function normalizeTrainingRecord(item) {
  return {
    ...item,
    id: item.id || generateStableId(item),
    type: item.type || 'Seminar',
    duration: item.duration || '1 Day',
    certificateNo: item.certificateNo || '',
    monogram: item.monogram || '',
    images: Array.isArray(item.images) ? item.images : item.images ? [item.images] : []
  };
}

function generateStableId(item) {
  return [item.title, item.provider, item.date]
    .join('|')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}


function getCookie(req, name) {
  const cookies = req.headers.cookie || '';
  const match = cookies.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(value) {
  assertConfig();
  return crypto.createHmac('sha256', config.sessionSecret).update(value).digest('base64url');
}

function createSessionToken() {
  const payload = base64url(JSON.stringify({ exp: Date.now() + 1000 * 60 * 60 * 8 }));
  return `${payload}.${sign(payload)}`;
}

function isAuthenticated(req) {
  const token = getCookie(req, 'admin_session');
  const [payload, signature] = token.split('.');
  if (!payload || !signature || sign(payload) !== signature) {
    return false;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number(session.exp) > Date.now();
  } catch {
    return false;
  }
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {};
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > 1_000_000) throw Object.assign(new Error('Payload too large'), { status: 413 });
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString('utf8');
  return body ? JSON.parse(body) : {};
}

function sendJson(res, status, payload, headers = {}) {
  res.statusCode = status;
  Object.entries({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  }).forEach(([key, value]) => res.setHeader(key, value));
  res.end(JSON.stringify(payload));
}

function sendError(res, status, message, details) {
  sendJson(res, status, { error: message, details });
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: config.supabaseKey,
    Authorization: `Bearer ${config.supabaseKey}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

async function supabaseRequest(pathname, options = {}) {
  assertConfig();
  const baseUrl = config.supabaseUrl.replace(/\/$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${baseUrl}/rest/v1/${pathname}`, {
      ...options,
      signal: controller.signal,
      headers: supabaseHeaders(options.headers || {})
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const message = data?.message || data?.error || response.statusText;
      throw Object.assign(new Error(message), { status: response.status, details: data });
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function uploadImageToStorage(filename, base64Data, contentType) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  assertConfig();
  const base64 = base64Data.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  const baseUrl = config.supabaseUrl.replace(/\/$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${baseUrl}/storage/v1/object/portfolio-images/${filename}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
        'cache-control': 'max-age=31536000'
      },
      body: buffer
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Storage upload failed: ${text}`);
    }
  } finally {
    clearTimeout(timer);
  }
  return `${config.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/portfolio-images/${filename}`;
}

async function verifyAdminLogin(username, password) {
  return supabaseRequest('rpc/verify_admin_login', {
    method: 'POST',
    body: JSON.stringify({
      input_username: username,
      input_password: password
    })
  });
}

async function fetchRecordsFromDb() {
  const rows = await supabaseRequest('training_records?select=id,record,sort_order&order=sort_order.asc');
  return rows.map((row) => normalizeTrainingRecord({ id: row.id, ...row.record }));
}

async function upsertRecords(records) {
  const rows = records.map((record, index) => ({
    id: record.id,
    record,
    sort_order: index,
    updated_at: new Date().toISOString()
  }));
  await supabaseRequest('training_records?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(rows)
  });
}

async function replaceRecord(record) {
  const normalized = normalizeTrainingRecord(record);
  await supabaseRequest('training_records?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify([{
      id: normalized.id,
      record: normalized,
      sort_order: Date.now(),
      updated_at: new Date().toISOString()
    }])
  });
  return normalized;
}

async function deleteRecord(recordId) {
  await supabaseRequest(`training_records?id=eq.${encodeURIComponent(recordId)}`, {
    method: 'DELETE'
  });
}

async function getRecords() {
  const records = await fetchRecordsFromDb();
  return records.filter((r) => r.type !== '__meta__');
}

async function getCategoryList() {
  try {
    const rows = await supabaseRequest(
      `training_records?id=eq.${encodeURIComponent('__category_list__')}&select=record`
    );
    const cats = rows?.[0]?.record?.categories;
    return Array.isArray(cats) ? cats : [];
  } catch {
    return [];
  }
}

async function saveCategoryList(categories) {
  await supabaseRequest('training_records?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify([{
      id: '__category_list__',
      record: { id: '__category_list__', type: '__meta__', categories },
      sort_order: -1,
      updated_at: new Date().toISOString()
    }])
  });
}

async function handleCategories(req, res) {
  if (!isAuthenticated(req)) return sendError(res, 401, 'Login required');
  if (req.method === 'GET') {
    return sendJson(res, 200, { categories: await getCategoryList() });
  }
  if (req.method === 'POST') {
    const body = await readJson(req);
    await saveCategoryList(Array.isArray(body.categories) ? body.categories : []);
    return sendJson(res, 200, { ok: true });
  }
  return sendError(res, 405, 'Method not allowed');
}

function setSessionCookie(res, token) {
  const secure = process.env.VERCEL ? '; Secure' : '';
  res.setHeader('Set-Cookie', `admin_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${secure}`);
}

function clearSessionCookie(res) {
  const secure = process.env.VERCEL ? '; Secure' : '';
  res.setHeader('Set-Cookie', `admin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
}

async function handleLogin(req, res) {
  const body = await readJson(req);
  try {
    const result = await verifyAdminLogin(body.username, body.password);
    if (result) {
      setSessionCookie(res, createSessionToken());
      return sendJson(res, 200, { ok: true });
    }
    return sendError(res, 401, 'Invalid username or password');
  } catch (error) {
    console.error('Login verification error:', error);
    return sendError(res, 401, error.message || 'Authentication failed. Check server logs.');
  }
}

function handleSession(req, res) {
  return sendJson(res, 200, { authenticated: isAuthenticated(req) });
}

function handleLogout(req, res) {
  clearSessionCookie(res);
  return sendJson(res, 200, { ok: true });
}

async function handleRecords(req, res) {
  if (req.method === 'GET') {
    const records = await getRecords();
    const cacheHeader = isAuthenticated(req)
      ? 'no-store'
      : 'public, s-maxage=60, stale-while-revalidate=300';
    return sendJson(res, 200, { records }, { 'Cache-Control': cacheHeader });
  }
  if (req.method === 'POST') {
    if (!isAuthenticated(req)) return sendError(res, 401, 'Login required');
    const body = await readJson(req);
    return sendJson(res, 200, { record: await replaceRecord(body.record) });
  }
  return sendError(res, 405, 'Method not allowed');
}

async function handleDeleteRecord(req, res, recordId) {
  if (req.method !== 'DELETE') return sendError(res, 405, 'Method not allowed');
  if (!isAuthenticated(req)) return sendError(res, 401, 'Login required');
  await deleteRecord(recordId);
  return sendJson(res, 200, { ok: true });
}

module.exports = {
  config,
  createSessionToken,
  deleteRecord,
  fetchRecordsFromDb,
  generateStableId,
  getCategoryList,
  getRecords,
  handleCategories,
  handleDeleteRecord,
  handleLogin,
  handleLogout,
  handleRecords,
  handleSession,
  isAuthenticated,
  normalizeTrainingRecord,
  parseEnvFile,
  readJson,
  replaceRecord,
  saveCategoryList,
  sendError,
  sendJson,
  supabaseRequest,
  uploadImageToStorage,
  verifyAdminLogin
};
