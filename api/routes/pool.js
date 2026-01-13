const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchain');

/**
 * POST /api/pool/initialize
 * Initialize a new pool
 * Body: {
 *   token0: "0x...",
 *   token1: "0x...",
 *   priceRatio: 1 (optional, e.g., 1 for 1:1, 10 for 10:1, 0.5 for 1:2),
 *   privateKey: "0x..." (required - user pays gas)
 * }
 */
router.post('/initialize', async (req, res, next) => {
  try {
    const { token0, token1, priceRatio, privateKey } = req.body;
    
    // Validate input
    if (!token0 || !token1 || !privateKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['token0', 'token1', 'privateKey']
      });
    }
    
    // Create wallet from private key
    const userWallet = blockchainService.createWalletFromPrivateKey(privateKey);
    
    // Validate price ratio if provided
    if (priceRatio !== undefined && priceRatio !== null && priceRatio <= 0) {
      return res.status(400).json({
        error: 'Invalid price ratio',
        message: 'Price ratio must be greater than 0'
      });
    }
    
    // Initialize pool with user's wallet
    const result = await blockchainService.initializePoolWithWallet(
      userWallet,
      token0,
      token1,
      priceRatio
    );
    
    res.json({
      success: true,
      message: 'Pool initialized successfully',
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
 * GET /api/pool/:token0/:token1
 * Get pool information
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

/**
 * POST /api/pool/list
 * Get information for multiple pools
 * Body: {
 *   tokens: ["0x...", "0x...", "0x..."]
 * }
 */
router.post('/list', async (req, res, next) => {
  try {
    const { tokens } = req.body;
    
    if (!tokens || !Array.isArray(tokens) || tokens.length < 2) {
      return res.status(400).json({
        error: 'Invalid tokens array',
        required: 'Array of at least 2 token addresses'
      });
    }
    
    const pools = await blockchainService.getAllPoolsInfo(tokens);
    
    res.json({
      success: true,
      data: {
        pools,
        count: pools.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pool/token/:tokenAddress/balance
 * Get token balance for default signer
 */
router.get('/token/:tokenAddress/balance', async (req, res, next) => {
  try {
    const { tokenAddress } = req.params;
    
    const balance = await blockchainService.getTokenBalance(tokenAddress, null);
    
    res.json({
      success: true,
      data: {
        tokenAddress,
        accountAddress: 'default signer',
        balance
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pool/token/:tokenAddress/balance/:accountAddress
 * Get token balance for specific account
 */
router.get('/token/:tokenAddress/balance/:accountAddress', async (req, res, next) => {
  try {
    const { tokenAddress, accountAddress } = req.params;
    
    const balance = await blockchainService.getTokenBalance(
      tokenAddress,
      accountAddress
    );
    
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
 * POST /api/pool/admin/authorize
 * Authorize an address to initialize pools (admin only)
 * Body: {
 *   account: "0x...",
 *   authorized: true/false,
 *   privateKey: "0x..." (admin's private key)
 * }
 */
router.post('/admin/authorize', async (req, res, next) => {
  try {
    const { account, authorized, privateKey } = req.body;
    
    if (!account || authorized === undefined || !privateKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['account', 'authorized', 'privateKey']
      });
    }
    
    const result = await blockchainService.setAuthorizedInitializer(privateKey, account, authorized);
    
    res.json({
      success: true,
      message: `Address ${authorized ? 'authorized' : 'revoked'} successfully`,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pool/admin/check/:account
 * Check if an address is authorized to initialize pools
 */
router.get('/admin/check/:account', async (req, res, next) => {
  try {
    const { account } = req.params;
    
    const isAuthorized = await blockchainService.isAuthorizedInitializer(account);
    const admin = await blockchainService.getPoolAdmin();
    
    res.json({
      success: true,
      data: {
        account,
        isAuthorized,
        isAdmin: account.toLowerCase() === admin.toLowerCase(),
        admin
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/pool/admin/transfer
 * Transfer admin role to a new address (admin only)
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
    
    const result = await blockchainService.transferPoolAdmin(privateKey, newAdmin);
    
    res.json({
      success: true,
      message: 'Admin transferred successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
