const jwt = require('jsonwebtoken');
const User = require('../models/user');

/**
 * @description Protects routes by verifying JWT and attaching user to the request.
 */
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.userId).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ error: 'No user found for this token.' });
      }

      next();
    } catch (error) {
      return res.status(401).json({ error: 'Not authorized, token failed.' });
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token provided.' });
  }
};

/**
 * @description Authorizes routes for users with the 'teacher' role.
 */
exports.teacherOnly = (req, res, next) => {
  if (req.user && req.user.role === 'teacher') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Teacher role required.' });
  }
};