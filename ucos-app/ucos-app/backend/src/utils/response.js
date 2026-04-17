/**
 * Standard API response helpers
 */

const ok = (res, data = {}, status = 200) =>
  res.status(status).json({ success: true, ...data });

const fail = (res, message, status = 400) =>
  res.status(status).json({ success: false, message });

const serverError = (res, err, context = '') => {
  console.error(`[ERROR] ${context}:`, err?.message || err);
  return res.status(500).json({ success: false, message: 'Internal server error.' });
};

module.exports = { ok, fail, serverError };
