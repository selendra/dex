const swapService = require('./swap.service');
const poolService = require('./pool.service');
const cacheService = require('./cache.service');
const logger = require('../config/logger');

class PriceService {
  /**
   * Get swap quote (price calculation)
   */
  async getQuote({ tokenIn, tokenOut, amountIn, fee = 3000 }) {
    try {
      // Delegate to swap service for quote calculation
      return await swapService.getQuote({ tokenIn, tokenOut, amountIn, fee });
    } catch (error) {
      logger.error('Failed to get price quote', { error: error.message });
      throw error;
    }
  }

  /**
   * Get pool price information
   */
  async getPoolPrice({ tokenA, tokenB, fee = 3000 }) {
    try {
      // Check cache
      const cacheKey = `price:${tokenA}:${tokenB}:${fee}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Get pool data
      const pool = await poolService.getPool({ tokenA, tokenB, fee });

      const priceInfo = {
        tokenA,
        tokenB,
        fee: fee.toString(),
        price: pool.token0Price,
        inversePrice: pool.token1Price,
        liquidity: pool.liquidity,
        tick: pool.tick,
        sqrtPriceX96: pool.sqrtPriceX96,
      };

      // Cache for 30 seconds
      await cacheService.set(cacheKey, priceInfo, 30);

      logger.info('Pool price retrieved', { tokenA, tokenB, fee });
      return priceInfo;
    } catch (error) {
      logger.error('Failed to get pool price', { error: error.message });
      throw error;
    }
  }
}

module.exports = new PriceService();
