const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { swapLimiter } = require('../middleware/rateLimiter');
const { validateSwapQuote, validateSwapExecute } = require('../middleware/validator');
const { authenticate, optionalAuth } = require('../middleware/auth');
const swapService = require('../services/swap.service');

/**
 * POST /api/v1/swap/quote
 * Get swap quote
 */
router.post(
  '/quote',
  optionalAuth,
  validateSwapQuote,
  asyncHandler(async (req, res) => {
    const quote = await swapService.getQuote(req.body);
    
    res.json({
      success: true,
      data: quote,
      meta: {
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30000).toISOString(),
        requestId: req.id,
      },
    });
  })
);

/**
 * POST /api/v1/swap/execute
 * Execute swap (requires authentication)
 */
router.post(
  '/execute',
  authenticate,
  swapLimiter,
  validateSwapExecute,
  asyncHandler(async (req, res) => {
    const result = await swapService.executeSwap(req.body, req.user);
    
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
 * POST /api/v1/swap/route
 * Find optimal swap route
 */
router.post(
  '/route',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const route = await swapService.findOptimalRoute(req.body);
    
    res.json({
      success: true,
      data: route,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  })
);

module.exports = router;
