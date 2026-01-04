const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchain');
const authService = require('../services/auth');
const { authenticate, optionalAuth } = require('../middleware/auth');

/**
 * POST /api/swap
 * Execute a token swap (requires authentication)
 * Header: Authorization: Bearer <token>
 * Body: {
 *   tokenIn: "0x...",
 *   tokenOut: "0x...",
 *   amountIn: "100",
 *   minAmountOut: "95" (optional),
 *   password: "userpassword" (required to unlock wallet)
 * }
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { tokenIn, tokenOut, amountIn, minAmountOut, password } = req.body;
    
    // Validate input
    if (!tokenIn || !tokenOut || !amountIn || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['tokenIn', 'tokenOut', 'amountIn', 'password']
      });
    }
    
    // Get user's wallet
    const userWallet = authService.getUserWallet(req.user.username, password);
    
    // Get balances before swap
    const balancesBefore = await blockchainService.getUserBalances(
      userWallet.address,
      [tokenIn, tokenOut]
    );
    
    // Check if user has enough balance
    const userBalance = parseFloat(balancesBefore.tokens[tokenIn]);
    const requiredAmount = parseFloat(amountIn);
    if (userBalance < requiredAmount) {
      return res.status(400).json({
        error: 'Insufficient balance',
        required: requiredAmount,
        available: userBalance,
        token: tokenIn
      });
    }
    
    // Execute swap with user's wallet
    const result = await blockchainService.executeSwap(
      tokenIn,
      tokenOut,
      parseFloat(amountIn),
      minAmountOut ? parseFloat(minAmountOut) : 0,
      userWallet
    );
    
    // Get balances after swap
    const balancesAfter = await blockchainService.getUserBalances(
      userWallet.address,
      [tokenIn, tokenOut]
    );
    
    res.json({
      success: true,
      message: 'Swap executed successfully',
      data: {
        ...result,
        balances: {
          before: balancesBefore,
          after: balancesAfter
        }
      }
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
router.post('/quote', optionalAuth, async (req, res, next) => {
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
    
    // If user is authenticated, include their balances
    let userBalances = null;
    if (req.user && req.user.address) {
      userBalances = await blockchainService.getUserBalances(
        req.user.address,
        [tokenIn, tokenOut]
      );
    }
    
    res.json({
      success: true,
      message: 'Quote calculated',
      data: {
        tokenIn,
        tokenOut,
        amountIn,
        poolInfo,
        userBalances,
        estimatedAmountOut: 'Use pool price calculation', // TODO: Implement price calculation
        priceImpact: 'calculated based on liquidity'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/swap/balances
 * Get user's token and native balances
 * Header: Authorization: Bearer <token>
 * Query params: ?tokens=0x...,0x...
 */
router.get('/balances', authenticate, async (req, res, next) => {
  try {
    const { tokens } = req.query;
    const tokenAddresses = tokens ? tokens.split(',') : [];
    
    const balances = await blockchainService.getUserBalances(
      req.user.address,
      tokenAddresses
    );
    
    res.json({
      success: true,
      message: 'Balances retrieved',
      data: balances
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
