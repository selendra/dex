const express = require('express');
const router = express.Router();
const contractService = require('../services/contractService');

// POST /pools/initialize
router.post('/initialize', async (req, res, next) => {
  try {
    const { token0, token1, fee, sqrtPriceX96 } = req.body;

    // Validation
    if (!token0 || !token1 || !fee || !sqrtPriceX96) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: token0, token1, fee, sqrtPriceX96',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
    }

    const result = await contractService.initializePool(
      token0,
      token1,
      parseInt(fee),
      BigInt(sqrtPriceX96)
    );

    res.json({
      success: result.success,
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

// GET /pools/:poolId
router.get('/:poolId', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    const poolInfo = await contractService.getPoolInfo(poolId);

    res.json({
      success: true,
      data: poolInfo,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /pools/:poolId/price
router.get('/:poolId/price', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    const priceInfo = await contractService.getPoolPrice(poolId);

    res.json({
      success: true,
      data: priceInfo,
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
