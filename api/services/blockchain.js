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
    this.priceOracle = null;
    this.tokens = {};
    this.signer = null;
    
    this.SQRT_PRICE_1_1 = "79228162514264337593543950336";
    this.MIN_TICK = -887220;
    this.MAX_TICK = 887220;
    this.FEE_MEDIUM = 3000;
    this.TICK_SPACING_MEDIUM = 60;  // Standard for 0.3% fee tier
    
    // Fee tier to tick spacing mapping (Uniswap V4 standard)
    this.FEE_TICK_SPACING = {
      100: 1,     // 0.01% fee -> tick spacing 1
      500: 10,    // 0.05% fee -> tick spacing 10
      3000: 60,   // 0.30% fee -> tick spacing 60
      10000: 200  // 1.00% fee -> tick spacing 200
    };
    
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
      const priceOracleAddr = process.env.SELENDRA_PRICE_ORACLE_ADDRESS;
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
        fs.readFileSync(path.join(artifactsPath, 'LiquidityManager.sol/LiquidityManager.json'), 'utf8')
      ).abi;
      
      const swapRouterABI = JSON.parse(
        fs.readFileSync(path.join(artifactsPath, 'SwapRouter.sol/SwapRouter.json'), 'utf8')
      ).abi;
      
      // Connect to contracts with signer
      this.poolManager = new ethers.Contract(poolManagerAddr, poolManagerABI, this.signer);
      this.stateView = new ethers.Contract(stateViewAddr, stateViewABI, this.signer);
      this.liquidityManager = new ethers.Contract(liquidityManagerAddr, liquidityManagerABI, this.signer);
      this.swapRouter = new ethers.Contract(swapRouterAddr, swapRouterABI, this.signer);
      
      // Load PriceOracle if available
      if (priceOracleAddr) {
        const priceOracleABI = JSON.parse(
          fs.readFileSync(path.join(artifactsPath, 'PriceOracle.sol/PriceOracle.json'), 'utf8')
        ).abi;
        this.priceOracle = new ethers.Contract(priceOracleAddr, priceOracleABI, this.signer);
        console.log('   PriceOracle:', await this.priceOracle.getAddress());
      }
      
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

  /**
   * Create a wallet from private key
   * @param {string} privateKey - The private key (with or without 0x prefix)
   * @returns {ethers.Wallet} Connected wallet
   */
  createWalletFromPrivateKey(privateKey) {
    if (!privateKey) {
      throw new Error('Private key is required');
    }
    // Ensure private key has 0x prefix
    const pk = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    return new ethers.Wallet(pk, this.provider);
  }

  /**
   * Get address from private key without creating full wallet
   * @param {string} privateKey - The private key
   * @returns {string} The wallet address
   */
  getAddressFromPrivateKey(privateKey) {
    const wallet = this.createWalletFromPrivateKey(privateKey);
    return wallet.address;
  }

  async loadToken(tokenAddress) {
    if (!this.tokens[tokenAddress]) {
      const tokenABI = [
        // View functions
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function totalSupply() view returns (uint256)',
        'function balanceOf(address) view returns (uint256)',
        'function allowance(address owner, address spender) view returns (uint256)',
        // State-changing functions
        'function transfer(address to, uint256 amount) returns (bool)',
        'function approve(address spender, uint256 amount) returns (bool)',
        'function transferFrom(address from, address to, uint256 amount) returns (bool)',
        // TestToken specific functions
        'function mint(address to, uint256 amount)',
        'function burn(uint256 amount)',
        'function burnFrom(address account, uint256 amount)'
      ];
      this.tokens[tokenAddress] = new ethers.Contract(
        tokenAddress,
        tokenABI,
        this.signer
      );
    }
    return this.tokens[tokenAddress];
  }

  /**
   * Load token with a specific wallet (for user operations)
   */
  loadTokenWithWallet(tokenAddress, wallet) {
    const tokenABI = [
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)',
      'function totalSupply() view returns (uint256)',
      'function balanceOf(address) view returns (uint256)',
      'function allowance(address owner, address spender) view returns (uint256)',
      'function transfer(address to, uint256 amount) returns (bool)',
      'function approve(address spender, uint256 amount) returns (bool)',
      'function transferFrom(address from, address to, uint256 amount) returns (bool)',
      'function mint(address to, uint256 amount)',
      'function burn(uint256 amount)',
      'function burnFrom(address account, uint256 amount)'
    ];
    return new ethers.Contract(tokenAddress, tokenABI, wallet);
  }

  /**
   * Get token metadata (name, symbol, decimals, totalSupply)
   */
  async getTokenInfo(tokenAddress) {
    const token = await this.loadToken(tokenAddress);
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply()
    ]);
    return {
      address: tokenAddress,
      name,
      symbol,
      decimals: Number(decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals)
    };
  }

  /**
   * Transfer tokens from user's wallet
   */
  async transferToken(userWallet, tokenAddress, toAddress, amount) {
    const token = this.loadTokenWithWallet(tokenAddress, userWallet);
    const decimals = await token.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);
    
    const tx = await token.transfer(toAddress, amountWei);
    const receipt = await tx.wait();
    
    return {
      txHash: tx.hash,
      from: userWallet.address,
      to: toAddress,
      amount: amount.toString(),
      tokenAddress,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Approve spender to spend tokens
   */
  async approveToken(userWallet, tokenAddress, spenderAddress, amount) {
    const token = this.loadTokenWithWallet(tokenAddress, userWallet);
    const decimals = await token.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);
    
    const tx = await token.approve(spenderAddress, amountWei);
    const receipt = await tx.wait();
    
    return {
      txHash: tx.hash,
      owner: userWallet.address,
      spender: spenderAddress,
      amount: amount.toString(),
      tokenAddress,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Get allowance
   */
  async getAllowance(tokenAddress, ownerAddress, spenderAddress) {
    const token = await this.loadToken(tokenAddress);
    const decimals = await token.decimals();
    const allowance = await token.allowance(ownerAddress, spenderAddress);
    return {
      tokenAddress,
      owner: ownerAddress,
      spender: spenderAddress,
      allowance: ethers.formatUnits(allowance, decimals)
    };
  }

  /**
   * Transfer tokens from another address (requires allowance)
   */
  async transferFromToken(userWallet, tokenAddress, fromAddress, toAddress, amount) {
    const token = this.loadTokenWithWallet(tokenAddress, userWallet);
    const decimals = await token.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);
    
    const tx = await token.transferFrom(fromAddress, toAddress, amountWei);
    const receipt = await tx.wait();
    
    return {
      txHash: tx.hash,
      from: fromAddress,
      to: toAddress,
      amount: amount.toString(),
      tokenAddress,
      caller: userWallet.address,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Burn tokens from user's own balance
   */
  async burnToken(userWallet, tokenAddress, amount) {
    const token = this.loadTokenWithWallet(tokenAddress, userWallet);
    const decimals = await token.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);
    
    // Check balance first
    const balance = await token.balanceOf(userWallet.address);
    if (balance < amountWei) {
      throw new Error(`Insufficient balance. Have: ${ethers.formatUnits(balance, decimals)}, Need: ${amount}`);
    }
    
    const tx = await token.burn(amountWei);
    const receipt = await tx.wait();
    
    const newBalance = await token.balanceOf(userWallet.address);
    
    return {
      txHash: tx.hash,
      burner: userWallet.address,
      amount: amount.toString(),
      tokenAddress,
      newBalance: ethers.formatUnits(newBalance, decimals),
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Burn tokens from another address (requires allowance)
   */
  async burnFromToken(userWallet, tokenAddress, fromAddress, amount) {
    const token = this.loadTokenWithWallet(tokenAddress, userWallet);
    const decimals = await token.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);
    
    const tx = await token.burnFrom(fromAddress, amountWei);
    const receipt = await tx.wait();
    
    return {
      txHash: tx.hash,
      from: fromAddress,
      caller: userWallet.address,
      amount: amount.toString(),
      tokenAddress,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Mint tokens (TestToken specific - no access control)
   */
  async mintToken(userWallet, tokenAddress, toAddress, amount) {
    const token = this.loadTokenWithWallet(tokenAddress, userWallet);
    const decimals = await token.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);
    
    const tx = await token.mint(toAddress, amountWei);
    const receipt = await tx.wait();
    
    const newBalance = await token.balanceOf(toAddress);
    
    return {
      txHash: tx.hash,
      to: toAddress,
      amount: amount.toString(),
      tokenAddress,
      newBalance: ethers.formatUnits(newBalance, decimals),
      gasUsed: receipt.gasUsed.toString()
    };
  }

  sortTokens(token0Addr, token1Addr) {
    return token0Addr.toLowerCase() < token1Addr.toLowerCase()
      ? [token0Addr, token1Addr]
      : [token1Addr, token0Addr];
  }

  /**
   * Get tick spacing for a fee tier
   * @param {number} fee - Fee in basis points (100, 500, 3000, 10000)
   * @returns {number} Tick spacing
   */
  getTickSpacingForFee(fee) {
    return this.FEE_TICK_SPACING[fee] || this.TICK_SPACING_MEDIUM;
  }

  createPoolKey(token0Addr, token1Addr, fee = null, tickSpacing = null) {
    const [c0, c1] = this.sortTokens(token0Addr, token1Addr);
    const poolFee = fee || this.FEE_MEDIUM;
    return {
      currency0: c0,
      currency1: c1,
      fee: poolFee,
      tickSpacing: tickSpacing || this.getTickSpacingForFee(poolFee),
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

  /**
   * Initialize pool with user's wallet (user pays gas)
   * Uses LiquidityManager for admin-controlled pool initialization
   */
  async initializePoolWithWallet(userWallet, token0Addr, token1Addr, priceRatio = null) {
    try {
      const poolKey = this.createPoolKey(token0Addr, token1Addr);
      
      // If priceRatio provided, convert to sqrtPriceX96, otherwise use 1:1
      let sqrtPriceX96;
      if (priceRatio !== null && priceRatio !== undefined) {
        sqrtPriceX96 = this.priceToSqrtPriceX96(priceRatio);
      } else {
        sqrtPriceX96 = this.SQRT_PRICE_1_1;
      }
      
      // Connect LiquidityManager with user's wallet for admin-controlled initialization
      const liquidityManagerWithWallet = this.liquidityManager.connect(userWallet);
      
      const tx = await liquidityManagerWithWallet.initializePool(poolKey, sqrtPriceX96);
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        throw new Error('Pool initialization transaction reverted');
      }
      
      return { 
        poolKey, 
        txHash: tx.hash,
        priceRatio: priceRatio || 1,
        sqrtPriceX96,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      // Check for common pool initialization errors
      if (error.message.includes('PoolAlreadyInitialized') || 
          error.message.includes('already initialized') ||
          error.message.includes('ALREADY_INITIALIZED')) {
        throw new Error('Pool has already been initialized. Each pool can only be initialized once.');
      }
      
      // Check for admin authorization errors
      if (error.message.includes('NotAuthorized') || 
          error.message.includes('NotAdmin')) {
        throw new Error('Not authorized to initialize pools. Only admin or authorized addresses can initialize pools.');
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

  // ========== Admin Functions for LiquidityManager ==========

  /**
   * Set authorized initializer (admin only)
   */
  async setAuthorizedInitializer(adminPrivateKey, account, authorized) {
    const adminWallet = this.createWalletFromPrivateKey(adminPrivateKey);
    const liquidityManagerWithAdmin = this.liquidityManager.connect(adminWallet);
    
    const tx = await liquidityManagerWithAdmin.setAuthorizedInitializer(account, authorized);
    const receipt = await tx.wait();
    
    return {
      txHash: tx.hash,
      account,
      authorized,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Check if an address is authorized to initialize pools
   */
  async isAuthorizedInitializer(account) {
    const isAuthorized = await this.liquidityManager.authorizedInitializers(account);
    return isAuthorized;
  }

  /**
   * Get current pool admin address
   */
  async getPoolAdmin() {
    const admin = await this.liquidityManager.admin();
    return admin;
  }

  /**
   * Transfer pool admin role (admin only)
   */
  async transferPoolAdmin(adminPrivateKey, newAdmin) {
    const adminWallet = this.createWalletFromPrivateKey(adminPrivateKey);
    const liquidityManagerWithAdmin = this.liquidityManager.connect(adminWallet);
    
    const oldAdmin = await this.liquidityManager.admin();
    const tx = await liquidityManagerWithAdmin.setAdmin(newAdmin);
    const receipt = await tx.wait();
    
    return {
      txHash: tx.hash,
      oldAdmin,
      newAdmin,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  // ========== Admin Functions for SwapRouter ==========

  /**
   * Pause swaps (admin only)
   */
  async pauseSwaps(adminPrivateKey) {
    const adminWallet = this.createWalletFromPrivateKey(adminPrivateKey);
    const swapRouterWithAdmin = this.swapRouter.connect(adminWallet);
    
    const tx = await swapRouterWithAdmin.pause();
    const receipt = await tx.wait();
    
    return {
      txHash: tx.hash,
      paused: true,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Unpause swaps (admin only)
   */
  async unpauseSwaps(adminPrivateKey) {
    const adminWallet = this.createWalletFromPrivateKey(adminPrivateKey);
    const swapRouterWithAdmin = this.swapRouter.connect(adminWallet);
    
    const tx = await swapRouterWithAdmin.unpause();
    const receipt = await tx.wait();
    
    return {
      txHash: tx.hash,
      paused: false,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Check if swaps are paused
   */
  async isSwapsPaused() {
    const paused = await this.swapRouter.paused();
    return paused;
  }

  /**
   * Get swap router admin
   */
  async getSwapAdmin() {
    const admin = await this.swapRouter.admin();
    return admin;
  }

  /**
   * Transfer swap router admin role
   */
  async transferSwapAdmin(adminPrivateKey, newAdmin) {
    const adminWallet = this.createWalletFromPrivateKey(adminPrivateKey);
    const swapRouterWithAdmin = this.swapRouter.connect(adminWallet);
    
    const oldAdmin = await this.swapRouter.admin();
    const tx = await swapRouterWithAdmin.setAdmin(newAdmin);
    const receipt = await tx.wait();
    
    return {
      txHash: tx.hash,
      oldAdmin,
      newAdmin,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  // ============================================================
  // PRICE ORACLE FUNCTIONS
  // ============================================================

  /**
   * Get price for a token pair (from pool or external feed)
   */
  async getPrice(token0, token1) {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }
    
    const priceInfo = await this.priceOracle.getPrice(token0, token1);
    
    return {
      price: ethers.formatUnits(priceInfo.price, 18),
      twap: ethers.formatUnits(priceInfo.twap, 18),
      lastUpdate: priceInfo.lastUpdate.toString(),
      fromPool: priceInfo.fromPool,
      isStale: priceInfo.isStale
    };
  }

  /**
   * Get price from on-chain pool only
   */
  async getPoolPrice(token0, token1) {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }
    
    const [price, sqrtPriceX96] = await this.priceOracle.getPoolPrice(token0, token1);
    
    return {
      price: ethers.formatUnits(price, 18),
      sqrtPriceX96: sqrtPriceX96.toString()
    };
  }

  /**
   * Get external price feed only
   */
  async getExternalPrice(token0, token1) {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }
    
    const priceData = await this.priceOracle.getExternalPrice(token0, token1);
    
    return {
      price: ethers.formatUnits(priceData.price, 18),
      timestamp: priceData.timestamp.toString(),
      isValid: priceData.isValid
    };
  }

  /**
   * Get TWAP for a token pair
   */
  async getTWAP(token0, token1) {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }
    
    const twap = await this.priceOracle.getTWAP(token0, token1);
    
    return {
      twap: ethers.formatUnits(twap, 18)
    };
  }

  /**
   * Feed price for a token pair (admin/authorized feeder only)
   */
  async feedPrice(feederPrivateKey, token0, token1, price) {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }
    
    const feederWallet = this.createWalletFromPrivateKey(feederPrivateKey);
    const oracleWithFeeder = this.priceOracle.connect(feederWallet);
    
    // Price should already be in 18 decimal format (wei)
    // If it's a string number, use it directly; if it's a decimal, convert
    let priceWei;
    if (price.toString().includes('.')) {
      // Human-readable format like "3.5" - convert to 18 decimals
      priceWei = ethers.parseUnits(price.toString(), 18);
    } else {
      // Already in wei format (18 decimals)
      priceWei = BigInt(price);
    }
    
    const tx = await oracleWithFeeder.feedPrice(token0, token1, priceWei);
    const receipt = await tx.wait();
    
    return {
      txHash: tx.hash,
      token0,
      token1,
      price: priceWei.toString(),
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Feed multiple prices at once (admin/authorized feeder only)
   */
  async feedPricesBatch(feederPrivateKey, pairs) {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }
    
    const feederWallet = this.createWalletFromPrivateKey(feederPrivateKey);
    const oracleWithFeeder = this.priceOracle.connect(feederWallet);
    
    const token0s = pairs.map(p => p.token0);
    const token1s = pairs.map(p => p.token1);
    const prices = pairs.map(p => {
      const price = p.price.toString();
      if (price.includes('.')) {
        return ethers.parseUnits(price, 18);
      }
      return BigInt(price);
    });
    
    const tx = await oracleWithFeeder.feedPricesBatch(token0s, token1s, prices);
    const receipt = await tx.wait();
    
    return {
      txHash: tx.hash,
      pairsUpdated: pairs.length,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Observe current pool price (updates TWAP)
   */
  async observePoolPrice(token0, token1, privateKey) {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }
    
    const wallet = this.createWalletFromPrivateKey(privateKey);
    const oracleWithWallet = this.priceOracle.connect(wallet);
    
    const tx = await oracleWithWallet.observePoolPrice(token0, token1);
    const receipt = await tx.wait();
    
    return {
      txHash: tx.hash,
      token0,
      token1,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Get observation count for a pair
   */
  async getObservationCount(token0, token1) {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }
    
    const count = await this.priceOracle.getObservationCount(token0, token1);
    
    return {
      count: count.toString()
    };
  }

  /**
   * Check if an address is an authorized price feeder
   */
  async isAuthorizedFeeder(account) {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }
    
    const isAuthorized = await this.priceOracle.authorizedFeeders(account);
    
    return isAuthorized;
  }

  /**
   * Set authorized price feeder (admin only)
   */
  async setAuthorizedFeeder(adminPrivateKey, account, authorized) {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }
    
    const adminWallet = this.createWalletFromPrivateKey(adminPrivateKey);
    const oracleWithAdmin = this.priceOracle.connect(adminWallet);
    
    const tx = await oracleWithAdmin.setAuthorizedFeeder(account, authorized);
    const receipt = await tx.wait();
    
    return {
      txHash: tx.hash,
      account,
      authorized,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Get oracle admin address
   */
  async getOracleAdmin() {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }
    
    const admin = await this.priceOracle.admin();
    return admin;
  }

  /**
   * Transfer oracle admin role
   */
  async transferOracleAdmin(adminPrivateKey, newAdmin) {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }
    
    const adminWallet = this.createWalletFromPrivateKey(adminPrivateKey);
    const oracleWithAdmin = this.priceOracle.connect(adminWallet);
    
    const oldAdmin = await this.priceOracle.admin();
    const tx = await oracleWithAdmin.setAdmin(newAdmin);
    const receipt = await tx.wait();
    
    return {
      txHash: tx.hash,
      oldAdmin,
      newAdmin,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Get oracle configuration
   */
  async getOracleConfig() {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }
    
    const [defaultFee, defaultTickSpacing, maxPriceAge, twapWindow, admin] = await Promise.all([
      this.priceOracle.defaultFee(),
      this.priceOracle.defaultTickSpacing(),
      this.priceOracle.MAX_PRICE_AGE(),
      this.priceOracle.TWAP_WINDOW(),
      this.priceOracle.admin()
    ]);
    
    return {
      defaultFee: defaultFee.toString(),
      defaultTickSpacing: defaultTickSpacing.toString(),
      maxPriceAge: maxPriceAge.toString(),
      twapWindow: twapWindow.toString(),
      admin
    };
  }

  /**
   * Set default fee for pool lookups (admin only)
   */
  async setDefaultFee(adminPrivateKey, fee) {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }
    
    const adminWallet = this.createWalletFromPrivateKey(adminPrivateKey);
    const oracleWithAdmin = this.priceOracle.connect(adminWallet);
    
    const tx = await oracleWithAdmin.setDefaultFee(fee);
    const receipt = await tx.wait();
    
    return {
      txHash: tx.hash,
      fee,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Set default tick spacing for pool lookups (admin only)
   */
  async setDefaultTickSpacing(adminPrivateKey, tickSpacing) {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }
    
    const adminWallet = this.createWalletFromPrivateKey(adminPrivateKey);
    const oracleWithAdmin = this.priceOracle.connect(adminWallet);
    
    const tx = await oracleWithAdmin.setDefaultTickSpacing(tickSpacing);
    const receipt = await tx.wait();
    
    return {
      txHash: tx.hash,
      tickSpacing,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Invalidate external price feed (admin/authorized only)
   */
  async invalidatePrice(feederPrivateKey, token0, token1) {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }
    
    const feederWallet = this.createWalletFromPrivateKey(feederPrivateKey);
    const oracleWithFeeder = this.priceOracle.connect(feederWallet);
    
    const tx = await oracleWithFeeder.invalidatePrice(token0, token1);
    const receipt = await tx.wait();
    
    return {
      txHash: tx.hash,
      token0,
      token1,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  // ========== Protocol Fee Management (PoolManager Owner Functions) ==========

  /**
   * Get protocol fee controller address
   */
  async getProtocolFeeController() {
    const controller = await this.poolManager.protocolFeeController();
    const owner = await this.poolManager.owner();
    return {
      protocolFeeController: controller,
      poolManagerOwner: owner
    };
  }

  /**
   * Get accrued protocol fees for a token
   * @param {string} tokenAddress - Token address to check fees for
   */
  async getProtocolFeesAccrued(tokenAddress) {
    const fees = await this.poolManager.protocolFeesAccrued(tokenAddress);
    return {
      tokenAddress,
      feesAccrued: fees.toString(),
      feesFormatted: ethers.formatUnits(fees, 18)
    };
  }

  /**
   * Set protocol fee controller (only PoolManager owner)
   * @param {string} privateKey - Owner's private key
   * @param {string} controllerAddress - New fee controller address
   */
  async setProtocolFeeController(privateKey, controllerAddress) {
    const wallet = this.createWalletFromPrivateKey(privateKey);
    const poolManagerWithOwner = this.poolManager.connect(wallet);
    
    const tx = await poolManagerWithOwner.setProtocolFeeController(controllerAddress);
    const receipt = await tx.wait();
    
    return {
      txHash: tx.hash,
      newController: controllerAddress,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Set protocol fee for a specific pool (only protocol fee controller)
   * @param {string} privateKey - Fee controller's private key
   * @param {string} token0 - First token address
   * @param {string} token1 - Second token address
   * @param {number} fee - Pool fee tier (e.g., 3000)
   * @param {number} protocolFee - Protocol fee (0-1000 for each direction, max 0.1%)
   *                               Pass single value for both directions or object {zeroForOne, oneForZero}
   */
  async setProtocolFee(privateKey, token0, token1, fee, protocolFee) {
    const wallet = this.createWalletFromPrivateKey(privateKey);
    const poolManagerWithController = this.poolManager.connect(wallet);
    
    // Sort tokens
    const [sortedToken0, sortedToken1] = token0.toLowerCase() < token1.toLowerCase() 
      ? [token0, token1] 
      : [token1, token0];
    
    // Use correct tick spacing for fee tier
    const tickSpacing = this.getTickSpacingForFee(fee);
    
    const poolKey = {
      currency0: sortedToken0,
      currency1: sortedToken1,
      fee: fee,
      tickSpacing: tickSpacing,
      hooks: ethers.ZeroAddress
    };
    
    // Encode protocol fee: lower 12 bits for zeroForOne, upper 12 bits for oneForZero
    // Max value for each is 1000 (0.1%)
    let encodedFee;
    if (typeof protocolFee === 'object') {
      const zeroForOneFee = Math.min(protocolFee.zeroForOne || 0, 1000);
      const oneForZeroFee = Math.min(protocolFee.oneForZero || 0, 1000);
      encodedFee = zeroForOneFee | (oneForZeroFee << 12);
    } else {
      // Same fee for both directions
      const feeValue = Math.min(protocolFee, 1000);
      encodedFee = feeValue | (feeValue << 12);
    }
    
    const tx = await poolManagerWithController.setProtocolFee(poolKey, encodedFee);
    const receipt = await tx.wait();
    
    return {
      txHash: tx.hash,
      poolKey,
      protocolFee: encodedFee,
      zeroForOneFee: encodedFee & 0xFFF,
      oneForZeroFee: (encodedFee >> 12) & 0xFFF,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Collect accrued protocol fees (only protocol fee controller)
   * @param {string} privateKey - Fee controller's private key
   * @param {string} recipient - Address to receive fees
   * @param {string} tokenAddress - Token address to collect fees for
   * @param {string} amount - Amount to collect (0 = all)
   */
  async collectProtocolFees(privateKey, recipient, tokenAddress, amount = "0") {
    const wallet = this.createWalletFromPrivateKey(privateKey);
    const poolManagerWithController = this.poolManager.connect(wallet);
    
    // Get current accrued fees
    const accruedBefore = await this.poolManager.protocolFeesAccrued(tokenAddress);
    
    const amountToCollect = amount === "0" ? 0 : ethers.parseUnits(amount, 18);
    
    const tx = await poolManagerWithController.collectProtocolFees(recipient, tokenAddress, amountToCollect);
    const receipt = await tx.wait();
    
    // Get remaining fees
    const accruedAfter = await this.poolManager.protocolFeesAccrued(tokenAddress);
    
    return {
      txHash: tx.hash,
      recipient,
      tokenAddress,
      amountCollected: ethers.formatUnits(accruedBefore - accruedAfter, 18),
      remainingFees: ethers.formatUnits(accruedAfter, 18),
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Get protocol fee info for a pool
   * @param {string} token0 - First token address
   * @param {string} token1 - Second token address
   * @param {number} fee - Pool fee tier
   */
  async getPoolProtocolFee(token0, token1, fee = 3000) {
    // Sort tokens
    const [sortedToken0, sortedToken1] = token0.toLowerCase() < token1.toLowerCase() 
      ? [token0, token1] 
      : [token1, token0];
    
    // Create pool key and calculate pool ID
    const tickSpacing = this.getTickSpacingForFee(fee);
    const poolKey = {
      currency0: sortedToken0,
      currency1: sortedToken1,
      fee: fee,
      tickSpacing: tickSpacing,
      hooks: ethers.ZeroAddress
    };
    
    const poolId = this.calculatePoolId(poolKey);
    
    // Get slot0 from StateView using poolId
    const [sqrtPriceX96, tick, protocolFee, lpFee] = await this.stateView.getSlot0(poolId);
    
    return {
      token0: sortedToken0,
      token1: sortedToken1,
      fee,
      tickSpacing,
      poolId,
      sqrtPriceX96: sqrtPriceX96.toString(),
      tick: tick.toString(),
      protocolFee: protocolFee.toString(),
      lpFee: lpFee.toString(),
      // Decode protocol fee (lower 12 bits = zeroForOne, upper 12 bits = oneForZero)
      protocolFeeZeroForOne: (Number(protocolFee) & 0xFFF).toString(),
      protocolFeeOneForZero: ((Number(protocolFee) >> 12) & 0xFFF).toString(),
      lpFeePercent: (Number(lpFee) / 10000).toFixed(4) + '%'
    };
  }

  /**
   * Get LP position info for a pool
   * In V4, positions are owned by the LiquidityManager contract
   * @param {string} token0 - First token address
   * @param {string} token1 - Second token address
   * @param {number} fee - Pool fee tier
   * @param {number} tickLower - Lower tick (optional, defaults to full range)
   * @param {number} tickUpper - Upper tick (optional, defaults to full range)
   */
  async getLPPositionInfo(token0, token1, fee = 3000, tickLower = null, tickUpper = null) {
    const [sortedToken0, sortedToken1] = token0.toLowerCase() < token1.toLowerCase() 
      ? [token0, token1] 
      : [token1, token0];
    
    const tickSpacing = this.getTickSpacingForFee(fee);
    const poolKey = {
      currency0: sortedToken0,
      currency1: sortedToken1,
      fee: fee,
      tickSpacing: tickSpacing,
      hooks: ethers.ZeroAddress
    };
    
    const poolId = this.calculatePoolId(poolKey);
    
    // Use full range if not specified
    const lower = tickLower !== null ? tickLower : this.MIN_TICK;
    const upper = tickUpper !== null ? tickUpper : this.MAX_TICK;
    
    // The LiquidityManager contract owns the position
    const liquidityManagerAddr = await this.liquidityManager.getAddress();
    
    try {
      // Get position info from StateView
      const [liquidity, feeGrowthInside0LastX128, feeGrowthInside1LastX128] = 
        await this.stateView.getPositionInfo(
          poolId,
          liquidityManagerAddr,
          lower,
          upper,
          ethers.ZeroHash // salt
        );
      
      // Get current fee growth values for the pool
      const [feeGrowthInside0X128, feeGrowthInside1X128] = 
        await this.stateView.getFeeGrowthInside(poolId, lower, upper);
      
      // Calculate uncollected fees
      // fees = liquidity * (currentFeeGrowth - lastFeeGrowth) / 2^128
      const Q128 = BigInt(2) ** BigInt(128);
      
      const feeGrowth0Delta = BigInt(feeGrowthInside0X128) - BigInt(feeGrowthInside0LastX128);
      const feeGrowth1Delta = BigInt(feeGrowthInside1X128) - BigInt(feeGrowthInside1LastX128);
      
      const fees0Owed = (BigInt(liquidity) * feeGrowth0Delta) / Q128;
      const fees1Owed = (BigInt(liquidity) * feeGrowth1Delta) / Q128;
      
      return {
        token0: sortedToken0,
        token1: sortedToken1,
        fee,
        tickLower: lower,
        tickUpper: upper,
        poolId,
        positionOwner: liquidityManagerAddr,
        liquidity: liquidity.toString(),
        liquidityFormatted: ethers.formatEther(liquidity),
        feeGrowthInside0LastX128: feeGrowthInside0LastX128.toString(),
        feeGrowthInside1LastX128: feeGrowthInside1LastX128.toString(),
        currentFeeGrowth0X128: feeGrowthInside0X128.toString(),
        currentFeeGrowth1X128: feeGrowthInside1X128.toString(),
        fees0Owed: fees0Owed.toString(),
        fees1Owed: fees1Owed.toString(),
        fees0OwedFormatted: ethers.formatEther(fees0Owed),
        fees1OwedFormatted: ethers.formatEther(fees1Owed)
      };
    } catch (error) {
      console.error('Error getting position info:', error.message);
      throw error;
    }
  }

  /**
   * Collect LP fees by calling modifyLiquidity with 0 delta
   * This triggers fee collection without adding/removing liquidity
   * @param {string} privateKey - User's private key
   * @param {string} token0 - First token address
   * @param {string} token1 - Second token address
   * @param {number} fee - Pool fee tier
   * @param {number} tickLower - Lower tick (optional)
   * @param {number} tickUpper - Upper tick (optional)
   */
  async collectLPFees(privateKey, token0, token1, fee = 3000, tickLower = null, tickUpper = null) {
    const wallet = this.createWalletFromPrivateKey(privateKey);
    const liquidityManagerWithSigner = this.liquidityManager.connect(wallet);
    
    const [sortedToken0, sortedToken1] = token0.toLowerCase() < token1.toLowerCase() 
      ? [token0, token1] 
      : [token1, token0];
    
    const tickSpacing = this.getTickSpacingForFee(fee);
    const poolKey = {
      currency0: sortedToken0,
      currency1: sortedToken1,
      fee: fee,
      tickSpacing: tickSpacing,
      hooks: ethers.ZeroAddress
    };
    
    const lower = tickLower !== null ? tickLower : this.MIN_TICK;
    const upper = tickUpper !== null ? tickUpper : this.MAX_TICK;
    
    // Get fees before collection
    const positionBefore = await this.getLPPositionInfo(token0, token1, fee, lower, upper);
    
    // Call modifyLiquidity with 0 delta to collect fees
    const tx = await liquidityManagerWithSigner.addLiquidity(
      poolKey,
      lower,
      upper,
      0 // Zero delta triggers fee collection
    );
    const receipt = await tx.wait();
    
    // Get position after to calculate collected fees
    const positionAfter = await this.getLPPositionInfo(token0, token1, fee, lower, upper);
    
    return {
      txHash: tx.hash,
      poolKey,
      tickLower: lower,
      tickUpper: upper,
      fees0Collected: positionBefore.fees0OwedFormatted,
      fees1Collected: positionBefore.fees1OwedFormatted,
      gasUsed: receipt.gasUsed.toString(),
      collector: wallet.address
    };
  }
}

module.exports = new BlockchainService();
