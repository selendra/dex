const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchain');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * POST /api/pool/initialize
 * Initialize a new pool
 * Body: {
 *   token0: "0x...",
 *   token1: "0x...",
 *   priceRatio: 1 (optional, e.g., 1 for 1:1, 10 for 10:1, 0.5 for 1:2)
 * }
 */
router.post('/initialize', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { token0, token1, priceRatio } = req.body;
    
    // Validate input
    if (!token0 || !token1) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['token0', 'token1']
      });
    }
    
    // Validate price ratio if provided
    if (priceRatio !== undefined && priceRatio !== null && priceRatio <= 0) {
      return res.status(400).json({
        error: 'Invalid price ratio',
        message: 'Price ratio must be greater than 0'
      });
    }
    
    // Initialize pool
    const result = await blockchainService.initializePool(
      token0,
      token1,
      priceRatio
    );
    
    res.json({
      success: true,
      message: 'Pool initialized successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pool/:token0/:token1
 * Get pool information
 */
router.get('/:token0/:token1', async (req, res, next) => {
  try {
    const { token0, token1 } = req.params;
    
    const poolInfo = await blockchainService.getPoolInfo(token0, token1);
    
    res.json({
      success: true,
      data: poolInfo
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/pool/list
 * Get information for multiple pools
 * Body: {
 *   tokens: ["0x...", "0x...", "0x..."]
 * }
 */
router.post('/list', async (req, res, next) => {
  try {
    const { tokens } = req.body;
    
    if (!tokens || !Array.isArray(tokens) || tokens.length < 2) {
      return res.status(400).json({
        error: 'Invalid tokens array',
        required: 'Array of at least 2 token addresses'
      });
    }
    
    const pools = await blockchainService.getAllPoolsInfo(tokens);
    
    res.json({
      success: true,
      data: {
        pools,
        count: pools.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pool/token/:tokenAddress/balance
 * Get token balance for default signer
 */
router.get('/token/:tokenAddress/balance', async (req, res, next) => {
  try {
    const { tokenAddress } = req.params;
    
    const balance = await blockchainService.getTokenBalance(tokenAddress, null);
    
    res.json({
      success: true,
      data: {
        tokenAddress,
        accountAddress: 'default signer',
        balance
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pool/token/:tokenAddress/balance/:accountAddress
 * Get token balance for specific account
 */
router.get('/token/:tokenAddress/balance/:accountAddress', async (req, res, next) => {
  try {
    const { tokenAddress, accountAddress } = req.params;
    
    const balance = await blockchainService.getTokenBalance(
      tokenAddress,
      accountAddress
    );
    
    res.json({
      success: true,
      data: {
        tokenAddress,
        accountAddress,
        balance
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
