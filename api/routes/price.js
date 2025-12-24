const express = require('express');
const router = express.Router();
const contractService = require('../services/contractService');

/**
 * GET /api/price/:poolId
 * Get current price for a pool
 */
router.get('/:poolId', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    // For this endpoint, we need to reconstruct the pool key from stored data
    // In production, you'd query this from a database
    // For now, we'll accept query parameters
    const { currency0, currency1, fee = 3000 } = req.query;

    if (!currency0 || !currency1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'currency0 and currency1 query parameters are required'
        }
      });
    }

    const [token0, token1] = currency0.toLowerCase() < currency1.toLowerCase()
      ? [currency0, currency1]
      : [currency1, currency0];

    const poolKey = {
      currency0: token0,
      currency1: token1,
      fee: parseInt(fee),
      tickSpacing: contractService.getTickSpacing(parseInt(fee)),
      hooks: '0x0000000000000000000000000000000000000000'
    };

    const priceData = await contractService.getPoolPrice(poolKey);

    // Get token info
    const [token0Info, token1Info] = await Promise.all([
      token0 !== '0x0000000000000000000000000000000000000000'
        ? contractService.getTokenInfo(token0)
        : { name: 'Ether', symbol: 'ETH', decimals: 18 },
      token1 !== '0x0000000000000000000000000000000000000000'
        ? contractService.getTokenInfo(token1)
        : { name: 'Ether', symbol: 'ETH', decimals: 18 }
    ]);

    res.json({
      success: true,
      data: {
        poolId: priceData.poolId,
        price: priceData.price,
        invertedPrice: 1 / priceData.price,
        tick: priceData.tick,
        sqrtPriceX96: priceData.sqrtPriceX96,
        liquidity: priceData.liquidity,
        token0: { address: token0, ...token0Info },
        token1: { address: token1, ...token1Info },
        fee: parseInt(fee)
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
 * POST /api/price/quote
 * Get price quote between two tokens
 */
router.post('/quote', async (req, res, next) => {
  try {
    const {
      tokenIn,
      tokenOut,
      amountIn = '1000000000000000000', // 1 token in wei
      fee = 3000
    } = req.body;

    if (!tokenIn || !tokenOut) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'tokenIn and tokenOut are required'
        }
      });
    }

    const quote = await contractService.getSwapQuote(tokenIn, tokenOut, amountIn, fee);

    // Calculate price per token
    const pricePerToken = Number(quote.amountOut) / Number(amountIn);
    const invertedPrice = Number(amountIn) / Number(quote.amountOut);

    res.json({
      success: true,
      data: {
        price: pricePerToken,
        invertedPrice: invertedPrice,
        amountIn: amountIn.toString(),
        amountOut: quote.amountOut,
        priceImpact: quote.priceImpact,
        tokenIn,
        tokenOut,
        fee
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
 * GET /api/price/history
 * Get historical price data (placeholder - would need price oracle/indexer)
 */
router.get('/history', async (req, res, next) => {
  try {
    const {
      currency0,
      currency1,
      fee = 3000,
      interval = '1h',
      limit = 24
    } = req.query;

    if (!currency0 || !currency1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'currency0 and currency1 query parameters are required'
        }
      });
    }

    // In production, this would query historical data from an indexer or database
    // For now, we'll return a placeholder response
    res.json({
      success: true,
      data: {
        currency0,
        currency1,
        fee: parseInt(fee),
        interval,
        history: [
          // Placeholder data structure
          {
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            price: 0.0003,
            volume: '1000000000000000000000',
            liquidity: '5000000000000000000000'
          }
        ],
        message: 'Historical price data requires an indexer service. Current implementation shows structure only.'
      },
      meta: {
        timestamp: new Date().toISOString(),
        dataPoints: 1
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
