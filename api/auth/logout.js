const { handleLogout, sendError } = require('../../lib/portfolio-api');

module.exports = function handler(req, res) {
  try {
    if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');
    return handleLogout(req, res);
  } catch (error) {
    return sendError(res, error.status || 500, error.message || 'Server error', error.details);
  }
};
