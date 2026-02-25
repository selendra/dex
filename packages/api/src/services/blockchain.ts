import { ethers, Contract, Wallet, JsonRpcProvider, TransactionReceipt } from 'ethers';
import path from 'path';
import dotenv from 'dotenv';

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

// Load custom ABIs (standalone, no dependency on contracts package)
import {
  PoolManagerABI,
  StateViewABI,
  LiquidityManagerABI,
  SwapRouterABI,
  PriceOracleABI,
  ERC20ABI
} from '../abi';

import {
  PoolKey,
  SwapParams,
  PoolInfo,
  TokenInfo,
  TokenBalances,
  SwapQuote,
  SwapResult,
  LiquidityResult,
  PositionInfo,
  PriceInfo,
  PriceData,
  PriceFeedResult,
  OracleConfig,
  AdminResult,
  ProtocolFeeInfo,
  TransferResult,
  ApprovalResult,
  AllowanceResult,
  FeeTickSpacingMap
} from '../types';

interface PoolProtocolFeeResult {
  token0: string;
  token1: string;
  fee: number;
  tickSpacing: number;
  poolId: string;
  sqrtPriceX96: string;
  tick: string;
  protocolFee: string;
  lpFee: string;
  protocolFeeZeroForOne: string;
  protocolFeeOneForZero: string;
  lpFeePercent: string;
}

interface CollectFeesResult {
  txHash: string;
  poolKey: PoolKey;
  tickLower: number;
  tickUpper: number;
  fees0Collected: string;
  fees1Collected: string;
  gasUsed: string;
  collector: string;
}

class BlockchainService {
  private poolManager: Contract | null = null;
  private stateView: Contract | null = null;
  private liquidityManager: Contract | null = null;
  private swapRouter: Contract | null = null;
  private priceOracle: Contract | null = null;
  private tokens: Record<string, Contract> = {};
  private signer: Wallet | null = null;
  private provider: JsonRpcProvider | null = null;

  private readonly SQRT_PRICE_1_1 = "79228162514264337593543950336";
  private readonly MIN_TICK = -887220;
  private readonly MAX_TICK = 887220;
  private readonly FEE_MEDIUM = 3000;
  private readonly TICK_SPACING_MEDIUM = 60;

  // Fee tier to tick spacing mapping (Uniswap V4 standard)
  private readonly FEE_TICK_SPACING: FeeTickSpacingMap = {
    100: 1,     // 0.01% fee -> tick spacing 1
    500: 10,    // 0.05% fee -> tick spacing 10
    3000: 60,   // 0.30% fee -> tick spacing 60
    10000: 200  // 1.00% fee -> tick spacing 200
  };

  // Price limits for swaps (within valid range)
  private readonly MIN_PRICE_LIMIT = "4295128740";
  private readonly MAX_PRICE_LIMIT = "1461446703485210103287273052203988822378723970341";

