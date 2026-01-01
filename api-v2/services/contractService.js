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
    'function transfer(address to, uint256 amount) returns (bool)',
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

  // Get a fresh wallet instance (avoids nonce caching issues)
  getFreshWallet() {
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    // Wrap wallet in NonceManager to automatically manage nonces
    return new ethers.NonceManager(wallet);
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

  // ============================================
  // PHASE 2 - TRADING FEATURES
  // ============================================

  async executeSwap({ poolKey, zeroForOne, amountSpecified, sqrtPriceLimitX96 }) {
    try {
      // Use fresh wallet with NonceManager
      const freshWallet = this.getFreshWallet();
      
      // PreFundedSwapRouter requires tokens transferred to router before swap
      const swapRouterAbi = [
        'function swap((address,address,uint24,int24,address), (bool,int256,uint160), address) external returns (int256)'
      ];
      const swapRouter = new ethers.Contract(
        process.env.SWAP_ROUTER_ADDRESS,
        swapRouterAbi,
        freshWallet
      );

      // Fix sqrtPriceLimitX96 if it's 0 or invalid
      // MIN_SQRT_PRICE = 4295128739
      // MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342
      if (!sqrtPriceLimitX96 || sqrtPriceLimitX96 === "0" || BigInt(sqrtPriceLimitX96) === 0n) {
        // Use reasonable limits based on swap direction
        sqrtPriceLimitX96 = zeroForOne 
          ? "4295128740"  // MIN_SQRT_PRICE + 1 (price goes down)
          : "1461446703485210103287273052203988822378723970341"; // MAX_SQRT_PRICE - 1 (price goes up)
      }

      const poolKeyTuple = [
        poolKey.currency0,
        poolKey.currency1,
        poolKey.fee,
        poolKey.tickSpacing,
        poolKey.hooks
      ];

      const swapParamsTuple = [
        zeroForOne,
        amountSpecified,
        sqrtPriceLimitX96
      ];

      // Determine input amount and transfer tokens to router
      // Negative amountSpecified = exactInput (we're selling this amount)
      // Positive amountSpecified = exactOutput (we need to estimate max input)
      const isExactInput = BigInt(amountSpecified) < 0n;
      const transferAmount = isExactInput 
        ? -BigInt(amountSpecified) * 11n / 10n  // Add 10% buffer for exactInput
        : BigInt(amountSpecified) * 15n / 10n; // Add 50% buffer for exactOutput
      
      // Transfer input token to router (pre-fund pattern)
      const inputCurrency = zeroForOne ? poolKey.currency0 : poolKey.currency1;
      const inputToken = new ethers.Contract(inputCurrency, ABIS.ERC20, freshWallet);
      
      const transferTx = await inputToken.transfer(process.env.SWAP_ROUTER_ADDRESS, transferAmount);
      await transferTx.wait();

      // Execute swap (router pulls tokens from itself, sends output to user)
      const recipientAddress = await freshWallet.getAddress();
      const tx = await swapRouter.swap(poolKeyTuple, swapParamsTuple, recipientAddress);
      const receipt = await tx.wait();
      const poolId = this.calculatePoolId(poolKeyTuple);

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: Number(receipt.gasUsed),
        poolId,
        inputAmountTransferred: transferAmount.toString(),
        note: 'Swap executed successfully'
      };
    } catch (error) {
      throw new Error(`Swap failed: ${error.message}`);
    }
  }

  async addLiquidity({ poolKey, tickLower, tickUpper, liquidityDelta, amount0Desired, amount1Desired }) {
    try {
      // Use a single fresh wallet for all transactions in this operation
      const freshWallet = this.getFreshWallet();
      
      const liquidityManagerAbi = [
        'function addLiquidity((address,address,uint24,int24,address) calldata key, int24 tickLower, int24 tickUpper, int256 liquidityDelta) external returns (int128, int128)'
      ];
      const liquidityManager = new ethers.Contract(
        process.env.LIQUIDITY_ROUTER_ADDRESS,
        liquidityManagerAbi,
        freshWallet
      );

      const poolKeyTuple = [
        poolKey.currency0,
        poolKey.currency1,
        poolKey.fee,
        poolKey.tickSpacing,
        poolKey.hooks
      ];

      // Transfer tokens to liquidity manager first (SimpleLiquidityManager requirement)
      const token0Contract = new ethers.Contract(
        poolKey.currency0,
        ABIS.ERC20,
        freshWallet
      );
      const token1Contract = new ethers.Contract(
        poolKey.currency1,
        ABIS.ERC20,
        freshWallet
      );

      // Use provided amounts or estimate based on liquidity delta
      const transferAmount0 = amount0Desired || liquidityDelta;
      const transferAmount1 = amount1Desired || liquidityDelta;

      // Transfer tokens to liquidity manager
      let transferTx = await token0Contract.transfer(process.env.LIQUIDITY_ROUTER_ADDRESS, transferAmount0);
      await transferTx.wait();
      
      transferTx = await token1Contract.transfer(process.env.LIQUIDITY_ROUTER_ADDRESS, transferAmount1);
      await transferTx.wait();

      // Now add liquidity
      const tx = await liquidityManager.addLiquidity(
        poolKeyTuple,
        tickLower,
        tickUpper,
        liquidityDelta
      );

      const receipt = await tx.wait();
      const poolId = this.calculatePoolId(poolKeyTuple);

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: Number(receipt.gasUsed),
        poolId,
        liquidityAdded: liquidityDelta,
        tickLower,
        tickUpper,
        amount0Transferred: transferAmount0.toString(),
        amount1Transferred: transferAmount1.toString()
      };
    } catch (error) {
      throw new Error(`Add liquidity failed: ${error.message}`);
    }
  }

  async removeLiquidity({ poolKey, tickLower, tickUpper, liquidityDelta }) {
    try {
      const liquidityManagerAbi = [
        'function removeLiquidity(address poolManager, (address,address,uint24,int24,address) calldata key, int24 tickLower, int24 tickUpper, uint256 liquidityDelta) external returns (uint256)'
      ];
      const liquidityManager = new ethers.Contract(
        process.env.LIQUIDITY_ROUTER_ADDRESS,
        liquidityManagerAbi,
        this.wallet
      );

      const poolKeyTuple = [
        poolKey.currency0,
        poolKey.currency1,
        poolKey.fee,
        poolKey.tickSpacing,
        poolKey.hooks
      ];

      const tx = await liquidityManager.removeLiquidity(
        process.env.POOL_MANAGER_ADDRESS,
        poolKeyTuple,
        tickLower,
        tickUpper,
        liquidityDelta
      );

      const receipt = await tx.wait();
      const poolId = this.calculatePoolId(poolKeyTuple);

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: Number(receipt.gasUsed),
        poolId,
        liquidityRemoved: liquidityDelta,
        tickLower,
        tickUpper
      };
    } catch (error) {
      throw new Error(`Remove liquidity failed: ${error.message}`);
    }
  }
}

module.exports = new ContractService();
