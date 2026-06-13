const { handleRecords, sendError } = require('../lib/portfolio-api');

module.exports = async function handler(req, res) {
  try {
    return await handleRecords(req, res);
  } catch (error) {
    return sendError(res, error.status || 500, error.message || 'Server error', error.details);
  }
};
