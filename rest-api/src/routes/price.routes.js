const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { quoteLimiter } = require('../middleware/rateLimiter');
const { validateSwapQuote, validatePoolQuery } = require('../middleware/validator');
const { optionalAuth } = require('../middleware/auth');
const priceService = require('../services/price.service');

/**
 * POST /api/v1/price/quote
 * Get price quote for swap
 */
router.post(
  '/quote',
  optionalAuth,
  quoteLimiter,
  validateSwapQuote,
  asyncHandler(async (req, res) => {
    const quote = await priceService.getQuote(req.body);
    
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
 * GET /api/v1/price/pool
 * Get pool price information
 */
router.get(
  '/pool',
  optionalAuth,
  validatePoolQuery,
  asyncHandler(async (req, res) => {
    const price = await priceService.getPoolPrice(req.query);
    
    res.json({
      success: true,
      data: price,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  })
);

module.exports = router;
