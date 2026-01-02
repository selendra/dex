const { ethers } = require('hardhat');
require('dotenv').config();

class BlockchainService {
  constructor() {
    this.poolManager = null;
    this.stateView = null;
    this.liquidityManager = null;
    this.swapRouter = null;
    this.tokens = {};
    this.signer = null;
    
    this.SQRT_PRICE_1_1 = "79228162514264337593543950336";
    this.MIN_TICK = -887220;
    this.MAX_TICK = 887220;
    this.FEE_MEDIUM = 3000;
    this.TICK_SPACING_MEDIUM = 60;
    
    // Price limits for swaps
    this.MIN_PRICE_LIMIT = "4295128740";
    this.MAX_PRICE_LIMIT = "1461446703485210103287273052203988822378723970342";
  }

  async initialize() {
    try {
      // Get signer (use first account)
      const [signer] = await ethers.getSigners();
      this.signer = signer;
      
      // Load deployed contract addresses from .env
      if (!process.env.POOL_MANAGER_ADDRESS || 
          !process.env.STATE_VIEW_ADDRESS || 
          !process.env.LIQUIDITY_MANAGER_ADDRESS || 
          !process.env.SWAP_ROUTER_ADDRESS) {
        throw new Error('Missing contract addresses in .env file. Please run: npm run deploy:local && npm run deploy:tokens');
      }
      
      const poolManagerAddr = process.env.POOL_MANAGER_ADDRESS;
      const stateViewAddr = process.env.STATE_VIEW_ADDRESS;
      const liquidityManagerAddr = process.env.LIQUIDITY_MANAGER_ADDRESS;
      const swapRouterAddr = process.env.SWAP_ROUTER_ADDRESS;
      
      // Connect to contracts
      this.poolManager = await ethers.getContractAt('PoolManager', poolManagerAddr);
      this.stateView = await ethers.getContractAt('StateView', stateViewAddr);
      this.liquidityManager = await ethers.getContractAt('SimpleLiquidityManager', liquidityManagerAddr);
      this.swapRouter = await ethers.getContractAt('WorkingSwapRouter', swapRouterAddr);
      
      console.log('✅ Blockchain service initialized');
      console.log('   PoolManager:', await this.poolManager.getAddress());
      console.log('   StateView:', await this.stateView.getAddress());
      console.log('   LiquidityManager:', await this.liquidityManager.getAddress());
      console.log('   SwapRouter:', await this.swapRouter.getAddress());
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  async deployPoolManager() {
    console.log('Deploying PoolManager...');
    const PoolManager = await ethers.getContractFactory('PoolManager');
    const poolManager = await PoolManager.deploy(this.signer.address);
    await poolManager.waitForDeployment();
    return await poolManager.getAddress();
  }

  async deployStateView(poolManagerAddr) {
    console.log('Deploying StateView...');
    const StateView = await ethers.getContractFactory('StateView');
    const stateView = await StateView.deploy(poolManagerAddr);
    await stateView.waitForDeployment();
    return await stateView.getAddress();
  }

  async deployLiquidityManager(poolManagerAddr) {
    console.log('Deploying SimpleLiquidityManager...');
    const SimpleLiquidityManager = await ethers.getContractFactory('SimpleLiquidityManager');
    const liquidityManager = await SimpleLiquidityManager.deploy(poolManagerAddr);
    await liquidityManager.waitForDeployment();
    return await liquidityManager.getAddress();
  }

  async deploySwapRouter(poolManagerAddr) {
    console.log('Deploying WorkingSwapRouter...');
    const WorkingSwapRouter = await ethers.getContractFactory('WorkingSwapRouter');
    const swapRouter = await WorkingSwapRouter.deploy(poolManagerAddr);
    await swapRouter.waitForDeployment();
    return await swapRouter.getAddress();
  }

  async loadToken(tokenAddress) {
    if (!this.tokens[tokenAddress]) {
      this.tokens[tokenAddress] = await ethers.getContractAt('TestToken', tokenAddress);
    }
    return this.tokens[tokenAddress];
  }

  sortTokens(token0Addr, token1Addr) {
    return token0Addr.toLowerCase() < token1Addr.toLowerCase()
      ? [token0Addr, token1Addr]
      : [token1Addr, token0Addr];
  }

  createPoolKey(token0Addr, token1Addr, fee = null, tickSpacing = null) {
    const [c0, c1] = this.sortTokens(token0Addr, token1Addr);
    return {
      currency0: c0,
      currency1: c1,
      fee: fee || this.FEE_MEDIUM,
      tickSpacing: tickSpacing || this.TICK_SPACING_MEDIUM,
      hooks: ethers.ZeroAddress
    };
  }

  calculatePoolId(poolKey) {
    return ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint24", "int24", "address"],
        [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
      )
    );
  }

  async initializePool(token0Addr, token1Addr, sqrtPriceX96 = null) {
    const poolKey = this.createPoolKey(token0Addr, token1Addr);
    const price = sqrtPriceX96 || this.SQRT_PRICE_1_1;
    
    const tx = await this.poolManager.initialize(poolKey, price);
    await tx.wait();
    
    return { poolKey, txHash: tx.hash };
  }

  async addLiquidity(token0Addr, token1Addr, amount0, amount1, tickLower = null, tickUpper = null) {
    const poolKey = this.createPoolKey(token0Addr, token1Addr);
    const lmAddr = await this.liquidityManager.getAddress();
    
    // Load tokens and transfer to liquidity manager
    const token0 = await this.loadToken(poolKey.currency0);
    const token1 = await this.loadToken(poolKey.currency1);
    
    await token0.transfer(lmAddr, ethers.parseEther(amount0.toString()));
    await token1.transfer(lmAddr, ethers.parseEther(amount1.toString()));
    
    // Add liquidity
    const liquidityDelta = ethers.parseEther("1000"); // Fixed liquidity amount
    const tx = await this.liquidityManager.addLiquidity(
      poolKey,
      tickLower || this.MIN_TICK,
      tickUpper || this.MAX_TICK,
      liquidityDelta
    );
    await tx.wait();
    
    return { poolKey, txHash: tx.hash, liquidityDelta: liquidityDelta.toString() };
  }

  async removeLiquidity(token0Addr, token1Addr, liquidityAmount, tickLower = null, tickUpper = null) {
    const poolKey = this.createPoolKey(token0Addr, token1Addr);
    
    // Negative liquidity delta means remove
    const liquidityDelta = -ethers.parseEther(liquidityAmount.toString());
    const tx = await this.liquidityManager.addLiquidity(
      poolKey,
      tickLower || this.MIN_TICK,
      tickUpper || this.MAX_TICK,
      liquidityDelta
    );
    await tx.wait();
    
    return { poolKey, txHash: tx.hash, liquidityRemoved: liquidityAmount.toString() };
  }

  async executeSwap(tokenInAddr, tokenOutAddr, amountIn, minAmountOut = 0) {
    const poolKey = this.createPoolKey(tokenInAddr, tokenOutAddr);
    const tokenIn = await this.loadToken(tokenInAddr);
    const swapRouterAddr = await this.swapRouter.getAddress();
    
    // Approve swap router to spend tokens
    const amount = ethers.parseEther(amountIn.toString());
    await tokenIn.approve(swapRouterAddr, amount);
    
    // Determine swap direction
    const zeroForOne = tokenInAddr.toLowerCase() === poolKey.currency0.toLowerCase();
    
    // Execute swap
    const swapParams = {
      zeroForOne,
      amountSpecified: -amount, // Negative = exact input
      sqrtPriceLimitX96: zeroForOne ? this.MIN_PRICE_LIMIT : this.MAX_PRICE_LIMIT
    };
    
    const tx = await this.swapRouter.swap(poolKey, swapParams);
    const receipt = await tx.wait();
    
    return {
      txHash: tx.hash,
      poolKey,
      amountIn: amountIn.toString(),
      zeroForOne,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  async getPoolInfo(token0Addr, token1Addr) {
    const poolKey = this.createPoolKey(token0Addr, token1Addr);
    const poolId = this.calculatePoolId(poolKey);
    
    // Get slot0 data (price, tick, etc)
    const slot0 = await this.stateView.getSlot0(poolId);
    
    // Get liquidity
    const liquidity = await this.stateView.getLiquidity(poolId);
    
    return {
      poolKey,
      poolId,
      sqrtPriceX96: slot0[0].toString(),
      tick: slot0[1].toString(),
      protocolFee: slot0[2].toString(),
      lpFee: slot0[3].toString(),
      liquidity: liquidity.toString()
    };
  }

  async getAllPoolsInfo(tokenAddresses) {
    const pools = [];
    
    // Get info for all unique pairs
    for (let i = 0; i < tokenAddresses.length; i++) {
      for (let j = i + 1; j < tokenAddresses.length; j++) {
        try {
          const info = await this.getPoolInfo(tokenAddresses[i], tokenAddresses[j]);
          if (BigInt(info.liquidity) > 0) {
            pools.push(info);
          }
        } catch (error) {
          // Pool doesn't exist or has no liquidity
          continue;
        }
      }
    }
    
    return pools;
  }

  async getTokenBalance(tokenAddr, accountAddr = null) {
    const token = await this.loadToken(tokenAddr);
    const account = accountAddr || this.signer.address;
    const balance = await token.balanceOf(account);
    return ethers.formatEther(balance);
  }
}

module.exports = new BlockchainService();
