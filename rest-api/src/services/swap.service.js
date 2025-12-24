const blockchainService = require('./blockchain.service');
const cacheService = require('./cache.service');
const logger = require('../config/logger');
const { ValidationError, BlockchainError } = require('../middleware/errorHandler');

class SwapService {
  /**
   * Get swap quote
   */
  async getQuote({ tokenIn, tokenOut, amountIn, fee = 3000 }) {
    try {
      // Check cache first
      const cacheKey = `quote:${tokenIn}:${tokenOut}:${amountIn}:${fee}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('Quote served from cache', { cacheKey });
        return cached;
      }

      // Validate addresses
      if (!this.isValidAddress(tokenIn) || !this.isValidAddress(tokenOut)) {
        throw new ValidationError('Invalid token address');
      }

      // Sort tokens
      const [currency0, currency1] = blockchainService.sortTokens(tokenIn, tokenOut);

      // Create pool key
      const poolKey = {
        currency0,
        currency1,
        fee,
        tickSpacing: blockchainService.getTickSpacing(fee),
        hooks: '0x0000000000000000000000000000000000000000',
      };

      // Get pool state
      const poolId = blockchainService.getPoolId(poolKey);
      const poolState = await blockchainService.getPoolState(poolId);

      // Calculate price from sqrtPriceX96
      const sqrtPrice = BigInt(poolState.sqrtPriceX96);
      const price = Number((sqrtPrice * sqrtPrice * 1000000n) >> 192n) / 1000000;

      // Calculate output amount (simplified - 0.3% fee)
      const isZeroForOne = tokenIn.toLowerCase() === currency0.toLowerCase();
      const feeMultiplier = 1 - fee / 1000000;
      
      let amountOut;
      if (isZeroForOne) {
        amountOut = BigInt(Math.floor(Number(amountIn) * price * feeMultiplier));
      } else {
        amountOut = BigInt(Math.floor(Number(amountIn) / price * feeMultiplier));
      }

      // Calculate price impact
      const liquidityValue = Number(poolState.liquidity);
      const priceImpact = liquidityValue > 0
        ? (Number(amountIn) / liquidityValue) * 100
        : 0;

      const quote = {
        tokenIn,
        tokenOut,
        amountIn: amountIn.toString(),
        amountOut: amountOut.toString(),
        price: price.toFixed(6),
        priceImpact: priceImpact.toFixed(4),
        fee: fee.toString(),
        poolId,
        route: [tokenIn, tokenOut],
      };

      // Cache for 30 seconds
      await cacheService.set(cacheKey, quote, 30);

      logger.info('Quote calculated', quote);
      return quote;
    } catch (error) {
      logger.error('Failed to get quote', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute swap
   */
  async executeSwap({ tokenIn, tokenOut, amountIn, amountOutMinimum, recipient, fee = 3000, deadline }, user) {
    try {
      logger.info('Executing swap', { tokenIn, tokenOut, amountIn, user: user?.address });

      // Validate inputs
      if (!this.isValidAddress(tokenIn) || !this.isValidAddress(tokenOut)) {
        throw new ValidationError('Invalid token address');
      }

      if (!this.isValidAddress(recipient)) {
        throw new ValidationError('Invalid recipient address');
      }

      if (BigInt(amountIn) <= 0) {
        throw new ValidationError('Amount must be greater than 0');
      }

      // Check token approval
      const tokenContract = blockchainService.getTokenContract(tokenIn);
      const allowance = await tokenContract.allowance(
        recipient,
        blockchainService.contracts.swapRouter.target
      );

      if (BigInt(allowance) < BigInt(amountIn)) {
        throw new ValidationError(
          `Insufficient token approval. Required: ${amountIn}, Current: ${allowance}`
        );
      }

      // Prepare swap params
      const params = {
        tokenIn,
        tokenOut,
        fee,
        recipient,
        amountIn: BigInt(amountIn),
        amountOutMinimum: BigInt(amountOutMinimum),
        sqrtPriceLimitX96: 0, // No price limit
      };

      // Estimate gas
      const gasLimit = await blockchainService.estimateGas(
        blockchainService.contracts.swapRouter,
        'exactInputSingle',
        [params],
        { value: tokenIn === '0x0000000000000000000000000000000000000000' ? amountIn : 0 }
      );

      // Execute swap
      const tx = await blockchainService.contracts.swapRouter.exactInputSingle(params, {
        gasLimit,
        value: tokenIn === '0x0000000000000000000000000000000000000000' ? amountIn : 0,
      });

      logger.info('Swap transaction submitted', { txHash: tx.hash });

      // Wait for confirmation
      const receipt = await blockchainService.waitForTransaction(tx.hash);

      const result = {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: 'success',
        tokenIn,
        tokenOut,
        amountIn: amountIn.toString(),
      };

      logger.info('Swap executed successfully', result);
      return result;
    } catch (error) {
      logger.error('Swap execution failed', { error: error.message });
      throw new BlockchainError(`Swap failed: ${error.message}`);
    }
  }

  /**
   * Find optimal swap route (multi-hop)
   */
  async findOptimalRoute({ tokenIn, tokenOut, amountIn }) {
    // TODO: Implement multi-hop routing logic
    // For now, return direct route
    return {
      route: [tokenIn, tokenOut],
      amountOut: '0',
      priceImpact: '0',
      fee: 3000,
    };
  }

  /**
   * Validate Ethereum address
   */
  isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

module.exports = new SwapService();
