const blockchainService = require('./blockchain.service');
const cacheService = require('./cache.service');
const logger = require('../config/logger');
const { ValidationError } = require('../middleware/errorHandler');

class TokenService {
  /**
   * Get token information
   */
  async getTokenInfo(address) {
    try {
      // Check cache
      const cacheKey = `token:${address}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Validate address
      if (!this.isValidAddress(address)) {
        throw new ValidationError('Invalid token address');
      }

      // Get token contract
      const tokenContract = blockchainService.getTokenContract(address);

      // Fetch token info
      const [name, symbol, decimals] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
      ]);

      const tokenInfo = {
        address,
        name,
        symbol,
        decimals: Number(decimals),
      };

      // Cache for 1 hour (token info doesn't change)
      await cacheService.set(cacheKey, tokenInfo, 3600);

      logger.info('Token info retrieved', { address, symbol });
      return tokenInfo;
    } catch (error) {
      logger.error('Failed to get token info', { address, error: error.message });
      throw error;
    }
  }

  /**
   * Get token balance for address
   */
  async getBalance(tokenAddress, ownerAddress) {
    try {
      // Validate addresses
      if (!this.isValidAddress(tokenAddress) || !this.isValidAddress(ownerAddress)) {
        throw new ValidationError('Invalid address');
      }

      // Get token contract
      const tokenContract = blockchainService.getTokenContract(tokenAddress);

      // Get balance and decimals
      const [balance, decimals, symbol] = await Promise.all([
        tokenContract.balanceOf(ownerAddress),
        tokenContract.decimals(),
        tokenContract.symbol(),
      ]);

      const result = {
        token: tokenAddress,
        owner: ownerAddress,
        balance: balance.toString(),
        decimals: Number(decimals),
        symbol,
        formatted: this.formatBalance(balance, decimals),
      };

      logger.info('Balance retrieved', { token: symbol, owner: ownerAddress });
      return result;
    } catch (error) {
      logger.error('Failed to get balance', { tokenAddress, ownerAddress, error: error.message });
      throw error;
    }
  }

  /**
   * Get token price (from pool)
   */
  async getTokenPrice(tokenAddress) {
    try {
      // TODO: Implement price fetching from pools
      // For now, return placeholder
      logger.info('Getting token price', { tokenAddress });

      return {
        token: tokenAddress,
        price: '0',
        priceUSD: '0',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get token price', { tokenAddress, error: error.message });
      throw error;
    }
  }

  /**
   * Format balance with decimals
   */
  formatBalance(balance, decimals) {
    const divisor = BigInt(10) ** BigInt(decimals);
    const wholePart = balance / divisor;
    const fractionalPart = balance % divisor;
    
    if (fractionalPart === 0n) {
      return wholePart.toString();
    }

    const fractionalStr = fractionalPart.toString().padStart(Number(decimals), '0');
    return `${wholePart}.${fractionalStr}`.replace(/\.?0+$/, '');
  }

  /**
   * Validate Ethereum address
   */
  isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

module.exports = new TokenService();
