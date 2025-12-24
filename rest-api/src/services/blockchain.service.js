const { ethers } = require('ethers');
const config = require('../config');
const logger = require('../config/logger');
const { BlockchainError } = require('../middleware/errorHandler');

// Contract ABIs - simplified essential methods
const POOL_MANAGER_ABI = [
  "function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
  "function getLiquidity(bytes32 poolId) external view returns (uint128)"
];

const SWAP_ROUTER_ABI = [
  "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)"
];

const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)"
];

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.initialized = false;
  }

  /**
   * Initialize blockchain connection
   */
  async initialize() {
    if (this.initialized) return;

    try {
      logger.info('Initializing blockchain connection', {
        rpcUrl: config.rpcUrl,
        chainId: config.chainId,
      });

      this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
      this.signer = new ethers.Wallet(config.privateKey, this.provider);

      // Verify connection
      const network = await this.provider.getNetwork();
      logger.info('Connected to network', { chainId: network.chainId });

      // Initialize contracts
      this.contracts.poolManager = new ethers.Contract(
        config.contracts.poolManager,
        POOL_MANAGER_ABI,
        this.signer
      );

      this.contracts.swapRouter = new ethers.Contract(
        config.contracts.swapRouter,
        SWAP_ROUTER_ABI,
        this.signer
      );

      this.initialized = true;
      logger.info('Blockchain service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize blockchain service', { error: error.message });
      throw new BlockchainError('Failed to connect to blockchain');
    }
  }

  /**
   * Get ERC20 token contract
   */
  getTokenContract(address) {
    return new ethers.Contract(address, ERC20_ABI, this.signer);
  }

  /**
   * Calculate pool ID from pool key
   */
  getPoolId(poolKey) {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'address', 'uint24', 'int24', 'address'],
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
    );
    return ethers.keccak256(encoded);
  }

  /**
   * Get pool state
   */
  async getPoolState(poolId) {
    try {
      const [slot0, liquidity] = await Promise.all([
        this.contracts.poolManager.getSlot0(poolId),
        this.contracts.poolManager.getLiquidity(poolId),
      ]);

      return {
        sqrtPriceX96: slot0.sqrtPriceX96.toString(),
        tick: slot0.tick,
        protocolFee: slot0.protocolFee,
        lpFee: slot0.lpFee,
        liquidity: liquidity.toString(),
      };
    } catch (error) {
      logger.error('Failed to get pool state', { poolId, error: error.message });
      throw new BlockchainError('Failed to fetch pool state');
    }
  }

  /**
   * Get tick spacing for fee tier
   */
  getTickSpacing(fee) {
    const feeToTickSpacing = {
      500: 10,
      3000: 60,
      10000: 200,
    };
    return feeToTickSpacing[fee] || 60;
  }

  /**
   * Sort token addresses (currency0 < currency1)
   */
  sortTokens(tokenA, tokenB) {
    return tokenA.toLowerCase() < tokenB.toLowerCase()
      ? [tokenA, tokenB]
      : [tokenB, tokenA];
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(contract, method, args, overrides = {}) {
    try {
      const gasEstimate = await contract[method].estimateGas(...args, overrides);
      // Add 20% buffer
      return (gasEstimate * 120n) / 100n;
    } catch (error) {
      logger.error('Gas estimation failed', { method, error: error.message });
      throw new BlockchainError('Failed to estimate gas');
    }
  }

  /**
   * Get current gas price with buffer
   */
  async getGasPrice() {
    try {
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || feeData.maxFeePerGas;
      // Add 10% buffer
      return (gasPrice * 110n) / 100n;
    } catch (error) {
      logger.error('Failed to get gas price', { error: error.message });
      throw new BlockchainError('Failed to fetch gas price');
    }
  }

  /**
   * Wait for transaction with timeout
   */
  async waitForTransaction(txHash, timeout = 60000) {
    try {
      logger.info('Waiting for transaction', { txHash });
      
      const receipt = await Promise.race([
        this.provider.waitForTransaction(txHash, 1),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Transaction timeout')), timeout)
        ),
      ]);

      if (receipt.status === 0) {
        throw new BlockchainError('Transaction failed');
      }

      logger.info('Transaction confirmed', {
        txHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      });

      return receipt;
    } catch (error) {
      logger.error('Transaction failed', { txHash, error: error.message });
      throw new BlockchainError(`Transaction failed: ${error.message}`);
    }
  }
}

// Export singleton instance
module.exports = new BlockchainService();
