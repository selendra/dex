const blockchainService = require('./blockchain.service');
const cacheService = require('./cache.service');
const logger = require('../config/logger');
const { ValidationError } = require('../middleware/errorHandler');

class PoolService {
  /**
   * List all pools with pagination
   */
  async listPools({ page = 1, limit = 20, sortBy = 'liquidity', order = 'desc' }) {
    try {
      // TODO: Implement pool listing from on-chain events or subgraph
      // For now, return empty list
      logger.info('Listing pools', { page, limit, sortBy, order });

      return {
        pools: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0,
        },
      };
    } catch (error) {
      logger.error('Failed to list pools', { error: error.message });
      throw error;
    }
  }

  /**
   * Get pool by token pair
   */
  async getPool({ tokenA, tokenB, fee = 3000 }) {
    try {
      // Check cache
      const cacheKey = `pool:${tokenA}:${tokenB}:${fee}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('Pool served from cache', { cacheKey });
        return cached;
      }

      // Validate addresses
      if (!this.isValidAddress(tokenA) || !this.isValidAddress(tokenB)) {
        throw new ValidationError('Invalid token address');
      }

      // Sort tokens
      const [currency0, currency1] = blockchainService.sortTokens(tokenA, tokenB);

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

      // Calculate price
      const price = this.calculatePrice(poolState.sqrtPriceX96);

      const pool = {
        poolId,
        tokenA: currency0,
        tokenB: currency1,
        fee: fee.toString(),
        tickSpacing: poolKey.tickSpacing,
        sqrtPriceX96: poolState.sqrtPriceX96,
        tick: poolState.tick,
        liquidity: poolState.liquidity,
        price: price.toFixed(6),
        token0Price: price.toFixed(6),
        token1Price: (1 / price).toFixed(6),
      };

      // Cache for 1 minute
      await cacheService.set(cacheKey, pool, 60);

      logger.info('Pool retrieved', { poolId });
      return pool;
    } catch (error) {
      logger.error('Failed to get pool', { error: error.message });
      throw error;
    }
  }

  /**
   * Get pool by ID
   */
  async getPoolById(poolId) {
    try {
      // Check cache
      const cacheKey = `pool:${poolId}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Get pool state
      const poolState = await blockchainService.getPoolState(poolId);

      const pool = {
        poolId,
        sqrtPriceX96: poolState.sqrtPriceX96,
        tick: poolState.tick,
        liquidity: poolState.liquidity,
        protocolFee: poolState.protocolFee,
        lpFee: poolState.lpFee,
        price: this.calculatePrice(poolState.sqrtPriceX96),
      };

      // Cache for 1 minute
      await cacheService.set(cacheKey, pool, 60);

      return pool;
    } catch (error) {
      logger.error('Failed to get pool by ID', { poolId, error: error.message });
      throw error;
    }
  }

  /**
   * Calculate price from sqrtPriceX96
   */
  calculatePrice(sqrtPriceX96) {
    const sqrtPrice = BigInt(sqrtPriceX96);
    const price = Number((sqrtPrice * sqrtPrice * 1000000n) >> 192n) / 1000000;
    return price;
  }

  /**
   * Validate Ethereum address
   */
  isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

module.exports = new PoolService();
