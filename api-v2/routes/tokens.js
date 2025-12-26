const express = require('express');
const router = express.Router();
const contractService = require('../services/contractService');
const { ethers } = require('ethers');

// GET /tokens/:address
router.get('/:address', async (req, res, next) => {
  try {
    const { address } = req.params;

    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token address',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
    }

    const tokenInfo = await contractService.getTokenInfo(address);

    res.json({
      success: true,
      data: tokenInfo,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /tokens/approve
router.post('/approve', async (req, res, next) => {
  try {
    const { tokenAddress, spenderAddress, amount } = req.body;

    if (!tokenAddress || !spenderAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tokenAddress, spenderAddress, amount',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
    }

    // Convert amount to BigInt (support both string and number)
    const amountBigInt = typeof amount === 'string' && amount === 'max'
      ? ethers.MaxUint256
      : BigInt(amount);

    const result = await contractService.approveToken(
      tokenAddress,
      spenderAddress,
      amountBigInt
    );

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /tokens/:address/balance/:owner
router.get('/:address/balance/:owner', async (req, res, next) => {
  try {
    const { address, owner } = req.params;

    if (!ethers.isAddress(address) || !ethers.isAddress(owner)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address format',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
    }

    const balance = await contractService.getTokenBalance(address, owner);

    res.json({
      success: true,
      data: balance,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
