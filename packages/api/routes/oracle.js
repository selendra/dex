const express = require('express');
const router = express.Router();
const blockchain = require('../services/blockchain');

/**
 * @route GET /oracle/price/:token0/:token1
 * @desc Get price for a token pair (pool or external feed)
 */
router.get('/price/:token0/:token1', async (req, res) => {
  try {
    const { token0, token1 } = req.params;
    
    const priceInfo = await blockchain.getPrice(token0, token1);
    
    res.json({
      success: true,
      data: priceInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /oracle/pool-price/:token0/:token1
 * @desc Get price from on-chain pool only
 */
router.get('/pool-price/:token0/:token1', async (req, res) => {
  try {
    const { token0, token1 } = req.params;
    
    const priceData = await blockchain.getPoolPrice(token0, token1);
    
    res.json({
      success: true,
      data: priceData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /oracle/external-price/:token0/:token1
 * @desc Get external price feed only
 */
router.get('/external-price/:token0/:token1', async (req, res) => {
  try {
    const { token0, token1 } = req.params;
    
    const priceData = await blockchain.getExternalPrice(token0, token1);
    
    res.json({
      success: true,
      data: priceData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /oracle/twap/:token0/:token1
 * @desc Get TWAP for a token pair
 */
router.get('/twap/:token0/:token1', async (req, res) => {
  try {
    const { token0, token1 } = req.params;
    
    const twapData = await blockchain.getTWAP(token0, token1);
    
    res.json({
      success: true,
      data: twapData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /oracle/feed
 * @desc Feed price for a token pair (authorized feeder only)
 * @body { privateKey, token0, token1, price }
 */
router.post('/feed', async (req, res) => {
  try {
    const { privateKey, token0, token1, price } = req.body;
    
    if (!privateKey || !token0 || !token1 || price === undefined) {
      return res.status(400).json({
        success: false,
        error: 'privateKey, token0, token1, and price are required'
      });
    }
    
    const result = await blockchain.feedPrice(privateKey, token0, token1, price);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /oracle/feed-batch
 * @desc Feed multiple prices at once (authorized feeder only)
 * @body { privateKey, pairs: [{ token0, token1, price }, ...] }
 */
router.post('/feed-batch', async (req, res) => {
  try {
    const { privateKey, pairs } = req.body;
    
    if (!privateKey || !pairs || !Array.isArray(pairs)) {
      return res.status(400).json({
        success: false,
        error: 'privateKey and pairs array are required'
      });
    }
    
    const result = await blockchain.feedPricesBatch(privateKey, pairs);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /oracle/observe
 * @desc Observe current pool price (updates TWAP)
 * @body { privateKey, token0, token1 }
 */
router.post('/observe', async (req, res) => {
  try {
    const { privateKey, token0, token1 } = req.body;
    
    if (!privateKey || !token0 || !token1) {
      return res.status(400).json({
        success: false,
        error: 'privateKey, token0, and token1 are required'
      });
    }
    
    const result = await blockchain.observePoolPrice(token0, token1, privateKey);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /oracle/observations/:token0/:token1
 * @desc Get observation count for a pair
 */
router.get('/observations/:token0/:token1', async (req, res) => {
  try {
    const { token0, token1 } = req.params;
    
    const result = await blockchain.getObservationCount(token0, token1);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /oracle/invalidate
 * @desc Invalidate an external price feed (authorized feeder only)
 * @body { privateKey, token0, token1 }
 */
router.post('/invalidate', async (req, res) => {
  try {
    const { privateKey, token0, token1 } = req.body;
    
    if (!privateKey || !token0 || !token1) {
      return res.status(400).json({
        success: false,
        error: 'privateKey, token0, and token1 are required'
      });
    }
    
    const result = await blockchain.invalidatePrice(privateKey, token0, token1);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /oracle/config
 * @desc Get oracle configuration
 */
router.get('/config', async (req, res) => {
  try {
    const config = await blockchain.getOracleConfig();
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============== ADMIN ROUTES ==============

/**
 * @route GET /oracle/admin/feeder/:account
 * @desc Check if an address is an authorized feeder
 */
router.get('/admin/feeder/:account', async (req, res) => {
  try {
    const { account } = req.params;
    
    const isAuthorized = await blockchain.isAuthorizedFeeder(account);
    
    res.json({
      success: true,
      data: {
        account,
        isAuthorized
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /oracle/admin/authorize
 * @desc Authorize or revoke a price feeder (admin only)
 * @body { privateKey, account, authorized }
 */
router.post('/admin/authorize', async (req, res) => {
  try {
    const { privateKey, account, authorized } = req.body;
    
    if (!privateKey || !account || authorized === undefined) {
      return res.status(400).json({
        success: false,
        error: 'privateKey, account, and authorized are required'
      });
    }
    
    const result = await blockchain.setAuthorizedFeeder(privateKey, account, authorized);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /oracle/admin
 * @desc Get oracle admin address
 */
router.get('/admin', async (req, res) => {
  try {
    const admin = await blockchain.getOracleAdmin();
    
    res.json({
      success: true,
      data: {
        admin
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /oracle/admin/transfer
 * @desc Transfer oracle admin role (admin only)
 * @body { privateKey, newAdmin }
 */
router.post('/admin/transfer', async (req, res) => {
  try {
    const { privateKey, newAdmin } = req.body;
    
    if (!privateKey || !newAdmin) {
      return res.status(400).json({
        success: false,
        error: 'privateKey and newAdmin are required'
      });
    }
    
    const result = await blockchain.transferOracleAdmin(privateKey, newAdmin);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /oracle/admin/set-fee
 * @desc Set default fee for pool lookups (admin only)
 * @body { privateKey, fee }
 */
router.post('/admin/set-fee', async (req, res) => {
  try {
    const { privateKey, fee } = req.body;
    
    if (!privateKey || fee === undefined) {
      return res.status(400).json({
        success: false,
        error: 'privateKey and fee are required'
      });
    }
    
    const result = await blockchain.setDefaultFee(privateKey, fee);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /oracle/admin/set-tick-spacing
 * @desc Set default tick spacing for pool lookups (admin only)
 * @body { privateKey, tickSpacing }
 */
router.post('/admin/set-tick-spacing', async (req, res) => {
  try {
    const { privateKey, tickSpacing } = req.body;
    
    if (!privateKey || tickSpacing === undefined) {
      return res.status(400).json({
        success: false,
        error: 'privateKey and tickSpacing are required'
      });
    }
    
    const result = await blockchain.setDefaultTickSpacing(privateKey, tickSpacing);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
