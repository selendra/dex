const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchain');
const authService = require('../services/auth');
const { authenticate, optionalAuth } = require('../middleware/auth');

/**
 * GET /api/token/:tokenAddress/info
 * Get token metadata (name, symbol, decimals, totalSupply)
 */
router.get('/:tokenAddress/info', async (req, res, next) => {
  try {
    const { tokenAddress } = req.params;
    
    const info = await blockchainService.getTokenInfo(tokenAddress);
    
    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/token/:tokenAddress/balance/:accountAddress
 * Get token balance for a specific account
 */
router.get('/:tokenAddress/balance/:accountAddress', async (req, res, next) => {
  try {
    const { tokenAddress, accountAddress } = req.params;
    
    const balance = await blockchainService.getTokenBalance(tokenAddress, accountAddress);
    
    res.json({
      success: true,
      data: {
        tokenAddress,
        accountAddress,
        balance
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/token/:tokenAddress/allowance/:ownerAddress/:spenderAddress
 * Get token allowance
 */
router.get('/:tokenAddress/allowance/:ownerAddress/:spenderAddress', async (req, res, next) => {
  try {
    const { tokenAddress, ownerAddress, spenderAddress } = req.params;
    
    const result = await blockchainService.getAllowance(tokenAddress, ownerAddress, spenderAddress);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/token/transfer
 * Transfer tokens to another address
 * Body: {
 *   tokenAddress: "0x...",
 *   toAddress: "0x...",
 *   amount: "100",
 *   password: "userpassword"
 * }
 */
router.post('/transfer', authenticate, async (req, res, next) => {
  try {
    const { tokenAddress, toAddress, amount, password } = req.body;
    
    if (!tokenAddress || !toAddress || !amount || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['tokenAddress', 'toAddress', 'amount', 'password']
      });
    }
    
    // Get user's wallet
    const userWallet = authService.getUserWallet(
      req.user.username,
      password,
      blockchainService.provider
    );
    
    const result = await blockchainService.transferToken(
      userWallet,
      tokenAddress,
      toAddress,
      parseFloat(amount)
    );
    
    res.json({
      success: true,
      message: 'Transfer successful',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/token/approve
 * Approve spender to spend tokens
 * Body: {
 *   tokenAddress: "0x...",
 *   spenderAddress: "0x...",
 *   amount: "100",
 *   password: "userpassword"
 * }
 */
router.post('/approve', authenticate, async (req, res, next) => {
  try {
    const { tokenAddress, spenderAddress, amount, password } = req.body;
    
    if (!tokenAddress || !spenderAddress || !amount || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['tokenAddress', 'spenderAddress', 'amount', 'password']
      });
    }
    
    const userWallet = authService.getUserWallet(
      req.user.username,
      password,
      blockchainService.provider
    );
    
    const result = await blockchainService.approveToken(
      userWallet,
      tokenAddress,
      spenderAddress,
      parseFloat(amount)
    );
    
    res.json({
      success: true,
      message: 'Approval successful',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/token/transferFrom
 * Transfer tokens from another address (requires allowance)
 * Body: {
 *   tokenAddress: "0x...",
 *   fromAddress: "0x...",
 *   toAddress: "0x...",
 *   amount: "100",
 *   password: "userpassword"
 * }
 */
router.post('/transferFrom', authenticate, async (req, res, next) => {
  try {
    const { tokenAddress, fromAddress, toAddress, amount, password } = req.body;
    
    if (!tokenAddress || !fromAddress || !toAddress || !amount || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['tokenAddress', 'fromAddress', 'toAddress', 'amount', 'password']
      });
    }
    
    const userWallet = authService.getUserWallet(
      req.user.username,
      password,
      blockchainService.provider
    );
    
    const result = await blockchainService.transferFromToken(
      userWallet,
      tokenAddress,
      fromAddress,
      toAddress,
      parseFloat(amount)
    );
    
    res.json({
      success: true,
      message: 'TransferFrom successful',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/token/burn
 * Burn tokens from your own balance
 * Body: {
 *   tokenAddress: "0x...",
 *   amount: "100",
 *   password: "userpassword"
 * }
 */
router.post('/burn', authenticate, async (req, res, next) => {
  try {
    const { tokenAddress, amount, password } = req.body;
    
    if (!tokenAddress || !amount || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['tokenAddress', 'amount', 'password']
      });
    }
    
    const userWallet = authService.getUserWallet(
      req.user.username,
      password,
      blockchainService.provider
    );
    
    const result = await blockchainService.burnToken(
      userWallet,
      tokenAddress,
      parseFloat(amount)
    );
    
    res.json({
      success: true,
      message: 'Tokens burned successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/token/burnFrom
 * Burn tokens from another address (requires allowance)
 * Body: {
 *   tokenAddress: "0x...",
 *   fromAddress: "0x...",
 *   amount: "100",
 *   password: "userpassword"
 * }
 */
router.post('/burnFrom', authenticate, async (req, res, next) => {
  try {
    const { tokenAddress, fromAddress, amount, password } = req.body;
    
    if (!tokenAddress || !fromAddress || !amount || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['tokenAddress', 'fromAddress', 'amount', 'password']
      });
    }
    
    const userWallet = authService.getUserWallet(
      req.user.username,
      password,
      blockchainService.provider
    );
    
    const result = await blockchainService.burnFromToken(
      userWallet,
      tokenAddress,
      fromAddress,
      parseFloat(amount)
    );
    
    res.json({
      success: true,
      message: 'Tokens burned from address successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/token/mint
 * Mint new tokens (TestToken specific - no access control)
 * Body: {
 *   tokenAddress: "0x...",
 *   toAddress: "0x...",
 *   amount: "100",
 *   password: "userpassword"
 * }
 */
router.post('/mint', authenticate, async (req, res, next) => {
  try {
    const { tokenAddress, toAddress, amount, password } = req.body;
    
    if (!tokenAddress || !toAddress || !amount || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['tokenAddress', 'toAddress', 'amount', 'password']
      });
    }
    
    const userWallet = authService.getUserWallet(
      req.user.username,
      password,
      blockchainService.provider
    );
    
    const result = await blockchainService.mintToken(
      userWallet,
      tokenAddress,
      toAddress,
      parseFloat(amount)
    );
    
    res.json({
      success: true,
      message: 'Tokens minted successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
