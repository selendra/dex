const authService = require('../services/auth');

/**
 * Middleware to verify JWT token and attach user info to request
 */
function authenticate(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        message: 'Authorization header with Bearer token is required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = authService.verifyToken(token);

    // Attach user info to request
    req.user = {
      username: decoded.username,
      address: decoded.address,
      role: decoded.role || 'user'
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid token',
      message: error.message
    });
  }
}

/**
 * Middleware to verify user is admin
 */
function requireAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please login first'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required for this operation'
      });
    }

    next();
  } catch (error) {
    return res.status(403).json({
      error: 'Access denied',
      message: error.message
    });
  }
}

/**
 * Optional authentication - continues even if no token
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = authService.verifyToken(token);
      
      req.user = {
        username: decoded.username,
        address: decoded.address,
        role: decoded.role || 'user'
      };
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}

module.exports = {
  authenticate,
  optionalAuth,
  requireAdmin
};
