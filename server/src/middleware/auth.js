// Verifies the JWT stored in the httpOnly "token" cookie (set by authController on login/register)
// and attaches { id, email, role } to req.user. Use `requireAuth` on any protected route,
// and `requireAdmin` (after requireAuth) on admin-only routes.
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  return next();
}

module.exports = { requireAuth, requireAdmin };
