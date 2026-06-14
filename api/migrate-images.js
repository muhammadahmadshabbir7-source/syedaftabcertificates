const {
  fetchRecordsFromDb,
  isAuthenticated,
  replaceRecord,
  sendError,
  sendJson,
  uploadImageToStorage
} = require('../lib/portfolio-api');

function mimeFromDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  return match ? match[1] : 'image/jpeg';
}

function extensionFromMime(mime) {
  const map = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
  return map[mime] || 'jpg';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');
  if (!isAuthenticated(req)) return sendError(res, 401, 'Login required');

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return sendError(res, 503, 'SUPABASE_SERVICE_ROLE_KEY not configured');
  }

  const rows = await fetchRecordsFromDb();
  const results = { migrated: 0, skipped: 0, errors: [] };

  for (const record of rows) {
    const images = Array.isArray(record.images) ? record.images : [];
    const hasEmbedded = images.some(img => typeof img === 'string' && img.startsWith('data:'));
    if (!hasEmbedded) { results.skipped++; continue; }

    const newImages = [];
    for (const img of images) {
      if (typeof img === 'string' && img.startsWith('data:')) {
        try {
          const mime = mimeFromDataUrl(img);
          const ext = extensionFromMime(mime);
          const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const url = await uploadImageToStorage(filename, img, mime);
          newImages.push(url);
        } catch (err) {
          results.errors.push(`Record "${record.id}" image upload failed: ${err.message}`);
          newImages.push(img);
        }
      } else {
        newImages.push(img);
      }
    }

    try {
      await replaceRecord({ ...record, images: newImages });
      results.migrated++;
    } catch (err) {
      results.errors.push(`Record "${record.id}" save failed: ${err.message}`);
    }
  }

  return sendJson(res, 200, results);
};
