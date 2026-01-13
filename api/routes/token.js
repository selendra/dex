const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchain');

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
 *   privateKey: "0x..."
 * }
 */
router.post('/transfer', async (req, res, next) => {
  try {
    const { tokenAddress, toAddress, amount, privateKey } = req.body;
    
    if (!tokenAddress || !toAddress || !amount || !privateKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['tokenAddress', 'toAddress', 'amount', 'privateKey']
      });
    }
    
    // Create wallet from private key
    const userWallet = blockchainService.createWalletFromPrivateKey(privateKey);
    
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
 *   privateKey: "0x..."
 * }
 */
router.post('/approve', async (req, res, next) => {
  try {
    const { tokenAddress, spenderAddress, amount, privateKey } = req.body;
    
    if (!tokenAddress || !spenderAddress || !amount || !privateKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['tokenAddress', 'spenderAddress', 'amount', 'privateKey']
      });
    }
    
    const userWallet = blockchainService.createWalletFromPrivateKey(privateKey);
    
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
 *   privateKey: "0x..."
 * }
 */
router.post('/transferFrom', async (req, res, next) => {
  try {
    const { tokenAddress, fromAddress, toAddress, amount, privateKey } = req.body;
    
    if (!tokenAddress || !fromAddress || !toAddress || !amount || !privateKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['tokenAddress', 'fromAddress', 'toAddress', 'amount', 'privateKey']
      });
    }
    
    const userWallet = blockchainService.createWalletFromPrivateKey(privateKey);
    
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
 *   privateKey: "0x..."
 * }
 */
router.post('/burn', async (req, res, next) => {
  try {
    const { tokenAddress, amount, privateKey } = req.body;
    
    if (!tokenAddress || !amount || !privateKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['tokenAddress', 'amount', 'privateKey']
      });
    }
    
    const userWallet = blockchainService.createWalletFromPrivateKey(privateKey);
    
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
 *   privateKey: "0x..."
 * }
 */
router.post('/burnFrom', async (req, res, next) => {
  try {
    const { tokenAddress, fromAddress, amount, privateKey } = req.body;
    
    if (!tokenAddress || !fromAddress || !amount || !privateKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['tokenAddress', 'fromAddress', 'amount', 'privateKey']
      });
    }
    
    const userWallet = blockchainService.createWalletFromPrivateKey(privateKey);
    
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
 *   privateKey: "0x..."
 * }
 */
router.post('/mint', async (req, res, next) => {
  try {
    const { tokenAddress, toAddress, amount, privateKey } = req.body;
    
    if (!tokenAddress || !toAddress || !amount || !privateKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['tokenAddress', 'toAddress', 'amount', 'privateKey']
      });
    }
    
    const userWallet = blockchainService.createWalletFromPrivateKey(privateKey);
    
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

/**
 * POST /api/token/balances
 * Get multiple token balances for an address
 * Body: {
 *   privateKey: "0x..." OR accountAddress: "0x...",
 *   tokens: ["0x...", "0x..."]
 * }
 */
router.post('/balances', async (req, res, next) => {
  try {
    const { privateKey, accountAddress, tokens } = req.body;
    
    if (!privateKey && !accountAddress) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['privateKey OR accountAddress', 'tokens']
      });
    }
    
    let address;
    if (privateKey) {
      address = blockchainService.getAddressFromPrivateKey(privateKey);
    } else {
      address = accountAddress;
    }
    
    const tokenAddresses = tokens || [];
    const balances = await blockchainService.getUserBalances(address, tokenAddresses);
    
    res.json({
      success: true,
      data: {
        address,
        ...balances
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
