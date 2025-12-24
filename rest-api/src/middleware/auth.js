const jwt = require('jsonwebtoken');
const config = require('../config');
const { UnauthorizedError } = require('./errorHandler');
const logger = require('../config/logger');

/**
 * JWT Authentication Middleware
 */
const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new UnauthorizedError('Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
};

/**
 * API Key Authentication Middleware
 */
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers[config.apiKeyHeader.toLowerCase()];

    if (!apiKey) {
      throw new UnauthorizedError('API key required');
    }

    // TODO: Validate API key against database or environment variable
    // For now, simple validation
    const validApiKeys = (process.env.VALID_API_KEYS || '').split(',');
    
    if (!validApiKeys.includes(apiKey)) {
      logger.warn(`Invalid API key attempt from ${req.ip}`);
      throw new UnauthorizedError('Invalid API key');
    }

    req.apiKey = apiKey;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional Authentication - doesn't fail if no token
 */
const optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = decoded;
    }
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Role-based Authorization
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};

module.exports = {
  authenticate,
  authenticateApiKey,
  optionalAuth,
  authorize,
};
