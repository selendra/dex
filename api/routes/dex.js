const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// ABIs
const WORKING_SWAP_ROUTER_ABI = [
  "function swap(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, address payer) external returns (int256, int256)"
];

const SIMPLE_LIQUIDITY_MANAGER_ABI = [
  "function initializePool(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external returns (int24)",
  "function addLiquidity(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, int24 tickLower, int24 tickUpper, int256 liquidityDelta) external returns (int256, int256)"
];

const POOL_MANAGER_ABI = [
  "function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
  "function getLiquidity(bytes32 poolId) external view returns (uint128)"
];

const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)"
];

// Helper functions
function getPoolId(poolKey) {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['address', 'address', 'uint24', 'int24', 'address'],
    [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
  );
  return ethers.keccak256(encoded);
}

function getTickSpacing(fee) {
  if (fee === 500) return 10;
  if (fee === 3000) return 60;
  if (fee === 10000) return 200;
  return 60;
}

/**
 * POST /api/dex/pool/initialize
 * Initialize a new liquidity pool
 */
router.post('/pool/initialize', async (req, res, next) => {
  try {
    const { tokenA, tokenB, fee = 3000, initialPrice = 1.0 } = req.body;

    if (!tokenA || !tokenB) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'tokenA and tokenB are required'
        }
      });
    }

    if (!ethers.isAddress(tokenA) || !ethers.isAddress(tokenB)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ADDRESS',
          message: 'Invalid token address'
        }
      });
    }

    // Sort tokens
    const [currency0, currency1] = tokenA.toLowerCase() < tokenB.toLowerCase()
      ? [tokenA, tokenB]
      : [tokenB, tokenA];

    const poolKey = {
      currency0,
      currency1,
      fee,
      tickSpacing: getTickSpacing(fee),
      hooks: ethers.ZeroAddress
    };

    // Calculate sqrtPriceX96 from price
    // For 1:1 price: sqrtPriceX96 = 79228162514264337593543950336
    const sqrtPriceX96 = BigInt(Math.floor(Math.sqrt(initialPrice) * 2**96));

    const liquidityManager = new ethers.Contract(
      process.env.LIQUIDITY_MANAGER_ADDRESS,
      SIMPLE_LIQUIDITY_MANAGER_ABI,
      signer
    );

    const tx = await liquidityManager.initializePool(poolKey, sqrtPriceX96);
    const receipt = await tx.wait();

    const poolId = getPoolId(poolKey);

    res.json({
      success: true,
      data: {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        poolId,
        poolKey,
        initialPrice,
        sqrtPriceX96: sqrtPriceX96.toString()
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/dex/liquidity/add
 * Add liquidity to a pool
 */
router.post('/liquidity/add', async (req, res, next) => {
  try {
    const {
      tokenA,
      tokenB,
      amountA,
      amountB,
      fee = 3000,
      tickLower = -887220,
      tickUpper = 887220
    } = req.body;

    if (!tokenA || !tokenB || !amountA || !amountB) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'tokenA, tokenB, amountA, and amountB are required'
        }
      });
    }

    // Sort tokens
    const [currency0, currency1] = tokenA.toLowerCase() < tokenB.toLowerCase()
      ? [tokenA, tokenB]
      : [tokenB, tokenA];

    const poolKey = {
      currency0,
      currency1,
      fee,
      tickSpacing: getTickSpacing(fee),
      hooks: ethers.ZeroAddress
    };

    const token0 = new ethers.Contract(currency0, ERC20_ABI, signer);
    const token1 = new ethers.Contract(currency1, ERC20_ABI, signer);

    const liquidityManagerAddress = process.env.LIQUIDITY_MANAGER_ADDRESS;

    // Transfer tokens to liquidity manager
    const tx0 = await token0.transfer(liquidityManagerAddress, amountA);
    await tx0.wait();

    const tx1 = await token1.transfer(liquidityManagerAddress, amountB);
    await tx1.wait();

    const liquidityManager = new ethers.Contract(
      liquidityManagerAddress,
      SIMPLE_LIQUIDITY_MANAGER_ABI,
      signer
    );

    // Calculate liquidity delta (simplified)
    const liquidityDelta = BigInt(amountA) < BigInt(amountB) ? amountA : amountB;

    const tx = await liquidityManager.addLiquidity(
      poolKey,
      tickLower,
      tickUpper,
      liquidityDelta
    );
    const receipt = await tx.wait();

    res.json({
      success: true,
      data: {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        poolKey,
        amountA: amountA.toString(),
        amountB: amountB.toString(),
        liquidityDelta: liquidityDelta.toString(),
        tickRange: { lower: tickLower, upper: tickUpper }
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/dex/swap
 * Execute a token swap
 */
router.post('/swap', async (req, res, next) => {
  try {
    const {
      tokenIn,
      tokenOut,
      amountIn,
      minAmountOut = 0,
      fee = 3000
    } = req.body;

    if (!tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'tokenIn, tokenOut, and amountIn are required'
        }
      });
    }

    // Sort tokens to create pool key
    const [currency0, currency1] = tokenIn.toLowerCase() < tokenOut.toLowerCase()
      ? [tokenIn, tokenOut]
      : [tokenOut, tokenIn];

    const poolKey = {
      currency0,
      currency1,
      fee,
      tickSpacing: getTickSpacing(fee),
      hooks: ethers.ZeroAddress
    };

    const zeroForOne = tokenIn.toLowerCase() === currency0.toLowerCase();

    // Approve token spending
    const tokenInContract = new ethers.Contract(tokenIn, ERC20_ABI, signer);
    const swapRouterAddress = process.env.SWAP_ROUTER_ADDRESS;
    
    const approveTx = await tokenInContract.approve(swapRouterAddress, ethers.MaxUint256);
    await approveTx.wait();

    // Execute swap
    const swapRouter = new ethers.Contract(
      swapRouterAddress,
      WORKING_SWAP_ROUTER_ABI,
      signer
    );

    const swapParams = {
      zeroForOne,
      amountSpecified: amountIn,
      sqrtPriceLimitX96: zeroForOne ? "4295128740" : "1461446703485210103287273052203988822378723970341"
    };

    const tx = await swapRouter.swap(poolKey, swapParams, signer.address);
    const receipt = await tx.wait();

    // Get balances after swap
    const tokenOutContract = new ethers.Contract(tokenOut, ERC20_ABI, provider);
    const balanceOut = await tokenOutContract.balanceOf(signer.address);

    res.json({
      success: true,
      data: {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        tokenIn,
        tokenOut,
        amountIn: amountIn.toString(),
        balanceOut: balanceOut.toString(),
        poolKey
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dex/pool/info
 * Get pool information
 */
router.get('/pool/info', async (req, res, next) => {
  try {
    const { tokenA, tokenB, fee = 3000 } = req.query;

    if (!tokenA || !tokenB) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'tokenA and tokenB are required'
        }
      });
    }

    const [currency0, currency1] = tokenA.toLowerCase() < tokenB.toLowerCase()
      ? [tokenA, tokenB]
      : [tokenB, tokenA];

    const poolKey = {
      currency0,
      currency1,
      fee: parseInt(fee),
      tickSpacing: getTickSpacing(parseInt(fee)),
      hooks: ethers.ZeroAddress
    };

    const poolId = getPoolId(poolKey);

    const poolManager = new ethers.Contract(
      process.env.POOL_MANAGER_ADDRESS,
      POOL_MANAGER_ABI,
      provider
    );

    try {
      const [slot0, liquidity] = await Promise.all([
        poolManager.getSlot0(poolId),
        poolManager.getLiquidity(poolId)
      ]);

      // Calculate price from sqrtPriceX96
      const sqrtPriceX96 = slot0[0];
      const price = (Number(sqrtPriceX96) / 2**96) ** 2;

      res.json({
        success: true,
        data: {
          poolId,
          poolKey,
          sqrtPriceX96: sqrtPriceX96.toString(),
          tick: slot0[1],
          protocolFee: slot0[2],
          lpFee: slot0[3],
          liquidity: liquidity.toString(),
          price: price.toFixed(6),
          isInitialized: true
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.json({
        success: true,
        data: {
          poolId,
          poolKey,
          isInitialized: false,
          message: 'Pool not initialized'
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
