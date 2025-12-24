const express = require('express');
const router = express.Router();
const config = require('../config');
const logger = require('../config/logger');
const { ethers } = require('ethers');

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    version: process.env.npm_package_version || '1.0.0',
  };

  // Check blockchain connection
  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const blockNumber = await provider.getBlockNumber();
    health.blockchain = {
      connected: true,
      network: config.networkName,
      chainId: config.chainId,
      blockNumber,
    };
  } catch (error) {
    health.blockchain = {
      connected: false,
      error: error.message,
    };
    health.status = 'degraded';
  }

  // Check contracts
  health.contracts = {
    poolManager: !!config.contracts.poolManager,
    positionManager: !!config.contracts.positionManager,
    swapRouter: !!config.contracts.swapRouter,
    stateView: !!config.contracts.stateView,
  };

  // Check Redis (if enabled)
  if (config.redis.enabled) {
    try {
      const Redis = require('ioredis');
      const redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
      });
      await redis.ping();
      health.redis = { connected: true };
      redis.disconnect();
    } catch (error) {
      health.redis = { connected: false, error: error.message };
      health.status = 'degraded';
    }
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json({
    success: health.status === 'healthy',
    data: health,
  });
});

/**
 * GET /health/ready
 * Readiness probe for Kubernetes
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if all critical services are available
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    await provider.getBlockNumber();

    res.status(200).json({
      success: true,
      data: { ready: true },
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      success: false,
      data: { ready: false, error: error.message },
    });
  }
});

/**
 * GET /health/live
 * Liveness probe for Kubernetes
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    success: true,
    data: { alive: true },
  });
});

module.exports = router;
