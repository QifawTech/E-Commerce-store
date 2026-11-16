const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return res.status(401).json({ message: 'Not authorised. Please login again.' });
  try {
    const d = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: d.id, role: d.role };
    next();
  } catch (e) {
    res.status(401).json({ message: 'Session expired. Please login again.' });
  }
};