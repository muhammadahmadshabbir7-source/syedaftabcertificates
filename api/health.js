const { getRecords, sendError, sendJson } = require('../lib/portfolio-api');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');
    const records = await getRecords();
    return sendJson(res, 200, {
      ok: true,
      records: records.length,
      env: {
        supabaseUrl: Boolean(process.env.SUPABASE_URL),
        supabaseKey: Boolean(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY),
        sessionSecret: Boolean(process.env.SESSION_SECRET)
      }
    });
  } catch (error) {
    return sendError(res, error.status || 500, error.message || 'Server error', error.details);
  }
};
