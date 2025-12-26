const express = require('express');
const router = express.Router();
const contractService = require('../services/contractService');

// POST /liquidity/add - Add liquidity to a pool
router.post('/add', async (req, res) => {
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

    // Add liquidity
    const result = await contractService.addLiquidity({
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
