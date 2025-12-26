const { ethers } = require('ethers');
require('dotenv').config();

// Minimal ABIs - only essential functions
const ABIS = {
  PoolManager: [
    'function initialize((address,address,uint24,int24,address), uint160) returns (int24)',
  ],
  StateView: [
    'function getSlot0(bytes32) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)',
    'function getLiquidity(bytes32) view returns (uint128)',
  ],
  ERC20: [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
  ],
  TestToken: [
    'constructor(string name, string symbol, uint256 initialSupply)',
  ],
};

class ContractService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    
    // Initialize contracts
    this.poolManager = new ethers.Contract(
      process.env.POOL_MANAGER_ADDRESS,
      ABIS.PoolManager,
      this.wallet
    );
    
    this.stateView = new ethers.Contract(
      process.env.STATE_VIEW_ADDRESS,
      ABIS.StateView,
      this.provider
    );
  }

  // ============================================================
  // POOL MANAGEMENT
  // ============================================================

  async initializePool(token0, token1, fee, sqrtPriceX96) {
    try {
      // Convert addresses to checksum format to avoid ethers.js errors
      const addr0 = ethers.getAddress(token0.toLowerCase());
      const addr1 = ethers.getAddress(token1.toLowerCase());
      
      // Sort tokens (currency0 < currency1)
      const [currency0, currency1] = addr0.toLowerCase() < addr1.toLowerCase()
        ? [addr0, addr1]
        : [addr1, addr0];

      const tickSpacing = this.getFeeTickSpacing(fee);
      const poolKey = [currency0, currency1, fee, tickSpacing, ethers.ZeroAddress];
      
      // Calculate poolId
      const poolId = this.calculatePoolId(poolKey);

      // Check if already initialized
      try {
        const slot0 = await this.stateView.getSlot0(poolId);
        if (slot0.sqrtPriceX96 !== 0n) {
          return {
            success: false,
            error: 'Pool already initialized',
            poolId,
            poolKey,
          };
        }
      } catch (e) {
        // Pool doesn't exist yet, continue
      }

      // Initialize pool
      const tx = await this.poolManager.initialize(poolKey, sqrtPriceX96);
      const receipt = await tx.wait();

      // Get slot0 after initialization
      const slot0 = await this.stateView.getSlot0(poolId);

      return {
        success: true,
        txHash: receipt.hash,
        poolId,
        poolKey: {
          currency0,
          currency1,
          fee,
          tickSpacing,
          hooks: ethers.ZeroAddress,
        },
        slot0: {
          sqrtPriceX96: slot0.sqrtPriceX96.toString(),
          tick: Number(slot0.tick),
          protocolFee: Number(slot0.protocolFee),
          lpFee: Number(slot0.lpFee),
        },
      };
    } catch (error) {
      throw new Error(`Failed to initialize pool: ${error.message}`);
    }
  }

  async getPoolInfo(poolId) {
    try {
      const slot0 = await this.stateView.getSlot0(poolId);
      const liquidity = await this.stateView.getLiquidity(poolId);

      if (slot0.sqrtPriceX96 === 0n) {
        throw new Error('Pool not initialized');
      }

      return {
        poolId,
        sqrtPriceX96: slot0.sqrtPriceX96.toString(),
        tick: Number(slot0.tick),
        protocolFee: Number(slot0.protocolFee),
        lpFee: Number(slot0.lpFee),
        liquidity: liquidity.toString(),
        price: this.sqrtPriceX96ToPrice(slot0.sqrtPriceX96),
      };
    } catch (error) {
      throw new Error(`Failed to get pool info: ${error.message}`);
    }
  }

  async getPoolPrice(poolId) {
    try {
      const slot0 = await this.stateView.getSlot0(poolId);
      
      if (slot0.sqrtPriceX96 === 0n) {
        throw new Error('Pool not initialized');
      }

      const price = this.sqrtPriceX96ToPrice(slot0.sqrtPriceX96);

      return {
        poolId,
        price,
        sqrtPriceX96: slot0.sqrtPriceX96.toString(),
        tick: Number(slot0.tick),
      };
    } catch (error) {
      throw new Error(`Failed to get pool price: ${error.message}`);
    }
  }

  // ============================================================
  // TOKEN MANAGEMENT
  // ============================================================

  async getTokenInfo(address) {
    try {
      const token = new ethers.Contract(address, ABIS.ERC20, this.provider);

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        token.name(),
        token.symbol(),
        token.decimals(),
        token.totalSupply(),
      ]);

      return {
        address,
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: ethers.formatUnits(totalSupply, decimals),
        totalSupplyRaw: totalSupply.toString(),
      };
    } catch (error) {
      throw new Error(`Failed to get token info: ${error.message}`);
    }
  }

  async approveToken(tokenAddress, spenderAddress, amount) {
    try {
      const token = new ethers.Contract(tokenAddress, ABIS.ERC20, this.wallet);
      
      const tx = await token.approve(spenderAddress, amount);
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.hash,
        tokenAddress,
        spenderAddress,
        amount: amount.toString(),
      };
    } catch (error) {
      throw new Error(`Failed to approve token: ${error.message}`);
    }
  }

  async getTokenBalance(tokenAddress, ownerAddress) {
    try {
      const token = new ethers.Contract(tokenAddress, ABIS.ERC20, this.provider);
      
      const balance = await token.balanceOf(ownerAddress);
      const decimals = await token.decimals();

      return {
        tokenAddress,
        ownerAddress,
        balance: balance.toString(),
        formatted: ethers.formatUnits(balance, decimals),
      };
    } catch (error) {
      throw new Error(`Failed to get token balance: ${error.message}`);
    }
  }

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================

  calculatePoolId(poolKey) {
    // poolKey can be array [currency0, currency1, fee, tickSpacing, hooks]
    // or object { currency0, currency1, fee, tickSpacing, hooks }
    let key;
    if (Array.isArray(poolKey)) {
      key = poolKey;
    } else {
      key = [
        poolKey.currency0,
        poolKey.currency1,
        poolKey.fee,
        poolKey.tickSpacing,
        poolKey.hooks,
      ];
    }

    return ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['tuple(address,address,uint24,int24,address)'],
        [key]
      )
    );
  }

  encodePoolKey(token0, token1, fee, tickSpacing = null, hooks = ethers.ZeroAddress) {
    // Convert addresses to checksum format
    const addr0 = ethers.getAddress(token0.toLowerCase());
    const addr1 = ethers.getAddress(token1.toLowerCase());
    
    // Sort tokens
    const [currency0, currency1] = addr0.toLowerCase() < addr1.toLowerCase()
      ? [addr0, addr1]
      : [addr1, addr0];

    // Auto-determine tickSpacing if not provided
    const spacing = tickSpacing || this.getFeeTickSpacing(fee);

    const poolKey = [currency0, currency1, fee, spacing, hooks];
    const poolId = this.calculatePoolId(poolKey);

    return {
      poolKey: {
        currency0,
        currency1,
        fee,
        tickSpacing: spacing,
        hooks,
      },
      poolKeyArray: poolKey,
      poolId,
    };
  }

  priceToSqrtPriceX96(price) {
    // sqrtPriceX96 = sqrt(price) * 2^96
    const sqrt = Math.sqrt(price);
    const Q96 = 2n ** 96n;
    return BigInt(Math.floor(sqrt * Number(Q96)));
  }

  sqrtPriceX96ToPrice(sqrtPriceX96) {
    // price = (sqrtPriceX96 / 2^96)^2
    const Q96 = 2n ** 96n;
    const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
    return sqrtPrice * sqrtPrice;
  }

  getFeeTickSpacing(fee) {
    const spacings = {
      500: 10,
      3000: 60,
      10000: 200,
    };
    return spacings[fee] || 60;
  }

  // Get current block number
  async getBlockNumber() {
    return await this.provider.getBlockNumber();
  }

  // Get network info
  async getNetwork() {
    return await this.provider.getNetwork();
  }
}

module.exports = new ContractService();
