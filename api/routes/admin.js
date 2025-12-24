const express = require('express');
const router = express.Router();
const contractService = require('../services/contractService');
const { ethers } = require('ethers');

/**
 * POST /api/admin/initialize-pool
 * Initialize a new pool with specified parameters
 */
router.post('/initialize-pool', async (req, res, next) => {
  try {
    const {
      currency0,
      currency1,
      fee = 3000,
      sqrtPriceX96 = "79228162514264337593543950336" // 1:1 price by default
    } = req.body;

    // Validate inputs
    if (!currency0 || !currency1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'currency0 and currency1 are required'
        }
      });
    }

    // Sort currencies (currency0 must be < currency1)
    const [token0, token1] = currency0.toLowerCase() < currency1.toLowerCase()
      ? [currency0, currency1]
      : [currency1, currency0];

    const poolKey = {
      currency0: token0,
      currency1: token1,
      fee,
      tickSpacing: contractService.getTickSpacing(fee),
      hooks: ethers.ZeroAddress
    };

    console.log('Initializing pool:', poolKey);
    console.log('Initial sqrtPriceX96:', sqrtPriceX96);

    // Initialize pool
    const result = await contractService.initializePool(poolKey, sqrtPriceX96);

    res.json({
      success: true,
      data: {
        poolKey,
        sqrtPriceX96,
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        gasUsed: result.gasUsed,
        poolId: contractService.getPoolId(poolKey)
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
 * POST /api/admin/add-liquidity
 * Add liquidity to a pool (simplified version for testing)
 */
router.post('/add-liquidity', async (req, res, next) => {
  try {
    const {
      currency0,
      currency1,
      fee = 3000,
      amount0 = ethers.parseEther("10").toString(),
      amount1 = ethers.parseEther("10").toString(),
      tickLower = -887220,
      tickUpper = 887220,
      recipient,
      deadline
    } = req.body;

    // Validate inputs
    if (!currency0 || !currency1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'currency0 and currency1 are required'
        }
      });
    }

    // Sort currencies
    const [token0, token1] = currency0.toLowerCase() < currency1.toLowerCase()
      ? [currency0, currency1]
      : [currency1, currency0];

    const poolKey = {
      currency0: token0,
      currency1: token1,
      fee,
      tickSpacing: contractService.getTickSpacing(fee),
      hooks: ethers.ZeroAddress
    };

    // Get quote first
    const quote = await contractService.getAddLiquidityQuote(
      poolKey,
      tickLower,
      tickUpper,
      amount0,
      amount1
    );

    // Set deadline if not provided (5 minutes from now)
    const txDeadline = deadline || Math.floor(Date.now() / 1000) + 300;
    
    // Set recipient to deployer if not provided
    const recipientAddress = recipient || contractService.signer.address;

    // Add liquidity with 10% slippage buffer
    const amount0Max = (BigInt(amount0) * BigInt(110)) / BigInt(100);
    const amount1Max = (BigInt(amount1) * BigInt(110)) / BigInt(100);

    console.log('Adding liquidity:', {
      poolKey,
      liquidity: quote.liquidity,
      amount0Max: amount0Max.toString(),
      amount1Max: amount1Max.toString(),
      recipient: recipientAddress,
      deadline: txDeadline
    });

    const result = await contractService.addLiquidity(
      poolKey,
      tickLower,
      tickUpper,
      quote.liquidity,
      amount0Max.toString(),
      amount1Max.toString(),
      recipientAddress,
      txDeadline
    );

    res.json({
      success: true,
      data: {
        poolKey,
        quote,
        transaction: result,
        poolId: contractService.getPoolId(poolKey)
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
 * POST /api/admin/test-swap
 * Execute a test swap and verify balance changes
 */
router.post('/test-swap', async (req, res, next) => {
  try {
    const {
      tokenIn,
      tokenOut,
      amountIn,
      fee = 3000,
      recipient,
      slippageTolerance = 1.0
    } = req.body;

    // Validate inputs
    if (!tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'tokenIn, tokenOut, and amountIn are required'
        }
      });
    }

    const recipientAddress = recipient || contractService.signer.address;

    console.log('\n=== Starting Swap Test ===');
    console.log('TokenIn:', tokenIn);
    console.log('TokenOut:', tokenOut);
    console.log('AmountIn:', amountIn);

    // Get token contracts
    const tokenInContract = tokenIn !== ethers.ZeroAddress
      ? new ethers.Contract(tokenIn, [
          'function balanceOf(address) view returns (uint256)',
          'function symbol() view returns (string)',
          'function decimals() view returns (uint8)'
        ], contractService.provider)
      : null;

    const tokenOutContract = tokenOut !== ethers.ZeroAddress
      ? new ethers.Contract(tokenOut, [
          'function balanceOf(address) view returns (uint256)',
          'function symbol() view returns (string)',
          'function decimals() view returns (uint8)'
        ], contractService.provider)
      : null;

    // Get balances before swap
    const balancesBefore = {
      tokenIn: tokenInContract 
        ? await tokenInContract.balanceOf(recipientAddress)
        : await contractService.provider.getBalance(recipientAddress),
      tokenOut: tokenOutContract
        ? await tokenOutContract.balanceOf(recipientAddress)
        : await contractService.provider.getBalance(recipientAddress)
    };

    console.log('\nBalances Before Swap:');
    console.log('TokenIn:', ethers.formatEther(balancesBefore.tokenIn));
    console.log('TokenOut:', ethers.formatEther(balancesBefore.tokenOut));

    // Get swap quote
    const quote = await contractService.getSwapQuote(tokenIn, tokenOut, amountIn, fee);
    console.log('\nSwap Quote:');
    console.log('Expected AmountOut:', ethers.formatEther(quote.amountOut));
    console.log('Price:', quote.price);
    console.log('Price Impact:', quote.priceImpact + '%');

    // Calculate minimum amount out with slippage tolerance
    const amountOutMinimum = (BigInt(quote.amountOut) * BigInt(Math.floor((100 - slippageTolerance) * 100))) / BigInt(10000);

    console.log('\nExecuting Swap...');
    console.log('AmountOutMinimum (with slippage):', ethers.formatEther(amountOutMinimum));

    // Execute swap
    const swapResult = await contractService.executeSwap(
      tokenIn,
      tokenOut,
      amountIn,
      amountOutMinimum.toString(),
      recipientAddress,
      fee
    );

    console.log('Swap executed:', swapResult.transactionHash);

    // Get balances after swap
    const balancesAfter = {
      tokenIn: tokenInContract 
        ? await tokenInContract.balanceOf(recipientAddress)
        : await contractService.provider.getBalance(recipientAddress),
      tokenOut: tokenOutContract
        ? await tokenOutContract.balanceOf(recipientAddress)
        : await contractService.provider.getBalance(recipientAddress)
    };

    console.log('\nBalances After Swap:');
    console.log('TokenIn:', ethers.formatEther(balancesAfter.tokenIn));
    console.log('TokenOut:', ethers.formatEther(balancesAfter.tokenOut));

    // Calculate actual changes
    const actualAmountIn = balancesBefore.tokenIn - balancesAfter.tokenIn;
    const actualAmountOut = balancesAfter.tokenOut - balancesBefore.tokenOut;

    console.log('\nActual Changes:');
    console.log('TokenIn spent:', ethers.formatEther(actualAmountIn));
    console.log('TokenOut received:', ethers.formatEther(actualAmountOut));

    // Verify swap success
    const swapSuccess = actualAmountOut > 0n && actualAmountIn > 0n;
    
    console.log('\n=== Swap Test Result: ' + (swapSuccess ? 'SUCCESS ✓' : 'FAILED ✗') + ' ===\n');

    // Get token info
    const [tokenInInfo, tokenOutInfo] = await Promise.all([
      tokenInContract ? {
        symbol: await tokenInContract.symbol(),
        decimals: await tokenInContract.decimals()
      } : { symbol: 'ETH', decimals: 18 },
      tokenOutContract ? {
        symbol: await tokenOutContract.symbol(),
        decimals: await tokenOutContract.decimals()
      } : { symbol: 'ETH', decimals: 18 }
    ]);

    res.json({
      success: swapSuccess,
      data: {
        swap: {
          tokenIn: { address: tokenIn, ...tokenInInfo },
          tokenOut: { address: tokenOut, ...tokenOutInfo },
          amountIn: amountIn.toString(),
          expectedAmountOut: quote.amountOut,
          actualAmountOut: actualAmountOut.toString(),
          slippageTolerance: slippageTolerance + '%'
        },
        quote,
        balances: {
          before: {
            tokenIn: balancesBefore.tokenIn.toString(),
            tokenOut: balancesBefore.tokenOut.toString()
          },
          after: {
            tokenIn: balancesAfter.tokenIn.toString(),
            tokenOut: balancesAfter.tokenOut.toString()
          },
          changes: {
            tokenIn: actualAmountIn.toString(),
            tokenOut: actualAmountOut.toString()
          }
        },
        transaction: swapResult,
        verification: {
          swapExecuted: swapSuccess,
          balanceChanged: actualAmountOut > 0n,
          expectedVsActual: {
            expected: ethers.formatEther(quote.amountOut),
            actual: ethers.formatEther(actualAmountOut),
            difference: ethers.formatEther(BigInt(quote.amountOut) - actualAmountOut)
          }
        }
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('\n=== Swap Test FAILED ===');
    console.error('Error:', error.message);
    next(error);
  }
});

module.exports = router;
