const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchain');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * POST /api/liquidity/add
 * Add liquidity to a pool
 * Body: {
 *   token0: "0x...",
 *   token1: "0x...",
 *   amount0: "1000",
 *   amount1: "1000",
 *   tickLower: -887220 (optional),
 *   tickUpper: 887220 (optional)
 * }
 */
router.post('/add', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { token0, token1, amount0, amount1, tickLower, tickUpper } = req.body;
    
    // Validate input
    if (!token0 || !token1 || !amount0 || !amount1) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['token0', 'token1', 'amount0', 'amount1']
      });
    }
    
    // Add liquidity
    const result = await blockchainService.addLiquidity(
      token0,
      token1,
      parseFloat(amount0),
      parseFloat(amount1),
      tickLower || null,
      tickUpper || null
    );
    
    res.json({
      success: true,
      message: 'Liquidity added successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/liquidity/remove
 * Remove liquidity from a pool
 * Body: {
 *   token0: "0x...",
 *   token1: "0x...",
 *   liquidityAmount: "500",
 *   tickLower: -887220 (optional),
 *   tickUpper: 887220 (optional)
 * }
 */
router.post('/remove', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { token0, token1, liquidityAmount, tickLower, tickUpper } = req.body;
    
    // Validate input
    if (!token0 || !token1 || !liquidityAmount) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['token0', 'token1', 'liquidityAmount']
      });
    }
    
    // Remove liquidity
    const result = await blockchainService.removeLiquidity(
      token0,
      token1,
      parseFloat(liquidityAmount),
      tickLower || null,
      tickUpper || null
    );
    
    res.json({
      success: true,
      message: 'Liquidity removed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/liquidity/:token0/:token1
 * Get liquidity information for a specific pool
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

module.exports = router;
