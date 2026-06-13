const { handleDeleteRecord, sendError } = require('../../lib/portfolio-api');

module.exports = async function handler(req, res) {
  try {
    return await handleDeleteRecord(req, res, req.query.id);
  } catch (error) {
    return sendError(res, error.status || 500, error.message || 'Server error', error.details);
  }
};
