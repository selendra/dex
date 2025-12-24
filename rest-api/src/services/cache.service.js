const logger = require('../config/logger');
const config = require('../config');

class CacheService {
  constructor() {
    this.cache = new Map();
    this.redisClient = null;
    this.useRedis = config.redis.enabled;
  }

  /**
   * Initialize Redis connection
   */
  async initialize() {
    if (!this.useRedis) {
      logger.info('Redis disabled, using in-memory cache');
      return;
    }

    try {
      const redis = require('redis');
      this.redisClient = redis.createClient({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      });

      this.redisClient.on('error', (err) => {
        logger.error('Redis error', { error: err.message });
        // Fallback to in-memory cache
        this.useRedis = false;
      });

      await this.redisClient.connect();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.warn('Redis connection failed, using in-memory cache', {
        error: error.message,
      });
      this.useRedis = false;
    }
  }

  /**
   * Get value from cache
   */
  async get(key) {
    try {
      if (this.useRedis && this.redisClient) {
        const value = await this.redisClient.get(key);
        return value ? JSON.parse(value) : null;
      }

      // In-memory cache
      const item = this.cache.get(key);
      if (!item) return null;

      if (Date.now() > item.expiry) {
        this.cache.delete(key);
        return null;
      }

      return item.value;
    } catch (error) {
      logger.error('Cache get error', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttlSeconds = 300) {
    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
        return true;
      }

      // In-memory cache
      this.cache.set(key, {
        value,
        expiry: Date.now() + ttlSeconds * 1000,
      });

      return true;
    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete from cache
   */
  async del(key) {
    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.del(key);
        return true;
      }

      this.cache.delete(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.flushAll();
      }

      this.cache.clear();
      logger.info('Cache cleared');
      return true;
    } catch (error) {
      logger.error('Cache clear error', { error: error.message });
      return false;
    }
  }

  /**
   * Cleanup expired in-memory cache entries
   */
  cleanup() {
    if (this.useRedis) return;

    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instance
const cacheService = new CacheService();

// Cleanup every 5 minutes
setInterval(() => cacheService.cleanup(), 5 * 60 * 1000);

module.exports = cacheService;