  async initialize(): Promise<boolean> {
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

      // Connect to contracts with signer using custom ABIs
      this.poolManager = new ethers.Contract(poolManagerAddr, PoolManagerABI, this.signer);
      this.stateView = new ethers.Contract(stateViewAddr, StateViewABI, this.signer);
      this.liquidityManager = new ethers.Contract(liquidityManagerAddr, LiquidityManagerABI, this.signer);
      this.swapRouter = new ethers.Contract(swapRouterAddr, SwapRouterABI, this.signer);

      // Load PriceOracle if available
      if (priceOracleAddr) {
        this.priceOracle = new ethers.Contract(priceOracleAddr, PriceOracleABI, this.signer);
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

  /**
   * Create a wallet from private key
   */
  createWalletFromPrivateKey(privateKey: string): Wallet {
    if (!privateKey) {
      throw new Error('Private key is required');
    }
    // Ensure private key has 0x prefix
    const pk = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    return new ethers.Wallet(pk, this.provider!);
  }

  /**
   * Get address from private key without creating full wallet
   */
  getAddressFromPrivateKey(privateKey: string): string {
    const wallet = this.createWalletFromPrivateKey(privateKey);
    return wallet.address;
  }

  async loadToken(tokenAddress: string): Promise<Contract> {
    if (!this.tokens[tokenAddress]) {
      this.tokens[tokenAddress] = new ethers.Contract(
        tokenAddress,
        ERC20ABI,
        this.signer!
      );
    }
    return this.tokens[tokenAddress];
  }

  /**
   * Load token with a specific wallet (for user operations)
   */
  loadTokenWithWallet(tokenAddress: string, wallet: Wallet): Contract {
    return new ethers.Contract(tokenAddress, ERC20ABI, wallet);
  }

  /**
   * Get token metadata (name, symbol, decimals, totalSupply)
   */
  async getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
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
  async transferToken(userWallet: Wallet, tokenAddress: string, toAddress: string, amount: number): Promise<TransferResult> {
    const token = this.loadTokenWithWallet(tokenAddress, userWallet);
    const decimals = await token.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);

    const tx = await token.transfer(toAddress, amountWei);
    const receipt: TransactionReceipt = await tx.wait();

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
  async approveToken(userWallet: Wallet, tokenAddress: string, spenderAddress: string, amount: number): Promise<ApprovalResult> {
    const token = this.loadTokenWithWallet(tokenAddress, userWallet);
    const decimals = await token.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);

    const tx = await token.approve(spenderAddress, amountWei);
    const receipt: TransactionReceipt = await tx.wait();

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
  async getAllowance(tokenAddress: string, ownerAddress: string, spenderAddress: string): Promise<AllowanceResult> {
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
  async transferFromToken(userWallet: Wallet, tokenAddress: string, fromAddress: string, toAddress: string, amount: number): Promise<TransferResult & { caller: string }> {
    const token = this.loadTokenWithWallet(tokenAddress, userWallet);
    const decimals = await token.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);

    const tx = await token.transferFrom(fromAddress, toAddress, amountWei);
    const receipt: TransactionReceipt = await tx.wait();

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
  async burnToken(userWallet: Wallet, tokenAddress: string, amount: number): Promise<{ txHash: string; burner: string; amount: string; tokenAddress: string; newBalance: string; gasUsed: string }> {
    const token = this.loadTokenWithWallet(tokenAddress, userWallet);
    const decimals = await token.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);

    // Check balance first
    const balance = await token.balanceOf(userWallet.address);
    if (balance < amountWei) {
      throw new Error(`Insufficient balance. Have: ${ethers.formatUnits(balance, decimals)}, Need: ${amount}`);
    }

    const tx = await token.burn(amountWei);
    const receipt: TransactionReceipt = await tx.wait();

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
  async burnFromToken(userWallet: Wallet, tokenAddress: string, fromAddress: string, amount: number): Promise<{ txHash: string; from: string; caller: string; amount: string; tokenAddress: string; gasUsed: string }> {
    const token = this.loadTokenWithWallet(tokenAddress, userWallet);
    const decimals = await token.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);

    const tx = await token.burnFrom(fromAddress, amountWei);
    const receipt: TransactionReceipt = await tx.wait();

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
  async mintToken(userWallet: Wallet, tokenAddress: string, toAddress: string, amount: number): Promise<{ txHash: string; to: string; amount: string; tokenAddress: string; newBalance: string; gasUsed: string }> {
    const token = this.loadTokenWithWallet(tokenAddress, userWallet);
    const decimals = await token.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);

    const tx = await token.mint(toAddress, amountWei);
    const receipt: TransactionReceipt = await tx.wait();

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

  sortTokens(token0Addr: string, token1Addr: string): [string, string] {
    return token0Addr.toLowerCase() < token1Addr.toLowerCase()
      ? [token0Addr, token1Addr]
      : [token1Addr, token0Addr];
  }

  /**
   * Get tick spacing for a fee tier
   */
  getTickSpacingForFee(fee: number): number {
    return this.FEE_TICK_SPACING[fee] || this.TICK_SPACING_MEDIUM;
  }

  createPoolKey(token0Addr: string, token1Addr: string, fee: number | null = null, tickSpacing: number | null = null): PoolKey {
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

  calculatePoolId(poolKey: PoolKey): string {
    return ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint24", "int24", "address"],
        [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
      )
    );
  }

  /**
   * Convert price ratio to sqrtPriceX96
   */
  priceToSqrtPriceX96(price: number): string {
    const Q96 = BigInt(2) ** BigInt(96);
    const sqrtPrice = Math.sqrt(price);
    const sqrtPriceScaled = BigInt(Math.floor(sqrtPrice * 1e18));
    const sqrtPriceX96 = (sqrtPriceScaled * Q96) / BigInt(1e18);
    return sqrtPriceX96.toString();
  }

  async initializePool(token0Addr: string, token1Addr: string, priceRatio: number | null = null): Promise<{ poolKey: PoolKey; txHash: string; priceRatio: number; sqrtPriceX96: string }> {
    try {
      const poolKey = this.createPoolKey(token0Addr, token1Addr);

      let sqrtPriceX96: string;
      if (priceRatio !== null && priceRatio !== undefined) {
        sqrtPriceX96 = this.priceToSqrtPriceX96(priceRatio);
      } else {
        sqrtPriceX96 = this.SQRT_PRICE_1_1;
      }

      const tx = await this.poolManager!.initialize(poolKey, sqrtPriceX96);
      const receipt: TransactionReceipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error('Pool initialization transaction reverted');
      }

      return {
        poolKey,
        txHash: tx.hash,
        priceRatio: priceRatio || 1,
        sqrtPriceX96
      };
    } catch (error: any) {
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
   */
  async initializePoolWithWallet(userWallet: Wallet, token0Addr: string, token1Addr: string, priceRatio: number | null = null): Promise<{ poolKey: PoolKey; txHash: string; priceRatio: number; sqrtPriceX96: string; gasUsed: string }> {
    try {
      const poolKey = this.createPoolKey(token0Addr, token1Addr);

      let sqrtPriceX96: string;
      if (priceRatio !== null && priceRatio !== undefined) {
        sqrtPriceX96 = this.priceToSqrtPriceX96(priceRatio);
      } else {
        sqrtPriceX96 = this.SQRT_PRICE_1_1;
      }

      const liquidityManagerWithWallet = this.liquidityManager!.connect(userWallet) as Contract;

      const tx = await liquidityManagerWithWallet.initializePool(poolKey, sqrtPriceX96);
      const receipt: TransactionReceipt = await tx.wait();

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
    } catch (error: any) {
      if (error.message.includes('PoolAlreadyInitialized') ||
          error.message.includes('already initialized') ||
          error.message.includes('ALREADY_INITIALIZED')) {
        throw new Error('Pool has already been initialized. Each pool can only be initialized once.');
      }

      if (error.message.includes('NotAuthorized') ||
          error.message.includes('NotAdmin')) {
        throw new Error('Not authorized to initialize pools. Only admin or authorized addresses can initialize pools.');
      }

      throw error;
    }
  }

  async addLiquidity(token0Addr: string, token1Addr: string, amount0: number, amount1: number, tickLower: number | null = null, tickUpper: number | null = null): Promise<LiquidityResult> {
    const poolKey = this.createPoolKey(token0Addr, token1Addr);
    const lmAddr = await this.liquidityManager!.getAddress();

    const [sortedToken0] = this.sortTokens(token0Addr, token1Addr);

    let sortedAmount0: number, sortedAmount1: number;
    if (token0Addr.toLowerCase() === sortedToken0.toLowerCase()) {
      sortedAmount0 = amount0;
      sortedAmount1 = amount1;
    } else {
      sortedAmount0 = amount1;
      sortedAmount1 = amount0;
    }

    const token0 = await this.loadToken(poolKey.currency0);
    const token1 = await this.loadToken(poolKey.currency1);

    const amount0Wei = ethers.parseEther(sortedAmount0.toString());
    const amount1Wei = ethers.parseEther(sortedAmount1.toString());

    let nonce = await this.provider!.getTransactionCount(this.signer!.address, "pending");

    const tx0 = await token0.transfer(lmAddr, amount0Wei, { nonce: nonce++ });
    await tx0.wait();

    const tx1 = await token1.transfer(lmAddr, amount1Wei, { nonce: nonce++ });
    await tx1.wait();

    const liquidityAmount = Math.min(sortedAmount0, sortedAmount1);
    const liquidityDelta = ethers.parseEther(liquidityAmount.toString());

    const tx = await this.liquidityManager!.addLiquidity(
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
   * Add liquidity using a specific user wallet
   */
  async addLiquidityWithWallet(userWallet: Wallet, token0Addr: string, token1Addr: string, amount0: number, amount1: number, tickLower: number | null = null, tickUpper: number | null = null): Promise<LiquidityResult> {
    const poolKey = this.createPoolKey(token0Addr, token1Addr);
    const lmAddr = await this.liquidityManager!.getAddress();

    const [sortedToken0] = this.sortTokens(token0Addr, token1Addr);

    let sortedAmount0: number, sortedAmount1: number;
    if (token0Addr.toLowerCase() === sortedToken0.toLowerCase()) {
      sortedAmount0 = amount0;
      sortedAmount1 = amount1;
    } else {
      sortedAmount0 = amount1;
      sortedAmount1 = amount0;
    }

    const token0 = new ethers.Contract(poolKey.currency0, ERC20ABI, userWallet);
    const token1 = new ethers.Contract(poolKey.currency1, ERC20ABI, userWallet);

    const amount0Wei = ethers.parseEther(sortedAmount0.toString());
    const amount1Wei = ethers.parseEther(sortedAmount1.toString());

    const balance0 = await token0.balanceOf(userWallet.address);
    const balance1 = await token1.balanceOf(userWallet.address);

    if (balance0 < amount0Wei) {
      throw new Error(`Insufficient token0 balance. Have: ${ethers.formatEther(balance0)}, Need: ${sortedAmount0}`);
    }
    if (balance1 < amount1Wei) {
      throw new Error(`Insufficient token1 balance. Have: ${ethers.formatEther(balance1)}, Need: ${sortedAmount1}`);
    }

    let nonce = await this.provider!.getTransactionCount(userWallet.address, "pending");

    console.log(`Transferring ${sortedAmount0} token0 from ${userWallet.address} to ${lmAddr}...`);
    const tx0 = await token0.transfer(lmAddr, amount0Wei, { nonce: nonce++ });
    await tx0.wait();

    console.log(`Transferring ${sortedAmount1} token1 from ${userWallet.address} to ${lmAddr}...`);
    const tx1 = await token1.transfer(lmAddr, amount1Wei, { nonce: nonce++ });
    await tx1.wait();

    const liquidityAmount = Math.min(sortedAmount0, sortedAmount1);
    const liquidityDelta = ethers.parseEther(liquidityAmount.toString());

    const tx = await this.liquidityManager!.addLiquidity(
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

  async removeLiquidity(token0Addr: string, token1Addr: string, liquidityAmount: number, tickLower: number | null = null, tickUpper: number | null = null, privateKey: string | null = null): Promise<LiquidityResult> {
    const poolKey = this.createPoolKey(token0Addr, token1Addr);
    
    // Use wallet if provided, otherwise use default signer
    const liquidityManagerWithSigner = privateKey 
      ? this.liquidityManager!.connect(this.createWalletFromPrivateKey(privateKey)) as Contract
      : this.liquidityManager!;

    const liquidityDelta = ethers.parseEther(liquidityAmount.toString());
    const tx = await liquidityManagerWithSigner.removeLiquidity(
      poolKey,
      tickLower || this.MIN_TICK,
      tickUpper || this.MAX_TICK,
      liquidityDelta
    );
    const receipt: TransactionReceipt = await tx.wait();

    return { 
      poolKey, 
      txHash: tx.hash, 
      liquidityRemoved: liquidityAmount.toString(), 
      liquidityDelta: liquidityDelta.toString(),
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Get LP position info from contract
   */
  async getPositionFromContract(userAddress: string, token0: string, token1: string, fee: number = 3000, tickLower: number | null = null, tickUpper: number | null = null): Promise<{ liquidity: string; tickLower: number; tickUpper: number }> {
    const tickSpacing = this.getTickSpacingForFee(fee);
    const [sortedToken0, sortedToken1] = token0.toLowerCase() < token1.toLowerCase()
      ? [token0, token1]
      : [token1, token0];
      
    const poolKey: PoolKey = {
      currency0: sortedToken0,
      currency1: sortedToken1,
      fee: fee,
      tickSpacing: tickSpacing,
      hooks: ethers.ZeroAddress
    };
    
    const lower = tickLower !== null ? tickLower : this.MIN_TICK;
    const upper = tickUpper !== null ? tickUpper : this.MAX_TICK;
    
    const position = await this.liquidityManager!.getPosition(userAddress, poolKey, lower, upper);
    
    return {
      liquidity: position.liquidity.toString(),
      tickLower: Number(position.tickLower),
      tickUpper: Number(position.tickUpper)
    };
  }

  /**
   * Get swap quote - calculate expected output amount
   */
  async getSwapQuote(tokenInAddr: string, tokenOutAddr: string, amountIn: number): Promise<SwapQuote> {
    try {
      const poolKey = this.createPoolKey(tokenInAddr, tokenOutAddr);
      const poolId = this.calculatePoolId(poolKey);

      const slot0 = await this.stateView!.getSlot0(poolId);
      const liquidity = await this.stateView!.getLiquidity(poolId);

      const sqrtPriceX96 = BigInt(slot0[0]);
      const liquidityBN = BigInt(liquidity);

      if (liquidityBN === 0n) {
        throw new Error('Pool has no liquidity');
      }

      const Q96 = BigInt(2) ** BigInt(96);
      const priceX192 = sqrtPriceX96 * sqrtPriceX96;
      const price = Number(priceX192) / Number(Q96 * Q96);

      const zeroForOne = tokenInAddr.toLowerCase() === poolKey.currency0.toLowerCase();

      const amountInNum = parseFloat(amountIn.toString());
      let estimatedAmountOut: number;

      if (zeroForOne) {
        estimatedAmountOut = amountInNum * price;
      } else {
        estimatedAmountOut = amountInNum / price;
      }

      const feePercent = poolKey.fee / 1000000;
      estimatedAmountOut = estimatedAmountOut * (1 - feePercent);

      const liquidityNum = Number(ethers.formatEther(liquidity));
      const priceImpact = (amountInNum / liquidityNum) * 100;

      return {
        tokenIn: tokenInAddr,
        tokenOut: tokenOutAddr,
        amountIn: amountIn.toString(),
        estimatedAmountOut: estimatedAmountOut.toFixed(18),
        price: zeroForOne ? price : 1 / price,
        priceImpact: priceImpact.toFixed(4) + '%',
        fee: (feePercent * 100).toFixed(2) + '%',
        poolLiquidity: ethers.formatEther(liquidity)
      };
    } catch (error: any) {
      console.error('Error getting swap quote:', error.message);
      throw error;
    }
  }

  async executeSwap(tokenInAddr: string, tokenOutAddr: string, amountIn: number, minAmountOut: number = 0, userWallet: Wallet | null = null): Promise<SwapResult> {
    const poolKey = this.createPoolKey(tokenInAddr, tokenOutAddr);
    const tokenIn = await this.loadToken(tokenInAddr);
    const tokenOut = await this.loadToken(tokenOutAddr);
    const swapRouterAddr = await this.swapRouter!.getAddress();

    const wallet = userWallet || this.signer!;

    const tokenInWithSigner = tokenIn.connect(wallet) as Contract;

    const amount = ethers.parseEther(amountIn.toString());
    const approveTx = await tokenInWithSigner.approve(swapRouterAddr, amount);
    await approveTx.wait();

    const zeroForOne = tokenInAddr.toLowerCase() === poolKey.currency0.toLowerCase();

    const swapParams: SwapParams = {
      zeroForOne,
      amountSpecified: -amount,
      sqrtPriceLimitX96: zeroForOne ? this.MIN_PRICE_LIMIT : this.MAX_PRICE_LIMIT
    };

    const tokenOutWithSigner = tokenOut.connect(wallet) as Contract;
    const balanceBefore = await tokenOutWithSigner.balanceOf(wallet.address);

    const nonceHex = await this.provider!.send("eth_getTransactionCount", [wallet.address, "latest"]);
    const swapNonce = parseInt(nonceHex, 16);

    const swapRouterWithSigner = this.swapRouter!.connect(wallet) as Contract;
    const tx = await swapRouterWithSigner.swap(poolKey, swapParams, { nonce: swapNonce });
    const receipt: TransactionReceipt = await tx.wait();

    const balanceAfter = await tokenOutWithSigner.balanceOf(wallet.address);
    const actualAmountOut = balanceAfter - balanceBefore;
    const actualAmountOutFormatted = ethers.formatEther(actualAmountOut);

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

  async getPoolInfo(token0Addr: string, token1Addr: string): Promise<PoolInfo> {
    const poolKey = this.createPoolKey(token0Addr, token1Addr);
    const poolId = this.calculatePoolId(poolKey);

    const slot0 = await this.stateView!.getSlot0(poolId);
    const liquidity = await this.stateView!.getLiquidity(poolId);

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

  async getAllPoolsInfo(tokenAddresses: string[]): Promise<PoolInfo[]> {
    const pools: PoolInfo[] = [];

    for (let i = 0; i < tokenAddresses.length; i++) {
      for (let j = i + 1; j < tokenAddresses.length; j++) {
        try {
          const info = await this.getPoolInfo(tokenAddresses[i], tokenAddresses[j]);
          if (BigInt(info.liquidity) > 0) {
            pools.push(info);
          }
        } catch {
          continue;
        }
      }
    }

    return pools;
  }

  async getTokenBalance(tokenAddr: string, accountAddr: string | null = null): Promise<string> {
    try {
      if (!ethers.isAddress(tokenAddr)) {
        throw new Error(`Invalid token address: ${tokenAddr}`);
      }
      if (accountAddr && !ethers.isAddress(accountAddr)) {
        throw new Error(`Invalid account address: ${accountAddr}`);
      }

      const token = await this.loadToken(tokenAddr);
      const account = accountAddr || this.signer!.address;

      const code = await this.signer!.provider!.getCode(tokenAddr);
      if (code === '0x') {
        throw new Error(`No contract found at address: ${tokenAddr}`);
      }

      const balance = await token.balanceOf(account);
      return ethers.formatEther(balance);
    } catch (error: any) {
      console.error(`Error getting token balance for ${tokenAddr}:`, error.message);
      throw error;
    }
  }

  async getNativeBalance(accountAddr: string | null = null): Promise<string> {
    try {
      if (accountAddr && !ethers.isAddress(accountAddr)) {
        throw new Error(`Invalid account address: ${accountAddr}`);
      }

      const account = accountAddr || this.signer!.address;
      const balance = await this.signer!.provider!.getBalance(account);
      return ethers.formatEther(balance);
    } catch (error: any) {
      console.error(`Error getting native balance for ${accountAddr}:`, error.message);
      throw error;
    }
  }

  async getUserBalances(accountAddr: string, tokenAddresses: string[] = []): Promise<TokenBalances> {
    const balances: TokenBalances = {
      native: await this.getNativeBalance(accountAddr),
      tokens: {}
    };

    for (const tokenAddr of tokenAddresses) {
      try {
        balances.tokens[tokenAddr] = await this.getTokenBalance(tokenAddr, accountAddr);
      } catch (error: any) {
        console.error(`Failed to get balance for token ${tokenAddr}:`, error.message);
        balances.tokens[tokenAddr] = '0';
      }
    }

    return balances;
  }

  // ========== Admin Functions for LiquidityManager ==========

  async setAuthorizedInitializer(adminPrivateKey: string, account: string, authorized: boolean): Promise<AdminResult> {
    const adminWallet = this.createWalletFromPrivateKey(adminPrivateKey);
    const liquidityManagerWithAdmin = this.liquidityManager!.connect(adminWallet) as Contract;

    const tx = await liquidityManagerWithAdmin.setAuthorizedInitializer(account, authorized);
    const receipt: TransactionReceipt = await tx.wait();

    return {
      txHash: tx.hash,
      account,
      authorized: authorized.toString(),
      gasUsed: receipt.gasUsed.toString()
    };
  }

  async isAuthorizedInitializer(account: string): Promise<boolean> {
    const isAuthorized = await this.liquidityManager!.authorizedInitializers(account);
    return isAuthorized;
  }

  async getPoolAdmin(): Promise<string> {
    const admin = await this.liquidityManager!.admin();
    return admin;
  }

  async transferPoolAdmin(adminPrivateKey: string, newAdmin: string): Promise<AdminResult> {
    const adminWallet = this.createWalletFromPrivateKey(adminPrivateKey);
    const liquidityManagerWithAdmin = this.liquidityManager!.connect(adminWallet) as Contract;

    const oldAdmin = await this.liquidityManager!.admin();
    const tx = await liquidityManagerWithAdmin.setAdmin(newAdmin);
    const receipt: TransactionReceipt = await tx.wait();

    return {
      txHash: tx.hash,
      oldAdmin,
      newAdmin,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  // ========== Admin Functions for SwapRouter ==========

  async pauseSwaps(adminPrivateKey: string): Promise<AdminResult> {
    const adminWallet = this.createWalletFromPrivateKey(adminPrivateKey);
    const swapRouterWithAdmin = this.swapRouter!.connect(adminWallet) as Contract;

    const tx = await swapRouterWithAdmin.pause();
    const receipt: TransactionReceipt = await tx.wait();

    return {
      txHash: tx.hash,
      paused: 'true',
      gasUsed: receipt.gasUsed.toString()
    };
  }

  async unpauseSwaps(adminPrivateKey: string): Promise<AdminResult> {
    const adminWallet = this.createWalletFromPrivateKey(adminPrivateKey);
    const swapRouterWithAdmin = this.swapRouter!.connect(adminWallet) as Contract;

    const tx = await swapRouterWithAdmin.unpause();
    const receipt: TransactionReceipt = await tx.wait();

    return {
      txHash: tx.hash,
      paused: 'false',
      gasUsed: receipt.gasUsed.toString()
    };
  }

  async isSwapsPaused(): Promise<boolean> {
    const paused = await this.swapRouter!.paused();
    return paused;
  }

  async getSwapAdmin(): Promise<string> {
    const admin = await this.swapRouter!.admin();
    return admin;
  }

  async transferSwapAdmin(adminPrivateKey: string, newAdmin: string): Promise<AdminResult> {
    const adminWallet = this.createWalletFromPrivateKey(adminPrivateKey);
    const swapRouterWithAdmin = this.swapRouter!.connect(adminWallet) as Contract;

    const oldAdmin = await this.swapRouter!.admin();
    const tx = await swapRouterWithAdmin.setAdmin(newAdmin);
    const receipt: TransactionReceipt = await tx.wait();

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

  async getPrice(token0: string, token1: string): Promise<PriceInfo> {
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

  async getPoolPrice(token0: string, token1: string): Promise<{ price: string; sqrtPriceX96: string }> {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }

    const [price, sqrtPriceX96] = await this.priceOracle.getPoolPrice(token0, token1);

    return {
      price: ethers.formatUnits(price, 18),
      sqrtPriceX96: sqrtPriceX96.toString()
    };
  }

  async getExternalPrice(token0: string, token1: string): Promise<PriceData> {
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

  async getTWAP(token0: string, token1: string): Promise<{ twap: string }> {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }

    const twap = await this.priceOracle.getTWAP(token0, token1);

    return {
      twap: ethers.formatUnits(twap, 18)
    };
  }

  async feedPrice(feederPrivateKey: string, token0: string, token1: string, price: string | number): Promise<PriceFeedResult> {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }

    const feederWallet = this.createWalletFromPrivateKey(feederPrivateKey);
    const oracleWithFeeder = this.priceOracle.connect(feederWallet) as Contract;

    let priceWei: bigint;
    if (price.toString().includes('.')) {
      priceWei = ethers.parseUnits(price.toString(), 18);
    } else {
      priceWei = BigInt(price);
    }

    const tx = await oracleWithFeeder.feedPrice(token0, token1, priceWei);
    const receipt: TransactionReceipt = await tx.wait();

    return {
      txHash: tx.hash,
      token0,
      token1,
      price: priceWei.toString(),
      gasUsed: receipt.gasUsed.toString()
    };
  }

  async feedPricesBatch(feederPrivateKey: string, pairs: Array<{ token0: string; token1: string; price: string | number }>): Promise<{ txHash: string; pairsUpdated: number; gasUsed: string }> {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }

    const feederWallet = this.createWalletFromPrivateKey(feederPrivateKey);
    const oracleWithFeeder = this.priceOracle.connect(feederWallet) as Contract;

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
    const receipt: TransactionReceipt = await tx.wait();

    return {
      txHash: tx.hash,
      pairsUpdated: pairs.length,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  async observePoolPrice(token0: string, token1: string, privateKey: string): Promise<{ txHash: string; token0: string; token1: string; gasUsed: string }> {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }

    const wallet = this.createWalletFromPrivateKey(privateKey);
    const oracleWithWallet = this.priceOracle.connect(wallet) as Contract;

    const tx = await oracleWithWallet.observePoolPrice(token0, token1);
    const receipt: TransactionReceipt = await tx.wait();

    return {
      txHash: tx.hash,
      token0,
      token1,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  async getObservationCount(token0: string, token1: string): Promise<{ count: string }> {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }

    const count = await this.priceOracle.getObservationCount(token0, token1);

    return {
      count: count.toString()
    };
  }

  async isAuthorizedFeeder(account: string): Promise<boolean> {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }

    const isAuthorized = await this.priceOracle.authorizedFeeders(account);
    return isAuthorized;
  }

  async setAuthorizedFeeder(adminPrivateKey: string, account: string, authorized: boolean): Promise<AdminResult> {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }

    const adminWallet = this.createWalletFromPrivateKey(adminPrivateKey);
    const oracleWithAdmin = this.priceOracle.connect(adminWallet) as Contract;

    const tx = await oracleWithAdmin.setAuthorizedFeeder(account, authorized);
    const receipt: TransactionReceipt = await tx.wait();

    return {
      txHash: tx.hash,
      account,
      authorized: authorized.toString(),
      gasUsed: receipt.gasUsed.toString()
    };
  }

  async getOracleAdmin(): Promise<string> {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }

    const admin = await this.priceOracle.admin();
    return admin;
  }

  async transferOracleAdmin(adminPrivateKey: string, newAdmin: string): Promise<AdminResult> {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }

    const adminWallet = this.createWalletFromPrivateKey(adminPrivateKey);
    const oracleWithAdmin = this.priceOracle.connect(adminWallet) as Contract;

    const oldAdmin = await this.priceOracle.admin();
    const tx = await oracleWithAdmin.setAdmin(newAdmin);
    const receipt: TransactionReceipt = await tx.wait();

    return {
      txHash: tx.hash,
      oldAdmin,
      newAdmin,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  async getOracleConfig(): Promise<OracleConfig> {
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

  async setDefaultFee(adminPrivateKey: string, fee: number): Promise<AdminResult> {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }

    const adminWallet = this.createWalletFromPrivateKey(adminPrivateKey);
    const oracleWithAdmin = this.priceOracle.connect(adminWallet) as Contract;

    const tx = await oracleWithAdmin.setDefaultFee(fee);
    const receipt: TransactionReceipt = await tx.wait();

    return {
      txHash: tx.hash,
      fee: fee.toString(),
      gasUsed: receipt.gasUsed.toString()
    };
  }

  async setDefaultTickSpacing(adminPrivateKey: string, tickSpacing: number): Promise<AdminResult> {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }

    const adminWallet = this.createWalletFromPrivateKey(adminPrivateKey);
    const oracleWithAdmin = this.priceOracle.connect(adminWallet) as Contract;

    const tx = await oracleWithAdmin.setDefaultTickSpacing(tickSpacing);
    const receipt: TransactionReceipt = await tx.wait();

    return {
      txHash: tx.hash,
      tickSpacing: tickSpacing.toString(),
      gasUsed: receipt.gasUsed.toString()
    };
  }

  async invalidatePrice(feederPrivateKey: string, token0: string, token1: string): Promise<{ txHash: string; token0: string; token1: string; gasUsed: string }> {
    if (!this.priceOracle) {
      throw new Error('PriceOracle not initialized');
    }

    const feederWallet = this.createWalletFromPrivateKey(feederPrivateKey);
    const oracleWithFeeder = this.priceOracle.connect(feederWallet) as Contract;

    const tx = await oracleWithFeeder.invalidatePrice(token0, token1);
    const receipt: TransactionReceipt = await tx.wait();

    return {
      txHash: tx.hash,
      token0,
      token1,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  // ========== Protocol Fee Management (PoolManager Owner Functions) ==========

  async getProtocolFeeController(): Promise<ProtocolFeeInfo> {
    const controller = await this.poolManager!.protocolFeeController();
    const owner = await this.poolManager!.owner();
    return {
      protocolFeeController: controller,
      poolManagerOwner: owner
    };
  }

  async getProtocolFeesAccrued(tokenAddress: string): Promise<{ tokenAddress: string; feesAccrued: string; feesFormatted: string }> {
    const fees = await this.poolManager!.protocolFeesAccrued(tokenAddress);
    return {
      tokenAddress,
      feesAccrued: fees.toString(),
      feesFormatted: ethers.formatUnits(fees, 18)
    };
  }

  async setProtocolFeeController(privateKey: string, controllerAddress: string): Promise<{ txHash: string; newController: string; gasUsed: string }> {
    const wallet = this.createWalletFromPrivateKey(privateKey);
    const poolManagerWithOwner = this.poolManager!.connect(wallet) as Contract;

    const tx = await poolManagerWithOwner.setProtocolFeeController(controllerAddress);
    const receipt: TransactionReceipt = await tx.wait();

    return {
      txHash: tx.hash,
      newController: controllerAddress,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  async setProtocolFee(privateKey: string, token0: string, token1: string, fee: number, protocolFee: number | { zeroForOne?: number; oneForZero?: number }): Promise<{ txHash: string; poolKey: PoolKey; protocolFee: number; zeroForOneFee: number; oneForZeroFee: number; gasUsed: string }> {
    const wallet = this.createWalletFromPrivateKey(privateKey);
    const poolManagerWithController = this.poolManager!.connect(wallet) as Contract;

    const [sortedToken0, sortedToken1] = token0.toLowerCase() < token1.toLowerCase()
      ? [token0, token1]
      : [token1, token0];

    const tickSpacing = this.getTickSpacingForFee(fee);

    const poolKey: PoolKey = {
      currency0: sortedToken0,
      currency1: sortedToken1,
      fee: fee,
      tickSpacing: tickSpacing,
      hooks: ethers.ZeroAddress
    };

    let encodedFee: number;
    if (typeof protocolFee === 'object') {
      const zeroForOneFee = Math.min(protocolFee.zeroForOne || 0, 1000);
      const oneForZeroFee = Math.min(protocolFee.oneForZero || 0, 1000);
      encodedFee = zeroForOneFee | (oneForZeroFee << 12);
    } else {
      const feeValue = Math.min(protocolFee, 1000);
      encodedFee = feeValue | (feeValue << 12);
    }

    const tx = await poolManagerWithController.setProtocolFee(poolKey, encodedFee);
    const receipt: TransactionReceipt = await tx.wait();

    return {
      txHash: tx.hash,
      poolKey,
      protocolFee: encodedFee,
      zeroForOneFee: encodedFee & 0xFFF,
      oneForZeroFee: (encodedFee >> 12) & 0xFFF,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  async collectProtocolFees(privateKey: string, recipient: string, tokenAddress: string, amount: string = "0"): Promise<{ txHash: string; recipient: string; tokenAddress: string; amountCollected: string; remainingFees: string; gasUsed: string }> {
    const wallet = this.createWalletFromPrivateKey(privateKey);
    const poolManagerWithController = this.poolManager!.connect(wallet) as Contract;

    const accruedBefore = await this.poolManager!.protocolFeesAccrued(tokenAddress);

    const amountToCollect = amount === "0" ? 0 : ethers.parseUnits(amount, 18);

    const tx = await poolManagerWithController.collectProtocolFees(recipient, tokenAddress, amountToCollect);
    const receipt: TransactionReceipt = await tx.wait();

    const accruedAfter = await this.poolManager!.protocolFeesAccrued(tokenAddress);

    return {
      txHash: tx.hash,
      recipient,
      tokenAddress,
      amountCollected: ethers.formatUnits(accruedBefore - accruedAfter, 18),
      remainingFees: ethers.formatUnits(accruedAfter, 18),
      gasUsed: receipt.gasUsed.toString()
    };
  }

  async getPoolProtocolFee(token0: string, token1: string, fee: number = 3000): Promise<PoolProtocolFeeResult> {
    const [sortedToken0, sortedToken1] = token0.toLowerCase() < token1.toLowerCase()
      ? [token0, token1]
      : [token1, token0];

    const tickSpacing = this.getTickSpacingForFee(fee);
    const poolKey: PoolKey = {
      currency0: sortedToken0,
      currency1: sortedToken1,
      fee: fee,
      tickSpacing: tickSpacing,
      hooks: ethers.ZeroAddress
    };

    const poolId = this.calculatePoolId(poolKey);

    const [sqrtPriceX96, tick, protocolFee, lpFee] = await this.stateView!.getSlot0(poolId);

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
      protocolFeeZeroForOne: (Number(protocolFee) & 0xFFF).toString(),
      protocolFeeOneForZero: ((Number(protocolFee) >> 12) & 0xFFF).toString(),
      lpFeePercent: (Number(lpFee) / 10000).toFixed(4) + '%'
    };
  }

  async getLPPositionInfo(token0: string, token1: string, fee: number = 3000, tickLower: number | null = null, tickUpper: number | null = null): Promise<PositionInfo> {
    const [sortedToken0, sortedToken1] = token0.toLowerCase() < token1.toLowerCase()
      ? [token0, token1]
      : [token1, token0];

    const tickSpacing = this.getTickSpacingForFee(fee);
    const poolKey: PoolKey = {
      currency0: sortedToken0,
      currency1: sortedToken1,
      fee: fee,
      tickSpacing: tickSpacing,
      hooks: ethers.ZeroAddress
    };

    const poolId = this.calculatePoolId(poolKey);

    const lower = tickLower !== null ? tickLower : this.MIN_TICK;
    const upper = tickUpper !== null ? tickUpper : this.MAX_TICK;

    const liquidityManagerAddr = await this.liquidityManager!.getAddress();

    try {
      const [liquidity, feeGrowthInside0LastX128, feeGrowthInside1LastX128] =
        await this.stateView!.getPositionInfo(
          poolId,
          liquidityManagerAddr,
          lower,
          upper,
          ethers.ZeroHash
        );

      const [feeGrowthInside0X128, feeGrowthInside1X128] =
        await this.stateView!.getFeeGrowthInside(poolId, lower, upper);

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
    } catch (error: any) {
      console.error('Error getting position info:', error.message);
      throw error;
    }
  }

  async collectLPFees(privateKey: string, token0: string, token1: string, fee: number = 3000, tickLower: number | null = null, tickUpper: number | null = null): Promise<CollectFeesResult> {
    const wallet = this.createWalletFromPrivateKey(privateKey);
    const liquidityManagerWithSigner = this.liquidityManager!.connect(wallet) as Contract;

    const [sortedToken0, sortedToken1] = token0.toLowerCase() < token1.toLowerCase()
      ? [token0, token1]
      : [token1, token0];

    const tickSpacing = this.getTickSpacingForFee(fee);
    const poolKey: PoolKey = {
      currency0: sortedToken0,
      currency1: sortedToken1,
      fee: fee,
      tickSpacing: tickSpacing,
      hooks: ethers.ZeroAddress
    };

    const lower = tickLower !== null ? tickLower : this.MIN_TICK;
    const upper = tickUpper !== null ? tickUpper : this.MAX_TICK;

    // Use new collectFees function that returns actual fees collected
    const tx = await liquidityManagerWithSigner.collectFees(
      poolKey,
      lower,
      upper
    );
    const receipt: TransactionReceipt = await tx.wait();
    
    // Parse the returned amounts from transaction logs or receipt
    // The collectFees function returns (amount0, amount1)
    let fees0Collected = '0';
    let fees1Collected = '0';
    
    // Try to decode from logs
    for (const log of receipt.logs) {
      try {
        const parsed = this.liquidityManager!.interface.parseLog(log);
        if (parsed && parsed.name === 'FeesCollected') {
          fees0Collected = ethers.formatEther(parsed.args.amount0);
          fees1Collected = ethers.formatEther(parsed.args.amount1);
          break;
        }
      } catch (e) {
        // Skip logs that don't match
      }
    }

    return {
      txHash: tx.hash,
      poolKey,
      tickLower: lower,
      tickUpper: upper,
      fees0Collected,
      fees1Collected,
      gasUsed: receipt.gasUsed.toString(),
      collector: wallet.address
    };
  }
}

export default new BlockchainService();
