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
    this.TICK_SPACING_MEDIUM = 1;  // V4 uses 1 for flexibility
    
    // Price limits for swaps (within valid range)
    // MIN_SQRT_PRICE = 4295128739 + 1
    // MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342 - 1
    this.MIN_PRICE_LIMIT = "4295128740";
    this.MAX_PRICE_LIMIT = "1461446703485210103287273052203988822378723970341";
  }

  async initialize() {
    try {
      // Connect to Selendra network
      const rpcUrl = process.env.SELENDRA_RPC_URL || 'https://rpc.selendra.org';
      const poolManagerAddr = process.env.SELENDRA_POOL_MANAGER_ADDRESS;
      const stateViewAddr = process.env.SELENDRA_STATE_VIEW_ADDRESS;
      const liquidityManagerAddr = process.env.SELENDRA_LIQUIDITY_MANAGER_ADDRESS;
      const swapRouterAddr = process.env.SELENDRA_SWAP_ROUTER_ADDRESS;
      console.log('🌐 Connecting to SELENDRA network...');
      
      // Connect to network
      const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
        staticNetwork: true,
        batchMaxCount: 1
      });
      
      // Get signer using private key from .env
      if (!process.env.PRIVATE_KEY) {
        throw new Error('PRIVATE_KEY not found in .env file');
      }
      this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      this.provider = provider;
      
      console.log('Connected to network with signer:', this.signer.address);
      
      // Load deployed contract addresses
      if (!poolManagerAddr || !stateViewAddr || !liquidityManagerAddr || !swapRouterAddr) {
        throw new Error('Missing Selendra contract addresses in .env file.');
      }
      
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
      
      console.log('✅ Blockchain service initialized (SELENDRA)');
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
    
    // Determine which token matches currency0/currency1 after sorting
    const [sortedToken0, sortedToken1] = this.sortTokens(token0Addr, token1Addr);
    
    // Map user-provided amounts to sorted token order
    let sortedAmount0, sortedAmount1;
    if (token0Addr.toLowerCase() === sortedToken0.toLowerCase()) {
      sortedAmount0 = amount0;
      sortedAmount1 = amount1;
    } else {
      sortedAmount0 = amount1;
      sortedAmount1 = amount0;
    }
    
    // Load tokens and transfer to liquidity manager
    const token0 = await this.loadToken(poolKey.currency0);
    const token1 = await this.loadToken(poolKey.currency1);
    
    // Parse amounts with extra buffer (2x) to account for liquidity calculation variance
    const amount0Wei = ethers.parseEther(sortedAmount0.toString());
    const amount1Wei = ethers.parseEther(sortedAmount1.toString());
    
    // Get fresh nonce for each transaction to avoid caching issues
    let nonce = await this.provider.getTransactionCount(this.signer.address, "pending");
    
    // Transfer tokens sequentially with explicit nonce
    const tx0 = await token0.transfer(lmAddr, amount0Wei, { nonce: nonce++ });
    await tx0.wait();
    
    const tx1 = await token1.transfer(lmAddr, amount1Wei, { nonce: nonce++ });
    await tx1.wait();
    
    // For Uniswap V4 full-range liquidity at 1:1 price:
    // liquidityDelta = min(amount0, amount1) 
    // This is a simplified calculation that ensures we don't request more 
    // liquidity than we have tokens for at the current price.
    // The actual tokens used will depend on the pool's current price.
    const amount0Num = parseFloat(sortedAmount0);
    const amount1Num = parseFloat(sortedAmount1);
    const liquidityAmount = Math.min(amount0Num, amount1Num);
    const liquidityDelta = ethers.parseEther(liquidityAmount.toString());
    
    const tx = await this.liquidityManager.addLiquidity(
      poolKey,
      tickLower || this.MIN_TICK,
      tickUpper || this.MAX_TICK,
      liquidityDelta,
      { nonce: nonce++ }
    );
    await tx.wait();
    
    return { 
      poolKey, 
      txHash: tx.hash, 
      liquidityDelta: liquidityDelta.toString(),
      amount0Deposited: sortedAmount0.toString(),
      amount1Deposited: sortedAmount1.toString()
    };
  }

  /**
   * Add liquidity using a specific user wallet (not the default .env signer)
   * This allows each user to add liquidity from their own wallet
   */
  async addLiquidityWithWallet(userWallet, token0Addr, token1Addr, amount0, amount1, tickLower = null, tickUpper = null) {
    const poolKey = this.createPoolKey(token0Addr, token1Addr);
    const lmAddr = await this.liquidityManager.getAddress();
    
    // Determine which token matches currency0/currency1 after sorting
    const [sortedToken0, sortedToken1] = this.sortTokens(token0Addr, token1Addr);
    
    // Map user-provided amounts to sorted token order
    let sortedAmount0, sortedAmount1;
    if (token0Addr.toLowerCase() === sortedToken0.toLowerCase()) {
      sortedAmount0 = amount0;
      sortedAmount1 = amount1;
    } else {
      sortedAmount0 = amount1;
      sortedAmount1 = amount0;
    }
    
    // ERC20 ABI for transfer
    const tokenABI = [
      'function balanceOf(address) view returns (uint256)',
      'function transfer(address to, uint256 amount) returns (bool)',
      'function approve(address spender, uint256 amount) returns (bool)',
      'function allowance(address owner, address spender) view returns (uint256)'
    ];
    
    // Connect tokens to user's wallet
    const token0 = new ethers.Contract(poolKey.currency0, tokenABI, userWallet);
    const token1 = new ethers.Contract(poolKey.currency1, tokenABI, userWallet);
    
    // Parse amounts
    const amount0Wei = ethers.parseEther(sortedAmount0.toString());
    const amount1Wei = ethers.parseEther(sortedAmount1.toString());
    
    // Check user has enough balance
    const balance0 = await token0.balanceOf(userWallet.address);
    const balance1 = await token1.balanceOf(userWallet.address);
    
    if (balance0 < amount0Wei) {
      const token0Symbol = sortedToken0 === poolKey.currency0 ? 'token0' : 'token1';
      throw new Error(`Insufficient ${token0Symbol} balance. Have: ${ethers.formatEther(balance0)}, Need: ${sortedAmount0}`);
    }
    if (balance1 < amount1Wei) {
      const token1Symbol = sortedToken1 === poolKey.currency1 ? 'token1' : 'token0';
      throw new Error(`Insufficient ${token1Symbol} balance. Have: ${ethers.formatEther(balance1)}, Need: ${sortedAmount1}`);
    }
    
    // Get fresh nonce for each transaction
    let nonce = await this.provider.getTransactionCount(userWallet.address, "pending");
    
    // Transfer tokens from user's wallet to liquidity manager
    console.log(`Transferring ${sortedAmount0} token0 from ${userWallet.address} to ${lmAddr}...`);
    const tx0 = await token0.transfer(lmAddr, amount0Wei, { nonce: nonce++ });
    await tx0.wait();
    
    console.log(`Transferring ${sortedAmount1} token1 from ${userWallet.address} to ${lmAddr}...`);
    const tx1 = await token1.transfer(lmAddr, amount1Wei, { nonce: nonce++ });
    await tx1.wait();
    
    // Calculate liquidity delta
    const amount0Num = parseFloat(sortedAmount0);
    const amount1Num = parseFloat(sortedAmount1);
    const liquidityAmount = Math.min(amount0Num, amount1Num);
    const liquidityDelta = ethers.parseEther(liquidityAmount.toString());
    
    // Call addLiquidity on the contract (uses default signer for contract call, but tokens came from user)
    const tx = await this.liquidityManager.addLiquidity(
      poolKey,
      tickLower || this.MIN_TICK,
      tickUpper || this.MAX_TICK,
      liquidityDelta
    );
    await tx.wait();
    
    return { 
      poolKey, 
      txHash: tx.hash, 
      liquidityDelta: liquidityDelta.toString(),
      amount0Deposited: sortedAmount0.toString(),
      amount1Deposited: sortedAmount1.toString(),
      fromWallet: userWallet.address
    };
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

  /**
   * Get swap quote - calculate expected output amount
   * @param {string} tokenInAddr - Input token address
   * @param {string} tokenOutAddr - Output token address  
   * @param {number} amountIn - Input amount
   * @returns {Object} Quote with estimated output and price impact
   */
  async getSwapQuote(tokenInAddr, tokenOutAddr, amountIn) {
    try {
      const poolKey = this.createPoolKey(tokenInAddr, tokenOutAddr);
      const poolId = this.calculatePoolId(poolKey);
      
      // Get pool state
      const slot0 = await this.stateView.getSlot0(poolId);
      const liquidity = await this.stateView.getLiquidity(poolId);
      
      const sqrtPriceX96 = BigInt(slot0[0]);
      const liquidityBN = BigInt(liquidity);
      
      if (liquidityBN === 0n) {
        throw new Error('Pool has no liquidity');
      }
      
      // Calculate price from sqrtPriceX96
      // price = (sqrtPriceX96 / 2^96)^2
      const Q96 = BigInt(2) ** BigInt(96);
      const priceX192 = sqrtPriceX96 * sqrtPriceX96;
      const price = Number(priceX192) / Number(Q96 * Q96);
      
      // Determine swap direction
      const zeroForOne = tokenInAddr.toLowerCase() === poolKey.currency0.toLowerCase();
      
      // Calculate expected output (simplified constant product formula)
      // For exact input: amountOut = amountIn * price (adjusted for direction)
      const amountInNum = parseFloat(amountIn);
      let estimatedAmountOut;
      
      if (zeroForOne) {
        // Selling token0 for token1: output = input * price
        estimatedAmountOut = amountInNum * price;
      } else {
        // Selling token1 for token0: output = input / price
        estimatedAmountOut = amountInNum / price;
      }
      
      // Apply fee (0.3% for medium fee tier)
      const feePercent = poolKey.fee / 1000000; // fee is in hundredths of a bip
      estimatedAmountOut = estimatedAmountOut * (1 - feePercent);
      
      // Calculate price impact (simplified)
      const liquidityNum = Number(ethers.formatEther(liquidity));
      const priceImpact = (amountInNum / liquidityNum) * 100; // Percentage
      
      return {
        tokenIn: tokenInAddr,
        tokenOut: tokenOutAddr,
        amountIn: amountIn.toString(),
        estimatedAmountOut: estimatedAmountOut.toFixed(18),
        price: zeroForOne ? price : 1/price,
        priceImpact: priceImpact.toFixed(4) + '%',
        fee: (feePercent * 100).toFixed(2) + '%',
        poolLiquidity: ethers.formatEther(liquidity)
      };
    } catch (error) {
      console.error('Error getting swap quote:', error.message);
      throw error;
    }
  }

  async executeSwap(tokenInAddr, tokenOutAddr, amountIn, minAmountOut = 0, userWallet = null) {
    const poolKey = this.createPoolKey(tokenInAddr, tokenOutAddr);
    const tokenIn = await this.loadToken(tokenInAddr);
    const tokenOut = await this.loadToken(tokenOutAddr);
    const swapRouterAddr = await this.swapRouter.getAddress();
    
    // Use provided wallet or default signer
    const wallet = userWallet || this.signer;
    
    // Connect token to user's wallet
    const tokenInWithSigner = tokenIn.connect(wallet);
    
    // Approve swap router to spend tokens
    const amount = ethers.parseEther(amountIn.toString());
    const approveTx = await tokenInWithSigner.approve(swapRouterAddr, amount);
    await approveTx.wait();
    
    // Determine swap direction
    const zeroForOne = tokenInAddr.toLowerCase() === poolKey.currency0.toLowerCase();
    
    // Execute swap with user's wallet
    const swapParams = {
      zeroForOne,
      amountSpecified: -amount, // Negative = exact input
      sqrtPriceLimitX96: zeroForOne ? this.MIN_PRICE_LIMIT : this.MAX_PRICE_LIMIT
    };
    
    // Get balance before swap to calculate actual output
    const tokenOutWithSigner = tokenOut.connect(wallet);
    const balanceBefore = await tokenOutWithSigner.balanceOf(wallet.address);
    
    // CRITICAL: Get fresh nonce directly from chain using RPC call
    const nonceHex = await this.provider.send("eth_getTransactionCount", [wallet.address, "latest"]);
    const swapNonce = parseInt(nonceHex, 16);
    
    const swapRouterWithSigner = this.swapRouter.connect(wallet);
    const tx = await swapRouterWithSigner.swap(poolKey, swapParams, { nonce: swapNonce });
    const receipt = await tx.wait();
    
    // Get balance after to calculate actual output
    const balanceAfter = await tokenOutWithSigner.balanceOf(wallet.address);
    const actualAmountOut = balanceAfter - balanceBefore;
    const actualAmountOutFormatted = ethers.formatEther(actualAmountOut);
    
    // Check slippage
    if (minAmountOut > 0 && parseFloat(actualAmountOutFormatted) < minAmountOut) {
      throw new Error(`Slippage exceeded: got ${actualAmountOutFormatted}, expected minimum ${minAmountOut}`);
    }
    
    return {
      txHash: tx.hash,
      poolKey,
      amountIn: amountIn.toString(),
      amountOut: actualAmountOutFormatted,
      minAmountOut: minAmountOut.toString(),
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
