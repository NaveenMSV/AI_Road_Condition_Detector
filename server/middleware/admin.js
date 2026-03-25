/**
 * Admin Role Middleware
 * Checks if the authenticated user has admin role
 * Must be used after auth middleware
 */

const admin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
};

module.exports = admin;
