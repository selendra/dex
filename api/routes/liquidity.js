const express = require('express');
const router = express.Router();
const contractService = require('../services/contractService');

/**
 * POST /api/liquidity/add/quote
 * Get a quote for adding liquidity
 */
router.post('/add/quote', async (req, res, next) => {
  try {
    const {
      currency0,
      currency1,
      fee = 3000,
      tickLower,
      tickUpper,
      amount0Desired,
      amount1Desired
    } = req.body;

    // Validate inputs
    if (!currency0 || !currency1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'currency0 and currency1 are required'
        }
      });
    }

    if (!amount0Desired || !amount1Desired) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'amount0Desired and amount1Desired are required'
        }
      });
    }

    // Sort currencies
    const [token0, token1] = currency0.toLowerCase() < currency1.toLowerCase()
      ? [currency0, currency1]
      : [currency1, currency0];

    const poolKey = {
      currency0: token0,
      currency1: token1,
      fee,
      tickSpacing: contractService.getTickSpacing(fee),
      hooks: '0x0000000000000000000000000000000000000000'
    };

    const quote = await contractService.getAddLiquidityQuote(
      poolKey,
      tickLower,
      tickUpper,
      amount0Desired,
      amount1Desired
    );

    res.json({
      success: true,
      data: {
        quote,
        poolKey,
        estimatedGas: '300000' // Estimated gas
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/liquidity/add
 * Add liquidity to a pool
 */
router.post('/add', async (req, res, next) => {
  try {
    const {
      currency0,
      currency1,
      fee = 3000,
      tickLower,
      tickUpper,
      liquidity,
      amount0Max,
      amount1Max,
      recipient,
      deadline
    } = req.body;

    // Validate inputs
    if (!currency0 || !currency1 || !liquidity || !amount0Max || !amount1Max) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Missing required parameters'
        }
      });
    }

    // Sort currencies
    const [token0, token1] = currency0.toLowerCase() < currency1.toLowerCase()
      ? [currency0, currency1]
      : [currency1, currency0];

    const poolKey = {
      currency0: token0,
      currency1: token1,
      fee,
      tickSpacing: contractService.getTickSpacing(fee),
      hooks: '0x0000000000000000000000000000000000000000'
    };

    const recipientAddress = recipient || process.env.DEFAULT_RECIPIENT_ADDRESS;
    const deadlineTimestamp = deadline || Math.floor(Date.now() / 1000) + 1800; // 30 minutes default

    const result = await contractService.addLiquidity(
      poolKey,
      tickLower,
      tickUpper,
      liquidity,
      amount0Max,
      amount1Max,
      recipientAddress,
      deadlineTimestamp
    );

    res.json({
      success: true,
      data: {
        transaction: result,
        poolKey,
        amounts: {
          amount0Max,
          amount1Max,
          liquidity
        }
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/liquidity/remove/quote
 * Get a quote for removing liquidity
 */
router.post('/remove/quote', async (req, res, next) => {
  try {
    const { tokenId, liquidityPercentage = 100 } = req.body;

    if (!tokenId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'tokenId is required'
        }
      });
    }

    // Get position details
    const position = await contractService.getPosition(tokenId);
    
    // Calculate liquidity to remove
    const liquidityToRemove = BigInt(position.liquidity) * BigInt(liquidityPercentage) / BigInt(100);

    // Get current pool price to estimate token amounts
    const poolPrice = await contractService.getPoolPrice(position.poolKey);

    res.json({
      success: true,
      data: {
        tokenId,
        position,
        liquidityToRemove: liquidityToRemove.toString(),
        liquidityPercentage,
        currentPrice: poolPrice.price,
        estimatedGas: '250000'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/liquidity/remove
 * Remove liquidity from a position
 */
router.post('/remove', async (req, res, next) => {
  try {
    const {
      tokenId,
      liquidity,
      amount0Min = 0,
      amount1Min = 0,
      deadline
    } = req.body;

    if (!tokenId || !liquidity) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'tokenId and liquidity are required'
        }
      });
    }

    const deadlineTimestamp = deadline || Math.floor(Date.now() / 1000) + 1800;

    const result = await contractService.removeLiquidity(
      tokenId,
      liquidity,
      amount0Min,
      amount1Min,
      deadlineTimestamp
    );

    res.json({
      success: true,
      data: {
        transaction: result,
        tokenId,
        liquidityRemoved: liquidity
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/liquidity/position/:tokenId
 * Get position details
 */
router.get('/position/:tokenId', async (req, res, next) => {
  try {
    const { tokenId } = req.params;

    const position = await contractService.getPosition(tokenId);
    const poolPrice = await contractService.getPoolPrice(position.poolKey);

    res.json({
      success: true,
      data: {
        tokenId,
        position,
        poolPrice
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
