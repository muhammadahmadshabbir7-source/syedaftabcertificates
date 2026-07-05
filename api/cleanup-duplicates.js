const {
  isAuthenticated,
  sendError,
  sendJson,
  supabaseRequest,
  config
} = require('../lib/portfolio-api');

function assertConfig() {
  if (!config.supabaseUrl || !config.supabaseKey) {
    throw new Error('Supabase not configured');
  }
}

function serviceHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabaseKey;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal'
  };
}

async function supabasePatch(path, body) {
  assertConfig();
  const url = `${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/${path}`;
  const res = await fetch(url, { method: 'PATCH', headers: serviceHeaders(), body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH failed (${res.status}): ${text}`);
  }
}

async function supabaseDelete(path) {
  assertConfig();
  const url = `${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/${path}`;
  const res = await fetch(url, { method: 'DELETE', headers: serviceHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DELETE failed (${res.status}): ${text}`);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');
  if (!isAuthenticated(req)) return sendError(res, 401, 'Login required');

  const rows = await supabaseRequest(
    'training_records?select=id,record,sort_order&order=sort_order.asc'
  );

  const dataRows = rows.filter(r => r.id !== '__category_list__' && r.record?.type !== '__meta__');

  const results = { idFixed: 0, duplicatesRemoved: 0, errors: [] };

  // Step 1: Fix rows where row.id !== record.id inside JSONB
  for (const row of dataRows) {
    if (row.record?.id && row.id !== row.record.id) {
      try {
        const fixedRecord = { ...row.record, id: row.id };
        await supabasePatch(
          `training_records?id=eq.${encodeURIComponent(row.id)}`,
          { record: fixedRecord, updated_at: new Date().toISOString() }
        );
        row.record = fixedRecord; // keep in-memory in sync for step 2
        results.idFixed++;
      } catch (err) {
        results.errors.push(`ID fix for "${row.id}": ${err.message}`);
      }
    }
  }

  // Step 2: Group by semantic key (title + provider + year) and remove older duplicates
  const groups = new Map();
  for (const row of dataRows) {
    const title    = (row.record?.title    || '').trim().toLowerCase();
    const provider = (row.record?.provider || '').trim().toLowerCase();
    const year     = (row.record?.date     || '').slice(0, 4);
    const key      = `${title}|${provider}|${year}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  for (const [, group] of groups) {
    if (group.length <= 1) continue;
    // Sort descending by sort_order — highest (most recently saved) first
    group.sort((a, b) => (b.sort_order || 0) - (a.sort_order || 0));
    // Keep the first, delete the rest
    for (let i = 1; i < group.length; i++) {
      try {
        await supabaseDelete(
          `training_records?id=eq.${encodeURIComponent(group[i].id)}`
        );
        results.duplicatesRemoved++;
      } catch (err) {
        results.errors.push(`Delete "${group[i].id}": ${err.message}`);
      }
    }
  }

  return sendJson(res, 200, results);
};
