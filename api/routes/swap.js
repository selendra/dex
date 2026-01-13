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
 *   minAmountOut: "95" (optional),
 *   privateKey: "0x..." (required)
 * }
 */
router.post('/', async (req, res, next) => {
  try {
    const { tokenIn, tokenOut, amountIn, minAmountOut, privateKey } = req.body;
    
    // Validate input
    if (!tokenIn || !tokenOut || !amountIn || !privateKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['tokenIn', 'tokenOut', 'amountIn', 'privateKey']
      });
    }
    
    // Create wallet from private key
    const userWallet = blockchainService.createWalletFromPrivateKey(privateKey);
    
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
 *   amountIn: "100",
 *   privateKey: "0x..." (optional - if provided, includes user balances)
 * }
 */
router.post('/quote', async (req, res, next) => {
  try {
    const { tokenIn, tokenOut, amountIn, privateKey } = req.body;
    
    if (!tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['tokenIn', 'tokenOut', 'amountIn']
      });
    }
    
    // Get swap quote with calculated output
    const quote = await blockchainService.getSwapQuote(tokenIn, tokenOut, parseFloat(amountIn));
    
    // If private key provided, include their balances
    let userBalances = null;
    if (privateKey) {
      try {
        const wallet = blockchainService.createWalletFromPrivateKey(privateKey);
        userBalances = await blockchainService.getUserBalances(
          wallet.address,
          [tokenIn, tokenOut]
        );
      } catch (e) {
        // Ignore invalid private key for quote
      }
    }
    
    res.json({
      success: true,
      message: 'Quote calculated',
      data: {
        ...quote,
        userBalances
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/swap/balances
 * Get user's token and native balances
 * Body: {
 *   privateKey: "0x...",
 *   tokens: ["0x...", "0x..."]
 * }
 */
router.post('/balances', async (req, res, next) => {
  try {
    const { privateKey, tokens } = req.body;
    
    if (!privateKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['privateKey']
      });
    }
    
    const wallet = blockchainService.createWalletFromPrivateKey(privateKey);
    const tokenAddresses = tokens || [];
    
    const balances = await blockchainService.getUserBalances(
      wallet.address,
      tokenAddresses
    );
    
    res.json({
      success: true,
      message: 'Balances retrieved',
      data: {
        address: wallet.address,
        ...balances
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/swap/admin/pause
 * Pause swaps (admin only)
 * Body: {
 *   privateKey: "0x..." (admin's private key)
 * }
 */
router.post('/admin/pause', async (req, res, next) => {
  try {
    const { privateKey } = req.body;
    
    if (!privateKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['privateKey']
      });
    }
    
    const result = await blockchainService.pauseSwaps(privateKey);
    
    res.json({
      success: true,
      message: 'Swaps paused successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/swap/admin/unpause
 * Unpause swaps (admin only)
 * Body: {
 *   privateKey: "0x..." (admin's private key)
 * }
 */
router.post('/admin/unpause', async (req, res, next) => {
  try {
    const { privateKey } = req.body;
    
    if (!privateKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['privateKey']
      });
    }
    
    const result = await blockchainService.unpauseSwaps(privateKey);
    
    res.json({
      success: true,
      message: 'Swaps unpaused successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/swap/admin/status
 * Get swap router status (paused state and admin)
 */
router.get('/admin/status', async (req, res, next) => {
  try {
    const paused = await blockchainService.isSwapsPaused();
    const admin = await blockchainService.getSwapAdmin();
    
    res.json({
      success: true,
      data: {
        paused,
        admin
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/swap/admin/transfer
 * Transfer swap router admin role (admin only)
 * Body: {
 *   newAdmin: "0x...",
 *   privateKey: "0x..." (current admin's private key)
 * }
 */
router.post('/admin/transfer', async (req, res, next) => {
  try {
    const { newAdmin, privateKey } = req.body;
    
    if (!newAdmin || !privateKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['newAdmin', 'privateKey']
      });
    }
    
    const result = await blockchainService.transferSwapAdmin(privateKey, newAdmin);
    
    res.json({
      success: true,
      message: 'Swap admin transferred successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
