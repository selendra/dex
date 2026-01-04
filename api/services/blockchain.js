const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
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
      // Connect to localhost network explicitly
      const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
      
      // Get signer using private key from .env
      if (!process.env.PRIVATE_KEY) {
        throw new Error('PRIVATE_KEY not found in .env file');
      }
      this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      
      console.log('Connected to network with signer:', this.signer.address);
      
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
      
      // Load ABIs from artifacts
      const artifactsPath = path.join(__dirname, '../../artifacts/contracts');
      
      const poolManagerABI = JSON.parse(
        fs.readFileSync(path.join(artifactsPath, 'core/PoolManager.sol/PoolManager.json'), 'utf8')
      ).abi;
      
      const stateViewABI = JSON.parse(
        fs.readFileSync(path.join(artifactsPath, 'periphery/lens/StateView.sol/StateView.json'), 'utf8')
      ).abi;
      
      const liquidityManagerABI = JSON.parse(
        fs.readFileSync(path.join(artifactsPath, 'SimpleLiquidityManager.sol/SimpleLiquidityManager.json'), 'utf8')
      ).abi;
      
      const swapRouterABI = JSON.parse(
        fs.readFileSync(path.join(artifactsPath, 'WorkingSwapRouter.sol/WorkingSwapRouter.json'), 'utf8')
      ).abi;
      
      // Connect to contracts with signer
      this.poolManager = new ethers.Contract(poolManagerAddr, poolManagerABI, this.signer);
      this.stateView = new ethers.Contract(stateViewAddr, stateViewABI, this.signer);
      this.liquidityManager = new ethers.Contract(liquidityManagerAddr, liquidityManagerABI, this.signer);
      this.swapRouter = new ethers.Contract(swapRouterAddr, swapRouterABI, this.signer);
      
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
    throw new Error('Contract deployment should be done via Hardhat scripts (npm run deploy:local). This method requires Hardhat environment.');
  }

  async deployStateView(poolManagerAddr) {
    throw new Error('Contract deployment should be done via Hardhat scripts (npm run deploy:local). This method requires Hardhat environment.');
  }

  async deployLiquidityManager(poolManagerAddr) {
    throw new Error('Contract deployment should be done via Hardhat scripts (npm run deploy:local). This method requires Hardhat environment.');
  }

  async deploySwapRouter(poolManagerAddr) {
    throw new Error('Contract deployment should be done via Hardhat scripts (npm run deploy:local). This method requires Hardhat environment.');
  }

  async loadToken(tokenAddress) {
    if (!this.tokens[tokenAddress]) {
      const tokenABI = [
        'function balanceOf(address) view returns (uint256)',
        'function transfer(address to, uint256 amount) returns (bool)',
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)'
      ];
      this.tokens[tokenAddress] = new ethers.Contract(
        tokenAddress,
        tokenABI,
        this.signer
      );
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

  /**
   * Convert price ratio to sqrtPriceX96
   * @param {number} price - Price ratio (e.g., 1 for 1:1, 10 for 10:1, 0.1 for 1:10)
   * @returns {string} sqrtPriceX96 value
   */
  priceToSqrtPriceX96(price) {
    // sqrtPriceX96 = sqrt(price) * 2^96
    const Q96 = BigInt(2) ** BigInt(96);
    const sqrtPrice = Math.sqrt(price);
    // Convert to BigInt by multiplying with precision
    const sqrtPriceScaled = BigInt(Math.floor(sqrtPrice * 1e18));
    const sqrtPriceX96 = (sqrtPriceScaled * Q96) / BigInt(1e18);
    return sqrtPriceX96.toString();
  }

  async initializePool(token0Addr, token1Addr, priceRatio = null) {
    try {
      const poolKey = this.createPoolKey(token0Addr, token1Addr);
      
      // If priceRatio provided, convert to sqrtPriceX96, otherwise use 1:1
      let sqrtPriceX96;
      if (priceRatio !== null && priceRatio !== undefined) {
        sqrtPriceX96 = this.priceToSqrtPriceX96(priceRatio);
      } else {
        sqrtPriceX96 = this.SQRT_PRICE_1_1;
      }
      
      const tx = await this.poolManager.initialize(poolKey, sqrtPriceX96);
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        throw new Error('Pool initialization transaction reverted');
      }
      
      return { 
        poolKey, 
        txHash: tx.hash,
        priceRatio: priceRatio || 1,
        sqrtPriceX96 
      };
    } catch (error) {
      // Check for common pool initialization errors
      if (error.message.includes('PoolAlreadyInitialized') || 
          error.message.includes('already initialized') ||
          error.message.includes('ALREADY_INITIALIZED')) {
        throw new Error('Pool has already been initialized. Each pool can only be initialized once.');
      }
      
      throw error;
    }
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

  async executeSwap(tokenInAddr, tokenOutAddr, amountIn, minAmountOut = 0, userWallet = null) {
    const poolKey = this.createPoolKey(tokenInAddr, tokenOutAddr);
    const tokenIn = await this.loadToken(tokenInAddr);
    const swapRouterAddr = await this.swapRouter.getAddress();
    
    // Use provided wallet or default signer
    const wallet = userWallet || this.signer;
    
    // Connect token to user's wallet
    const tokenInWithSigner = tokenIn.connect(wallet);
    
    // Approve swap router to spend tokens
    const amount = ethers.parseEther(amountIn.toString());
    await tokenInWithSigner.approve(swapRouterAddr, amount);
    
    // Determine swap direction
    const zeroForOne = tokenInAddr.toLowerCase() === poolKey.currency0.toLowerCase();
    
    // Execute swap with user's wallet
    const swapParams = {
      zeroForOne,
      amountSpecified: -amount, // Negative = exact input
      sqrtPriceLimitX96: zeroForOne ? this.MIN_PRICE_LIMIT : this.MAX_PRICE_LIMIT
    };
    
    const swapRouterWithSigner = this.swapRouter.connect(wallet);
    const tx = await swapRouterWithSigner.swap(poolKey, swapParams);
    const receipt = await tx.wait();
    
    return {
      txHash: tx.hash,
      poolKey,
      amountIn: amountIn.toString(),
      zeroForOne,
      gasUsed: receipt.gasUsed.toString(),
      userAddress: wallet.address
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
    try {
      // Validate address format
      if (!ethers.isAddress(tokenAddr)) {
        throw new Error(`Invalid token address: ${tokenAddr}`);
      }
      if (accountAddr && !ethers.isAddress(accountAddr)) {
        throw new Error(`Invalid account address: ${accountAddr}`);
      }

      const token = await this.loadToken(tokenAddr);
      const account = accountAddr || this.signer.address;
      
      // Check if contract exists at address
      const code = await this.signer.provider.getCode(tokenAddr);
      if (code === '0x') {
        throw new Error(`No contract found at address: ${tokenAddr}`);
      }
      
      const balance = await token.balanceOf(account);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error(`Error getting token balance for ${tokenAddr}:`, error.message);
      throw error;
    }
  }

  async getNativeBalance(accountAddr = null) {
    try {
      if (accountAddr && !ethers.isAddress(accountAddr)) {
        throw new Error(`Invalid account address: ${accountAddr}`);
      }
      
      const account = accountAddr || this.signer.address;
      const balance = await this.signer.provider.getBalance(account);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error(`Error getting native balance for ${accountAddr}:`, error.message);
      throw error;
    }
  }

  async getUserBalances(accountAddr, tokenAddresses = []) {
    const balances = {
      native: await this.getNativeBalance(accountAddr),
      tokens: {}
    };

    for (const tokenAddr of tokenAddresses) {
      try {
        balances.tokens[tokenAddr] = await this.getTokenBalance(tokenAddr, accountAddr);
      } catch (error) {
        console.error(`Failed to get balance for token ${tokenAddr}:`, error.message);
        balances.tokens[tokenAddr] = '0'; // Default to 0 if token balance fails
      }
    }

    return balances;
  }
}

module.exports = new BlockchainService();
