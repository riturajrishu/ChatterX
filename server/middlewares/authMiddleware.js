const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated. Please log in.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('+tokenVersion');
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    // Check token version — invalidated on logout-all
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ message: 'Session invalidated. Please log in again.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('+tokenVersion');
    
    if (user && (decoded.tokenVersion === undefined || decoded.tokenVersion === user.tokenVersion)) {
      req.user = user;
    }
  } catch (error) {
    // Ignore error, leave req.user undefined
  }
  next();
};

module.exports = { protect, optionalAuth };
