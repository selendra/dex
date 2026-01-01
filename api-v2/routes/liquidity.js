const express = require('express');
const router = express.Router();
const contractService = require('../services/contractService');

// POST /liquidity/add - Add liquidity to a pool
router.post('/add', async (req, res) => {
  try {
    const { token0, token1, token0Address, token1Address, fee, tickLower, tickUpper, liquidityDelta, amount0Desired, amount1Desired, amount0Min, amount1Min, deadline } = req.body;

    // Accept both token0/token1 or token0Address/token1Address
    const t0 = token0 || token0Address;
    const t1 = token1 || token1Address;

    // Validation
    if (!t0 || !t1) {
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

    // Use default ticks if not provided (-887220 to 887220 = full range)
    const finalTickLower = tickLower !== undefined ? tickLower : -887220;
    const finalTickUpper = tickUpper !== undefined ? tickUpper : 887220;

    // Validate tick range
    if (finalTickLower >= finalTickUpper) {
      return res.status(400).json({
        success: false,
        error: 'tickLower must be less than tickUpper'
      });
    }

    // Build poolKey
    const poolKeyData = contractService.encodePoolKey(t0, t1, fee);
    const poolKey = poolKeyData.poolKey;

    // Add liquidity (includes token transfers)
    const result = await contractService.addLiquidity({
      poolKey,
      tickLower: finalTickLower,
      tickUpper: finalTickUpper,
      liquidityDelta: liquidityDelta || "100000000000000000000", // Default 100 tokens
      amount0Desired: amount0Desired,
      amount1Desired: amount1Desired,
      amount0Min: amount0Min,
      amount1Min: amount1Min,
      deadline: deadline
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

// POST /liquidity/remove - Remove liquidity from a pool
router.post('/remove', async (req, res) => {
  try {
    const { token0, token1, fee, tickLower, tickUpper, liquidityDelta } = req.body;

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

    if (tickLower === undefined || tickUpper === undefined) {
      return res.status(400).json({
        success: false,
        error: 'tickLower and tickUpper are required'
      });
    }

    if (!liquidityDelta) {
      return res.status(400).json({
        success: false,
        error: 'liquidityDelta is required'
      });
    }

    // Validate tick range
    if (tickLower >= tickUpper) {
      return res.status(400).json({
        success: false,
        error: 'tickLower must be less than tickUpper'
      });
    }

    // Build poolKey
    const poolKeyData = contractService.encodePoolKey(token0, token1, fee);
    const poolKey = poolKeyData.poolKey;

    // Remove liquidity
    const result = await contractService.removeLiquidity({
      poolKey,
      tickLower,
      tickUpper,
      liquidityDelta
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

// POST /liquidity/add/quote - Get quote for adding liquidity
router.post('/add/quote', async (req, res) => {
  try {
    const { token0, token1, fee, tickLower, tickUpper, liquidityDelta } = req.body;

    // Validation
    if (!token0 || !token1 || !fee || tickLower === undefined || tickUpper === undefined || !liquidityDelta) {
      return res.status(400).json({
        success: false,
        error: 'token0, token1, fee, tickLower, tickUpper, and liquidityDelta are required'
      });
    }

    // Get pool info
    const poolKeyData = contractService.encodePoolKey(token0, token1, fee);
    const poolInfo = await contractService.getPoolInfo(poolKeyData.poolId);

    res.json({
      success: true,
      data: {
        note: 'Use Uniswap V4 SDK for accurate amount calculations based on current pool state',
        poolInfo,
        request: {
          tickLower,
          tickUpper,
          liquidityDelta
        }
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
