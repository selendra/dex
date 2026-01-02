const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchain');

/**
 * POST /api/swap
 * Execute a token swap
 * Body: {
 *   tokenIn: "0x...",
 *   tokenOut: "0x...",
 *   amountIn: "100",
 *   minAmountOut: "95" (optional)
 * }
 */
router.post('/', async (req, res, next) => {
  try {
    const { tokenIn, tokenOut, amountIn, minAmountOut } = req.body;
    
    // Validate input
    if (!tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['tokenIn', 'tokenOut', 'amountIn']
      });
    }
    
    // Execute swap
    const result = await blockchainService.executeSwap(
      tokenIn,
      tokenOut,
      parseFloat(amountIn),
      minAmountOut ? parseFloat(minAmountOut) : 0
    );
    
    res.json({
      success: true,
      message: 'Swap executed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/swap/quote
 * Get swap quote (without executing)
 * Body: {
 *   tokenIn: "0x...",
 *   tokenOut: "0x...",
 *   amountIn: "100"
 * }
 */
router.post('/quote', async (req, res, next) => {
  try {
    const { tokenIn, tokenOut, amountIn } = req.body;
    
    if (!tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['tokenIn', 'tokenOut', 'amountIn']
      });
    }
    
    // Get pool info to calculate expected output
    const poolInfo = await blockchainService.getPoolInfo(tokenIn, tokenOut);
    
    res.json({
      success: true,
      message: 'Quote calculated',
      data: {
        tokenIn,
        tokenOut,
        amountIn,
        poolInfo,
        estimatedAmountOut: 'Use pool price calculation', // TODO: Implement price calculation
        priceImpact: 'calculated based on liquidity'
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
