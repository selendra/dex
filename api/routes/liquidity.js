const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchain');

/**
 * POST /api/liquidity/add
 * Add liquidity to a pool
 * Body: {
 *   token0: "0x...",
 *   token1: "0x...",
 *   amount0: "1000",
 *   amount1: "1000",
 *   privateKey: "0x...",
 *   tickLower: -887220 (optional),
 *   tickUpper: 887220 (optional)
 * }
 */
router.post('/add', async (req, res, next) => {
  try {
    const { token0, token1, amount0, amount1, privateKey, tickLower, tickUpper } = req.body;
    
    // Validate input
    if (!token0 || !token1 || !amount0 || !amount1 || !privateKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['token0', 'token1', 'amount0', 'amount1', 'privateKey']
      });
    }
    
    // Create wallet from private key
    const userWallet = blockchainService.createWalletFromPrivateKey(privateKey);
    
    // Add liquidity using user's wallet
    const result = await blockchainService.addLiquidityWithWallet(
      userWallet,
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
 *   privateKey: "0x...",
 *   tickLower: -887220 (optional),
 *   tickUpper: 887220 (optional)
 * }
 */
router.post('/remove', async (req, res, next) => {
  try {
    const { token0, token1, liquidityAmount, privateKey, tickLower, tickUpper } = req.body;
    
    // Validate input
    if (!token0 || !token1 || !liquidityAmount || !privateKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['token0', 'token1', 'liquidityAmount', 'privateKey']
      });
    }
    
    // Create wallet from private key (for future use if needed)
    const userWallet = blockchainService.createWalletFromPrivateKey(privateKey);
    
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
      data: {
        ...result,
        caller: userWallet.address
      }
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
