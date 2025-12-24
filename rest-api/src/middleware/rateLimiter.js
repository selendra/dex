const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../config/logger');
const { RateLimitError } = require('./errorHandler');

/**
 * Create rate limiter
 */
const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || config.rateLimit.windowMs,
    max: options.max || config.rateLimit.maxRequests,
    message: options.message || 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`);
      throw new RateLimitError(options.message);
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    },
  });
};

// Global rate limiter
const globalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
});

// Stricter rate limiters for specific endpoints
const swapLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: config.rateLimit.swap,
  message: 'Too many swap requests, please try again later',
});

const liquidityLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: config.rateLimit.liquidity,
  message: 'Too many liquidity requests, please try again later',
});

const quoteLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: config.rateLimit.quote,
  message: 'Too many quote requests, please try again later',
});

// IP-based rate limiter with Redis (if enabled)
const createIpLimiter = (options = {}) => {
  const limiterOptions = {
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    standardHeaders: true,
    legacyHeaders: false,
  };

  if (config.redis.enabled) {
    const Redis = require('ioredis');
    const RedisStore = require('rate-limit-redis');
    
    const redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
    });

    limiterOptions.store = new RedisStore({
      client: redisClient,
      prefix: 'rl:',
    });
  }

  return rateLimit(limiterOptions);
};

module.exports = {
  globalLimiter,
  swapLimiter,
  liquidityLimiter,
  quoteLimiter,
  createRateLimiter,
  createIpLimiter,
};
