const express = require('express');
const router = express.Router();
const blockchain = require('../services/blockchain');

/**
 * @route GET /protocol-fees/controller
 * @desc Get protocol fee controller and PoolManager owner
 */
router.get('/controller', async (req, res, next) => {
  try {
    const data = await blockchain.getProtocolFeeController();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /protocol-fees/accrued/:tokenAddress
 * @desc Get accrued protocol fees for a token
 */
router.get('/accrued/:tokenAddress', async (req, res, next) => {
  try {
    const { tokenAddress } = req.params;
    const data = await blockchain.getProtocolFeesAccrued(tokenAddress);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /protocol-fees/pool/:token0/:token1
 * @desc Get protocol fee info for a specific pool
 */
router.get('/pool/:token0/:token1', async (req, res, next) => {
  try {
    const { token0, token1 } = req.params;
    const fee = parseInt(req.query.fee) || 3000;
    const data = await blockchain.getPoolProtocolFee(token0, token1, fee);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /protocol-fees/set-controller
 * @desc Set protocol fee controller (only PoolManager owner)
 */
router.post('/set-controller', async (req, res, next) => {
  try {
    const { privateKey, controllerAddress } = req.body;
    
    if (!privateKey || !controllerAddress) {
      return res.status(400).json({
        success: false,
        error: 'privateKey and controllerAddress are required'
      });
    }
    
    const data = await blockchain.setProtocolFeeController(privateKey, controllerAddress);
    res.json({
      success: true,
      message: 'Protocol fee controller updated',
      data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /protocol-fees/set-fee
 * @desc Set protocol fee for a pool (only protocol fee controller)
 */
router.post('/set-fee', async (req, res, next) => {
  try {
    const { privateKey, token0, token1, fee, protocolFee } = req.body;
    
    if (!privateKey || !token0 || !token1) {
      return res.status(400).json({
        success: false,
        error: 'privateKey, token0, and token1 are required'
      });
    }
    
    const poolFee = parseInt(fee) || 3000;
    const pFee = parseInt(protocolFee) || 0;
    
    const data = await blockchain.setProtocolFee(privateKey, token0, token1, poolFee, pFee);
    res.json({
      success: true,
      message: 'Protocol fee set for pool',
      data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /protocol-fees/collect
 * @desc Collect accrued protocol fees (only protocol fee controller)
 */
router.post('/collect', async (req, res, next) => {
  try {
    const { privateKey, recipient, tokenAddress, amount } = req.body;
    
    if (!privateKey || !recipient || !tokenAddress) {
      return res.status(400).json({
        success: false,
        error: 'privateKey, recipient, and tokenAddress are required'
      });
    }
    
    const data = await blockchain.collectProtocolFees(
      privateKey, 
      recipient, 
      tokenAddress, 
      amount || "0"
    );
    res.json({
      success: true,
      message: 'Protocol fees collected',
      data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /protocol-fees/all-accrued
 * @desc Get accrued fees for all known tokens
 */
router.post('/all-accrued', async (req, res, next) => {
  try {
    const { tokenAddresses } = req.body;
    
    if (!tokenAddresses || !Array.isArray(tokenAddresses)) {
      return res.status(400).json({
        success: false,
        error: 'tokenAddresses array is required'
      });
    }
    
    const results = await Promise.all(
      tokenAddresses.map(addr => blockchain.getProtocolFeesAccrued(addr))
    );
    
    res.json({
      success: true,
      data: {
        fees: results,
        totalTokens: results.length
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
