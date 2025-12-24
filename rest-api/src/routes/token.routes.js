const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { validateTokenAddress, validateTokenBalance } = require('../middleware/validator');
const { optionalAuth } = require('../middleware/auth');
const tokenService = require('../services/token.service');

/**
 * GET /api/v1/tokens/:address
 * Get token information
 */
router.get(
  '/:address',
  optionalAuth,
  validateTokenAddress,
  asyncHandler(async (req, res) => {
    const token = await tokenService.getTokenInfo(req.params.address);
    
    res.json({
      success: true,
      data: token,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  })
);

/**
 * GET /api/v1/tokens/:address/balance/:owner
 * Get token balance for owner
 */
router.get(
  '/:address/balance/:owner',
  optionalAuth,
  validateTokenBalance,
  asyncHandler(async (req, res) => {
    const balance = await tokenService.getBalance(
      req.params.address,
      req.params.owner
    );
    
    res.json({
      success: true,
      data: balance,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  })
);

/**
 * GET /api/v1/tokens/:address/price
 * Get token price
 */
router.get(
  '/:address/price',
  optionalAuth,
  validateTokenAddress,
  asyncHandler(async (req, res) => {
    const price = await tokenService.getTokenPrice(req.params.address);
    
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
