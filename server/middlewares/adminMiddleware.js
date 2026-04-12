const requireAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'owner'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
  next();
};

module.exports = { requireAdmin };
