const express = require('express');
const router = express.Router();
const contractService = require('../services/contractService');
const { ethers } = require('ethers');

// POST /utils/encode-poolkey
router.post('/encode-poolkey', async (req, res, next) => {
  try {
    const { token0, token1, fee, tickSpacing, hooks } = req.body;

    if (!token0 || !token1 || !fee) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: token0, token1, fee',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
    }

    const result = contractService.encodePoolKey(
      token0,
      token1,
      parseInt(fee),
      tickSpacing ? parseInt(tickSpacing) : null,
      hooks || ethers.ZeroAddress
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

// POST /utils/calculate-poolid
router.post('/calculate-poolid', async (req, res, next) => {
  try {
    const { poolKey } = req.body;

    if (!poolKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: poolKey',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
    }

    const poolId = contractService.calculatePoolId(poolKey);

    res.json({
      success: true,
      data: { poolId },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /utils/price-to-sqrt
router.post('/price-to-sqrt', async (req, res, next) => {
  try {
    const { price, token0Amount, token1Amount } = req.body;

    let calculatedPrice;
    if (price) {
      calculatedPrice = parseFloat(price);
    } else if (token0Amount && token1Amount) {
      calculatedPrice = parseFloat(token1Amount) / parseFloat(token0Amount);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Provide either price or (token0Amount and token1Amount)',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
    }

    const sqrtPriceX96 = contractService.priceToSqrtPriceX96(calculatedPrice);

    res.json({
      success: true,
      data: {
        price: calculatedPrice,
        sqrtPriceX96: sqrtPriceX96.toString(),
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /utils/sqrt-to-price
router.post('/sqrt-to-price', async (req, res, next) => {
  try {
    const { sqrtPriceX96 } = req.body;

    if (!sqrtPriceX96) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: sqrtPriceX96',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
    }

    const price = contractService.sqrtPriceX96ToPrice(BigInt(sqrtPriceX96));

    res.json({
      success: true,
      data: {
        sqrtPriceX96: sqrtPriceX96.toString(),
        price,
        humanReadable: price.toFixed(6),
      },
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
