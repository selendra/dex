const express = require('express');
const router = express.Router();
const contractService = require('../services/contractService');

router.get('/', async (req, res, next) => {
  try {
    const [network, blockNumber] = await Promise.all([
      contractService.getNetwork(),
      contractService.getBlockNumber(),
    ]);

    res.json({
      success: true,
      data: {
        status: 'ok',
        network: {
          name: network.name,
          chainId: network.chainId.toString(),
        },
        blockNumber,
        contracts: {
          poolManager: process.env.POOL_MANAGER_ADDRESS,
          stateView: process.env.STATE_VIEW_ADDRESS,
          swapRouter: process.env.SWAP_ROUTER_ADDRESS,
          liquidityRouter: process.env.LIQUIDITY_ROUTER_ADDRESS,
        },
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
