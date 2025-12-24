const express = require('express');
const router = express.Router();
const contractService = require('../services/contractService');

/**
 * POST /api/swap/quote
 * Get a quote for a token swap
 */
router.post('/quote', async (req, res, next) => {
  try {
    const {
      tokenIn,
      tokenOut,
      amountIn,
      fee = 3000
    } = req.body;

    // Validate inputs
    if (!tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'tokenIn, tokenOut, and amountIn are required'
        }
      });
    }

    const quote = await contractService.getSwapQuote(tokenIn, tokenOut, amountIn, fee);

    // Get token information
    const [tokenInInfo, tokenOutInfo] = await Promise.all([
      tokenIn !== '0x0000000000000000000000000000000000000000' 
        ? contractService.getTokenInfo(tokenIn)
        : { name: 'Ether', symbol: 'ETH', decimals: 18 },
      tokenOut !== '0x0000000000000000000000000000000000000000'
        ? contractService.getTokenInfo(tokenOut)
        : { name: 'Ether', symbol: 'ETH', decimals: 18 }
    ]);

    res.json({
      success: true,
      data: {
        quote,
        tokenIn: { address: tokenIn, ...tokenInInfo },
        tokenOut: { address: tokenOut, ...tokenOutInfo },
        route: {
          path: [tokenIn, tokenOut],
          pools: [{ fee, tokens: [tokenIn, tokenOut] }]
        },
        estimatedGas: '200000'
      },
      meta: {
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30000).toISOString() // 30 seconds
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/swap/execute
 * Execute a token swap
 */
router.post('/execute', async (req, res, next) => {
  try {
    const {
      tokenIn,
      tokenOut,
      amountIn,
      amountOutMinimum,
      recipient,
      fee = 3000,
      slippageTolerance = 0.5
    } = req.body;

    // Validate inputs
    if (!tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'tokenIn, tokenOut, and amountIn are required'
        }
      });
    }

    // Get quote first to calculate minimum output
    const quote = await contractService.getSwapQuote(tokenIn, tokenOut, amountIn, fee);
    
    // Calculate minimum amount out based on slippage tolerance
    const calculatedMinOut = amountOutMinimum || 
      BigInt(quote.amountOut) * BigInt(Math.floor((100 - slippageTolerance) * 100)) / BigInt(10000);

    const recipientAddress = recipient || process.env.DEFAULT_RECIPIENT_ADDRESS;

    const result = await contractService.executeSwap(
      tokenIn,
      tokenOut,
      amountIn,
      calculatedMinOut,
      recipientAddress,
      fee
    );

    res.json({
      success: true,
      data: {
        transaction: result,
        swap: {
          tokenIn,
          tokenOut,
          amountIn: amountIn.toString(),
          amountOutMinimum: calculatedMinOut.toString(),
          estimatedAmountOut: quote.amountOut,
          priceImpact: quote.priceImpact,
          fee
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
 * POST /api/swap/route
 * Find optimal swap route (multi-hop)
 */
router.post('/route', async (req, res, next) => {
  try {
    const {
      tokenIn,
      tokenOut,
      amountIn
    } = req.body;

    if (!tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'tokenIn, tokenOut, and amountIn are required'
        }
      });
    }

    // Try different fee tiers for direct swap
    const fees = [500, 3000, 10000];
    const routes = await Promise.all(
      fees.map(async (fee) => {
        try {
          const quote = await contractService.getSwapQuote(tokenIn, tokenOut, amountIn, fee);
          return {
            path: [tokenIn, tokenOut],
            pools: [{ fee, tokens: [tokenIn, tokenOut] }],
            amountOut: quote.amountOut,
            priceImpact: quote.priceImpact,
            estimatedGas: '200000'
          };
        } catch (error) {
          return null;
        }
      })
    );

    // Filter out failed routes and sort by amount out
    const validRoutes = routes
      .filter(r => r !== null)
      .sort((a, b) => BigInt(b.amountOut) - BigInt(a.amountOut));

    if (validRoutes.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NO_ROUTE_FOUND',
          message: 'No valid swap route found for this pair'
        }
      });
    }

    res.json({
      success: true,
      data: {
        bestRoute: validRoutes[0],
        alternativeRoutes: validRoutes.slice(1),
        tokenIn,
        tokenOut,
        amountIn: amountIn.toString()
      },
      meta: {
        timestamp: new Date().toISOString(),
        routesFound: validRoutes.length
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
