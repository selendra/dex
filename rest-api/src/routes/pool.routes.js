const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { validatePoolQuery, validatePagination } = require('../middleware/validator');
const { optionalAuth } = require('../middleware/auth');
const poolService = require('../services/pool.service');

/**
 * GET /api/v1/pools
 * List all pools with pagination
 */
router.get(
  '/',
  optionalAuth,
  validatePagination,
  asyncHandler(async (req, res) => {
    const pools = await poolService.listPools(req.query);
    
    res.json({
      success: true,
      data: pools,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  })
);

/**
 * GET /api/v1/pools/search
 * Search for specific pool
 */
router.get(
  '/search',
  optionalAuth,
  validatePoolQuery,
  asyncHandler(async (req, res) => {
    const pool = await poolService.getPool(req.query);
    
    res.json({
      success: true,
      data: pool,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  })
);

/**
 * GET /api/v1/pools/:poolId
 * Get pool details by ID
 */
router.get(
  '/:poolId',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const pool = await poolService.getPoolById(req.params.poolId);
    
    res.json({
      success: true,
      data: pool,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  })
);

module.exports = router;
