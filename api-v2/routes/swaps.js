const express = require('express');
const router = express.Router();
const contractService = require('../services/contractService');

// POST /swaps/execute - Execute a token swap
router.post('/execute', async (req, res) => {
  try {
    const { token0, token1, fee, zeroForOne, amountSpecified, sqrtPriceLimitX96 } = req.body;

    // Validation
    if (!token0 || !token1) {
      return res.status(400).json({
        success: false,
        error: 'token0 and token1 are required'
      });
    }

    if (!fee) {
      return res.status(400).json({
        success: false,
        error: 'fee is required (500, 3000, or 10000)'
      });
    }

    if (zeroForOne === undefined) {
      return res.status(400).json({
        success: false,
        error: 'zeroForOne is required (true or false)'
      });
    }

    if (!amountSpecified) {
      return res.status(400).json({
        success: false,
        error: 'amountSpecified is required'
      });
    }

    // Build poolKey
    const poolKeyData = contractService.encodePoolKey(token0, token1, fee);
    const poolKey = poolKeyData.poolKey;

    // Default sqrtPriceLimitX96 if not provided (no limit)
    const priceLimit = sqrtPriceLimitX96 || (zeroForOne ? 
      "4295128739" : // MIN_SQRT_RATIO + 1
      "1461446703485210103287273052203988822378723970342"); // MAX_SQRT_RATIO - 1

    // Execute swap
    const result = await contractService.executeSwap({
      poolKey,
      zeroForOne,
      amountSpecified,
      sqrtPriceLimitX96: priceLimit
    });

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /swaps/quote - Get a swap quote (requires QuoterV2 contract)
router.post('/quote', async (req, res) => {
  try {
    const { token0, token1, fee, zeroForOne, amountSpecified } = req.body;

    // Validation
    if (!token0 || !token1 || !fee || zeroForOne === undefined || !amountSpecified) {
      return res.status(400).json({
        success: false,
        error: 'token0, token1, fee, zeroForOne, and amountSpecified are required'
      });
    }

    // Note: This requires a QuoterV2 contract deployment
    res.json({
      success: true,
      data: {
        note: 'QuoterV2 contract required for accurate quotes. Execute a swap to see actual amounts.',
        poolKey: contractService.encodePoolKey(token0, token1, fee)
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
