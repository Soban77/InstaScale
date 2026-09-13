const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Requires a valid JWT (in the Authorization header as "Bearer <token>",
 * or in an httpOnly "accessToken" cookie). Attaches the authenticated
 * user document to req.user.
 */
async function requireAuth(req, res, next) {
  try {
    let token;
    const header = req.headers.authorization;

    if (header && header.startsWith('Bearer ')) {
      token = header.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User for this token no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Invalid token.' });
  }
}

/**
 * Optional auth: attaches req.user if a valid token is present,
 * but does not block the request if it's missing/invalid.
 * Useful for endpoints like public profiles that behave differently
 * for logged-in visitors (e.g. "is this user followed by me").
 */
async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    let token;
    if (header && header.startsWith('Bearer ')) token = header.split(' ')[1];
    else if (req.cookies && req.cookies.accessToken) token = req.cookies.accessToken;

    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user) req.user = user;
  } catch (err) {
    // Silently ignore - this is optional auth
  }
  next();
}

/**
 * Gate for admin-only routes (moderation queue, bans, platform insights).
 * Must run after requireAuth so req.user is populated.
 */
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
}

module.exports = { requireAuth, optionalAuth, requireAdmin };
