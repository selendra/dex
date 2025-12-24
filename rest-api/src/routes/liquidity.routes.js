const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { liquidityLimiter } = require('../middleware/rateLimiter');
const { validateAddLiquidity, validateRemoveLiquidity } = require('../middleware/validator');
const { authenticate } = require('../middleware/auth');
const liquidityService = require('../services/liquidity.service');

/**
 * POST /api/v1/liquidity/add/quote
 * Get quote for adding liquidity
 */
router.post(
  '/add/quote',
  validateAddLiquidity,
  asyncHandler(async (req, res) => {
    const quote = await liquidityService.getAddQuote(req.body);
    
    res.json({
      success: true,
      data: quote,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  })
);

/**
 * POST /api/v1/liquidity/add
 * Add liquidity (requires authentication)
 */
router.post(
  '/add',
  authenticate,
  liquidityLimiter,
  validateAddLiquidity,
  asyncHandler(async (req, res) => {
    const result = await liquidityService.addLiquidity(req.body, req.user);
    
    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  })
);

/**
 * POST /api/v1/liquidity/remove/quote
 * Get quote for removing liquidity
 */
router.post(
  '/remove/quote',
  authenticate,
  validateRemoveLiquidity,
  asyncHandler(async (req, res) => {
    const quote = await liquidityService.getRemoveQuote(req.body, req.user);
    
    res.json({
      success: true,
      data: quote,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  })
);

/**
 * POST /api/v1/liquidity/remove
 * Remove liquidity (requires authentication)
 */
router.post(
  '/remove',
  authenticate,
  liquidityLimiter,
  validateRemoveLiquidity,
  asyncHandler(async (req, res) => {
    const result = await liquidityService.removeLiquidity(req.body, req.user);
    
    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  })
);

module.exports = router;
