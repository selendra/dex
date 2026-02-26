/**
 * Browser-compatible SDK wrapper for Selendra DEX
 * Mirrors the apps/sdk DexSDK API but works in the browser with MetaMask
 */

import { ethers, BrowserProvider, JsonRpcProvider, Contract } from 'ethers';

// ============== Types (mirrored from apps/sdk) ==============

export interface PoolKey {
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
}

export interface SwapQuote {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  estimatedAmountOut: string;
  price: number;
  priceImpact: string;
  fee: string;
}

export interface TxResult {
  hash: string;
  block: number | null;
}

export interface InitPoolResult extends TxResult {
  poolId: string;
  poolKey: PoolKey;
}

export interface PoolInfo {
  poolKey: PoolKey;
  poolId: string;
  sqrtPriceX96: string;
  tick: number;
  liquidity: string;
  price: number;
  exists: boolean;
}

export interface UnsignedTx {
  to: string;
  value: string;
  nonce: number;
  gasLimit: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  chainId: number;
  data: string;
}

export interface DexTokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
}

// ============== ABIs ==============

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function mint(address to, uint256 amount)',
  'function burn(uint256 amount)',
  'function burnFrom(address account, uint256 amount)',
];

const POOL_MANAGER_ABI = [
  'function initialize((address,address,uint24,int24,address) key, uint160 sqrtPriceX96) returns (int24)',
];

const STATE_VIEW_ABI = [
  'function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)',
  'function getLiquidity(bytes32 poolId) view returns (uint128)',
  'function getPositionInfo(bytes32 poolId, address owner, int24 tickLower, int24 tickUpper, bytes32 salt) view returns (uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128)',
];

const SWAP_ROUTER_ABI = [
  'function swap((address,address,uint24,int24,address) key, (bool,int256,uint160) params) returns (int256)',
];

const LIQUIDITY_MANAGER_ABI = [
  'function addLiquidity((address,address,uint24,int24,address) key, int24 tickLower, int24 tickUpper, int256 liquidityDelta) returns (int256, int256)',
  'function initializePool((address,address,uint24,int24,address) key, uint160 sqrtPriceX96) returns (int24)',
];

// ============== Config ==============

function getConfig() {
  return {
    rpcUrl: process.env.NEXT_PUBLIC_SELENDRA_RPC_URL || 'https://rpc-testnet.selendra.org',
    chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '1961'),
    poolManagerAddress: process.env.NEXT_PUBLIC_POOL_MANAGER_ADDRESS || '',
    stateViewAddress: process.env.NEXT_PUBLIC_STATE_VIEW_ADDRESS || '',
    liquidityManagerAddress: process.env.NEXT_PUBLIC_LIQUIDITY_MANAGER_ADDRESS || '',
    swapRouterAddress: process.env.NEXT_PUBLIC_SWAP_ROUTER_ADDRESS || '',
  };
}

// ============== Constants ==============

const MIN_PRICE_LIMIT = '4295128740';
const MAX_PRICE_LIMIT = '1461446703485210103287273052203988822378723970341';
const SQRT_PRICE_1_1 = '79228162514264337593543950336';
const MIN_TICK = -887220;
const MAX_TICK = 887220;
const FEE_TICK_SPACING: Record<number, number> = {
  100: 1,
  500: 10,
  3000: 60,
  10000: 200,
};

// ============== Selendra Browser SDK ==============

export class SelendraBrowserSDK {
  private readProvider: JsonRpcProvider;
  private chainId: number;
  private config: ReturnType<typeof getConfig>;

  // Contracts (read-only, connected to JsonRpcProvider)
  private stateView: Contract | null = null;
  private swapRouter: Contract | null = null;
  private liquidityManager: Contract | null = null;
  private poolManager: Contract | null = null;

  constructor() {
    this.config = getConfig();
    this.chainId = this.config.chainId;
    this.readProvider = new JsonRpcProvider(this.config.rpcUrl);
  }

  /** Get the chain ID */
  getChainId(): number {
    return this.chainId;
  }

  /** Get chain config for MetaMask */
  getChainConfig() {
    return {
      chainId: `0x${this.chainId.toString(16)}`,
      chainName: 'Selendra Testnet',
      rpcUrls: [this.config.rpcUrl],
      nativeCurrency: {
        name: 'SEL',
        symbol: 'SEL',
        decimals: 18,
      },
      blockExplorerUrls: ['https://explorer.selendra.org'],
    };
  }

  /** Initialize DEX contracts */
  private initContracts() {
    if (this.stateView) return; // already initialized

    const { poolManagerAddress, stateViewAddress, liquidityManagerAddress, swapRouterAddress } = this.config;

    if (!poolManagerAddress || !stateViewAddress || !liquidityManagerAddress || !swapRouterAddress) {
      throw new Error('Missing DEX contract addresses. Check environment variables.');
    }

    this.poolManager = new Contract(poolManagerAddress, POOL_MANAGER_ABI, this.readProvider);
    this.stateView = new Contract(stateViewAddress, STATE_VIEW_ABI, this.readProvider);
    this.liquidityManager = new Contract(liquidityManagerAddress, LIQUIDITY_MANAGER_ABI, this.readProvider);
    this.swapRouter = new Contract(swapRouterAddress, SWAP_ROUTER_ABI, this.readProvider);
  }

  /** Get BrowserProvider from MetaMask */
  private getBrowserProvider(): BrowserProvider {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask is not installed');
    }
    return new BrowserProvider(window.ethereum);
  }

  // ============== Read Operations ==============

  /** Get token info including name, symbol, decimals, and balance */
  async getTokenInfo(tokenAddress: string, walletAddress?: string): Promise<DexTokenInfo> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.readProvider);
    const [name, symbol, decimals, balance] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      walletAddress ? token.balanceOf(walletAddress) : BigInt(0),
    ]);
    return {
      address: tokenAddress,
      name,
      symbol,
      decimals: Number(decimals),
      balance: ethers.formatUnits(balance, decimals),
    };
  }

  /** Get native SEL balance */
  async getBalance(address: string): Promise<string> {
    const balance = await this.readProvider.getBalance(address);
    return ethers.formatEther(balance);
  }

  /** Get ERC20 token balance */
  async getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.readProvider);
    const [decimals, balance] = await Promise.all([
      token.decimals(),
      token.balanceOf(walletAddress),
    ]);
    return ethers.formatUnits(balance, decimals);
  }

  /** Get token allowance */
  async getTokenAllowance(tokenAddress: string, owner: string, spender: string): Promise<string> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.readProvider);
    const [decimals, allowance] = await Promise.all([
      token.decimals(),
      token.allowance(owner, spender),
    ]);
    return ethers.formatUnits(allowance, decimals);
  }

  /** Sort tokens for pool key */
  sortTokens(token0: string, token1: string): [string, string] {
    return token0.toLowerCase() < token1.toLowerCase() ? [token0, token1] : [token1, token0];
  }

  /** Get tick spacing for fee tier */
  getTickSpacing(fee: number): number {
    return FEE_TICK_SPACING[fee] || 60;
  }

  /** Create pool key */
  createPoolKey(token0: string, token1: string, fee: number = 3000): PoolKey {
    const [c0, c1] = this.sortTokens(token0, token1);
    return {
      currency0: c0,
      currency1: c1,
      fee,
      tickSpacing: this.getTickSpacing(fee),
      hooks: ethers.ZeroAddress,
    };
  }

  /** Calculate pool ID */
  calculatePoolId(poolKey: PoolKey): string {
    return ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint24', 'int24', 'address'],
        [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
      )
    );
  }

  /** Get swap quote (read-only, no MetaMask needed) */
  async getSwapQuote(tokenIn: string, tokenOut: string, amountIn: string | number): Promise<SwapQuote> {
    this.initContracts();

    const poolKey = this.createPoolKey(tokenIn, tokenOut);
    const poolId = this.calculatePoolId(poolKey);

    const [slot0, liquidity] = await Promise.all([
      this.stateView!.getSlot0(poolId),
      this.stateView!.getLiquidity(poolId),
    ]);

    const sqrtPriceX96 = BigInt(slot0[0]);
    const Q96 = BigInt(2) ** BigInt(96);
    const priceX192 = sqrtPriceX96 * sqrtPriceX96;
    const price = Number(priceX192) / Number(Q96 * Q96);

    const zeroForOne = tokenIn.toLowerCase() === poolKey.currency0.toLowerCase();
    const amountInNum = parseFloat(amountIn.toString());

    let estimatedAmountOut = zeroForOne ? amountInNum * price : amountInNum / price;
    const feePercent = poolKey.fee / 1000000;
    estimatedAmountOut *= 1 - feePercent;

    const liquidityNum = Number(ethers.formatEther(liquidity));
    const priceImpact = (amountInNum / liquidityNum) * 100;

    return {
      tokenIn,
      tokenOut,
      amountIn: amountIn.toString(),
      estimatedAmountOut: estimatedAmountOut.toFixed(18),
      price: zeroForOne ? price : 1 / price,
      priceImpact: priceImpact.toFixed(4) + '%',
      fee: (feePercent * 100).toFixed(2) + '%',
    };
  }

  /** Get swap router address */
  getSwapRouterAddress(): string {
    return this.config.swapRouterAddress;
  }

  /** Get liquidity manager address */
  getLiquidityManagerAddress(): string {
    return this.config.liquidityManagerAddress;
  }

  /** Get all contract addresses */
  getContractAddresses(): Record<string, string> {
    return {
      poolManager: this.config.poolManagerAddress,
      stateView: this.config.stateViewAddress,
      liquidityManager: this.config.liquidityManagerAddress,
      swapRouter: this.config.swapRouterAddress,
    };
  }

  /** Estimate gas for a transaction */
  async estimateGas(from: string, to: string, amount: string | number, data: string = '0x'): Promise<string> {
    const gasLimit = await this.readProvider.estimateGas({
      from,
      to,
      value: ethers.parseEther(amount.toString()),
      data,
    });
    return gasLimit.toString();
  }

  /** Verify a signed message and recover the signer address */
  verify(message: string, signature: string): string {
    return ethers.verifyMessage(message, signature);
  }

  /** Send a signed raw transaction */
  async sendSigned(signedTx: string): Promise<TxResult> {
    const tx = await this.readProvider.broadcastTransaction(signedTx);
    const receipt = await tx.wait();
    return { hash: receipt!.hash, block: receipt!.blockNumber };
  }

  // ============== Pool Read Operations ==============

  /** Get pool info (read-only) */
  async getPoolInfo(token0: string, token1: string, fee: number = 3000): Promise<PoolInfo> {
    this.initContracts();

    const poolKey = this.createPoolKey(token0, token1, fee);
    const poolId = this.calculatePoolId(poolKey);

    try {
      const [slot0, liquidity] = await Promise.all([
        this.stateView!.getSlot0(poolId),
        this.stateView!.getLiquidity(poolId),
      ]);

      const sqrtPriceX96 = BigInt(slot0[0]);
      const Q96 = BigInt(2) ** BigInt(96);
      const priceX192 = sqrtPriceX96 * sqrtPriceX96;
      const price = Number(priceX192) / Number(Q96 * Q96);

      return {
        poolKey,
        poolId,
        sqrtPriceX96: slot0[0].toString(),
        tick: Number(slot0[1]),
        liquidity: ethers.formatEther(liquidity),
        price,
        exists: sqrtPriceX96 > BigInt(0),
      };
    } catch {
      return {
        poolKey,
        poolId,
        sqrtPriceX96: '0',
        tick: 0,
        liquidity: '0',
        price: 0,
        exists: false,
      };
    }
  }

  /** Convert price ratio to sqrtPriceX96 */
  priceToSqrtPriceX96(price: number): string {
    const Q96 = BigInt(2) ** BigInt(96);
    const sqrtPrice = Math.sqrt(price);
    const sqrtPriceScaled = BigInt(Math.floor(sqrtPrice * 1e18));
    return ((sqrtPriceScaled * Q96) / BigInt(1e18)).toString();
  }

  // ============== Pool/Liquidity Transaction Operations ==============

  /**
   * Initialize a new pool via MetaMask
   * Returns the transaction result along with the pool key and pool ID
   */
  async initializePool(
    token0: string,
    token1: string,
    priceRatio: number = 1,
    fee: number = 3000
  ): Promise<InitPoolResult> {
    this.initContracts();

    const browserProvider = this.getBrowserProvider();
    const signer = await browserProvider.getSigner();

    const poolKey = this.createPoolKey(token0, token1, fee);
    const poolId = this.calculatePoolId(poolKey);
    const sqrtPriceX96 =
      priceRatio === 1 ? SQRT_PRICE_1_1 : this.priceToSqrtPriceX96(priceRatio);

    const lmInterface = new ethers.Interface(LIQUIDITY_MANAGER_ABI);
    const data = lmInterface.encodeFunctionData('initializePool', [
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
      sqrtPriceX96,
    ]);

    const tx = await signer.sendTransaction({
      to: this.config.liquidityManagerAddress,
      data,
      value: BigInt(0),
    });

    const receipt = await tx.wait();
    return { hash: receipt!.hash, block: receipt!.blockNumber, poolId, poolKey };
  }

  /**
   * Approve token for liquidity manager via MetaMask
   */
  async approveForLiquidity(tokenAddress: string, amount: string | number): Promise<string> {
    return this.approveToken(tokenAddress, this.config.liquidityManagerAddress, amount);
  }

  /**
   * Add liquidity to a pool via MetaMask
   */
  async addLiquidity(
    token0: string,
    token1: string,
    liquidityAmount: string | number,
    fee: number = 3000,
    tickLower?: number,
    tickUpper?: number
  ): Promise<TxResult> {
    this.initContracts();

    const browserProvider = this.getBrowserProvider();
    const signer = await browserProvider.getSigner();

    const poolKey = this.createPoolKey(token0, token1, fee);
    const liquidityDelta = ethers.parseEther(liquidityAmount.toString());

    const lmInterface = new ethers.Interface(LIQUIDITY_MANAGER_ABI);
    const data = lmInterface.encodeFunctionData('addLiquidity', [
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
      tickLower ?? MIN_TICK,
      tickUpper ?? MAX_TICK,
      liquidityDelta,
    ]);

    const tx = await signer.sendTransaction({
      to: this.config.liquidityManagerAddress,
      data,
      value: BigInt(0),
    });

    const receipt = await tx.wait();
    return { hash: receipt!.hash, block: receipt!.blockNumber };
  }

  /**
   * Remove liquidity from a pool via MetaMask
   */
  async removeLiquidity(
    token0: string,
    token1: string,
    liquidityAmount: string | number,
    fee: number = 3000,
    tickLower?: number,
    tickUpper?: number
  ): Promise<TxResult> {
    this.initContracts();

    const browserProvider = this.getBrowserProvider();
    const signer = await browserProvider.getSigner();

    const poolKey = this.createPoolKey(token0, token1, fee);
    const liquidityDelta = -ethers.parseEther(liquidityAmount.toString());

    const lmInterface = new ethers.Interface(LIQUIDITY_MANAGER_ABI);
    const data = lmInterface.encodeFunctionData('addLiquidity', [
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
      tickLower ?? MIN_TICK,
      tickUpper ?? MAX_TICK,
      liquidityDelta,
    ]);

    const tx = await signer.sendTransaction({
      to: this.config.liquidityManagerAddress,
      data,
      value: BigInt(0),
    });

    const receipt = await tx.wait();
    return { hash: receipt!.hash, block: receipt!.blockNumber };
  }

  // ============== Unsigned Transaction Creators (from apps/sdk) ==============

  /** Create unsigned native SEL transfer tx */
  async createTx(from: string, to: string, amount: string | number, data: string = '0x'): Promise<UnsignedTx> {
    const [nonce, feeData, gasLimit] = await Promise.all([
      this.readProvider.getTransactionCount(from),
      this.readProvider.getFeeData(),
      this.estimateGas(from, to, amount, data),
    ]);
    return {
      to,
      value: ethers.parseEther(amount.toString()).toString(),
      nonce,
      gasLimit,
      maxFeePerGas: feeData.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
      chainId: this.chainId,
      data,
    };
  }

  /** Create unsigned ERC20 transfer tx */
  async createTokenTx(from: string, tokenAddress: string, to: string, amount: string | number): Promise<UnsignedTx> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.readProvider);
    const decimals = await token.decimals();
    const value = ethers.parseUnits(amount.toString(), decimals);
    const data = token.interface.encodeFunctionData('transfer', [to, value]);
    const [nonce, feeData, gasLimit] = await Promise.all([
      this.readProvider.getTransactionCount(from),
      this.readProvider.getFeeData(),
      this.readProvider.estimateGas({ from, to: tokenAddress, data }),
    ]);
    return {
      to: tokenAddress,
      value: '0',
      nonce,
      gasLimit: gasLimit.toString(),
      maxFeePerGas: feeData.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
      chainId: this.chainId,
      data,
    };
  }

  /** Create unsigned ERC20 approve tx */
  async createApproveTx(from: string, tokenAddress: string, spender: string, amount: string | number): Promise<UnsignedTx> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.readProvider);
    const decimals = await token.decimals();
    const value = ethers.parseUnits(amount.toString(), decimals);
    const data = token.interface.encodeFunctionData('approve', [spender, value]);
    const [nonce, feeData, gasLimit] = await Promise.all([
      this.readProvider.getTransactionCount(from),
      this.readProvider.getFeeData(),
      this.readProvider.estimateGas({ from, to: tokenAddress, data }),
    ]);
    return {
      to: tokenAddress,
      value: '0',
      nonce,
      gasLimit: gasLimit.toString(),
      maxFeePerGas: feeData.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
      chainId: this.chainId,
      data,
    };
  }

  /** Create unsigned mint tx (requires minter role) */
  async createMintTx(from: string, tokenAddress: string, to: string, amount: string | number): Promise<UnsignedTx> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.readProvider);
    const decimals = await token.decimals();
    const value = ethers.parseUnits(amount.toString(), decimals);
    const data = token.interface.encodeFunctionData('mint', [to, value]);
    const [nonce, feeData, gasLimit] = await Promise.all([
      this.readProvider.getTransactionCount(from),
      this.readProvider.getFeeData(),
      this.readProvider.estimateGas({ from, to: tokenAddress, data }),
    ]);
    return {
      to: tokenAddress,
      value: '0',
      nonce,
      gasLimit: gasLimit.toString(),
      maxFeePerGas: feeData.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
      chainId: this.chainId,
      data,
    };
  }

  /** Create unsigned burn tx (burns from caller's balance) */
  async createBurnTx(from: string, tokenAddress: string, amount: string | number): Promise<UnsignedTx> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.readProvider);
    const decimals = await token.decimals();
    const value = ethers.parseUnits(amount.toString(), decimals);
    const data = token.interface.encodeFunctionData('burn', [value]);
    const [nonce, feeData, gasLimit] = await Promise.all([
      this.readProvider.getTransactionCount(from),
      this.readProvider.getFeeData(),
      this.readProvider.estimateGas({ from, to: tokenAddress, data }),
    ]);
    return {
      to: tokenAddress,
      value: '0',
      nonce,
      gasLimit: gasLimit.toString(),
      maxFeePerGas: feeData.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
      chainId: this.chainId,
      data,
    };
  }

  /** Create unsigned burnFrom tx (requires allowance) */
  async createBurnFromTx(from: string, tokenAddress: string, account: string, amount: string | number): Promise<UnsignedTx> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.readProvider);
    const decimals = await token.decimals();
    const value = ethers.parseUnits(amount.toString(), decimals);
    const data = token.interface.encodeFunctionData('burnFrom', [account, value]);
    const [nonce, feeData, gasLimit] = await Promise.all([
      this.readProvider.getTransactionCount(from),
      this.readProvider.getFeeData(),
      this.readProvider.estimateGas({ from, to: tokenAddress, data }),
    ]);
    return {
      to: tokenAddress,
      value: '0',
      nonce,
      gasLimit: gasLimit.toString(),
      maxFeePerGas: feeData.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
      chainId: this.chainId,
      data,
    };
  }

  /** Create unsigned initialize pool tx */
  async createInitializePoolTx(from: string, token0: string, token1: string, priceRatio: number = 1, fee: number = 3000): Promise<UnsignedTx> {
    this.initContracts();
    const poolKey = this.createPoolKey(token0, token1, fee);
    const sqrtPriceX96 = priceRatio === 1 ? SQRT_PRICE_1_1 : this.priceToSqrtPriceX96(priceRatio);
    const lmInterface = new ethers.Interface(LIQUIDITY_MANAGER_ABI);
    const data = lmInterface.encodeFunctionData('initializePool', [
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
      sqrtPriceX96,
    ]);
    const [nonce, feeData, gasLimit] = await Promise.all([
      this.readProvider.getTransactionCount(from),
      this.readProvider.getFeeData(),
      this.readProvider.estimateGas({ from, to: this.config.liquidityManagerAddress, data }).catch(() => BigInt(300000)),
    ]);
    return {
      to: this.config.liquidityManagerAddress,
      value: '0',
      nonce,
      gasLimit: gasLimit.toString(),
      gasPrice: feeData.gasPrice?.toString() || '0',
      chainId: this.chainId,
      data,
    };
  }

  /** Create unsigned approve tx for DEX contracts */
  async createApproveForDexTx(from: string, tokenAddress: string, amount: string | number, spender: 'router' | 'liquidity'): Promise<UnsignedTx> {
    const spenderAddress = spender === 'router'
      ? this.config.swapRouterAddress
      : this.config.liquidityManagerAddress;
    const token = new Contract(tokenAddress, ERC20_ABI, this.readProvider);
    const decimals = await token.decimals();
    const value = ethers.parseUnits(amount.toString(), decimals);
    const data = token.interface.encodeFunctionData('approve', [spenderAddress, value]);
    const [nonce, feeData, gasLimit] = await Promise.all([
      this.readProvider.getTransactionCount(from),
      this.readProvider.getFeeData(),
      this.readProvider.estimateGas({ from, to: tokenAddress, data }),
    ]);
    return {
      to: tokenAddress,
      value: '0',
      nonce,
      gasLimit: gasLimit.toString(),
      gasPrice: feeData.gasPrice?.toString() || '0',
      chainId: this.chainId,
      data,
    };
  }

  /** Create unsigned swap tx */
  async createSwapTx(from: string, tokenIn: string, tokenOut: string, amountIn: string | number): Promise<UnsignedTx> {
    this.initContracts();
    const poolKey = this.createPoolKey(tokenIn, tokenOut);
    const zeroForOne = tokenIn.toLowerCase() === poolKey.currency0.toLowerCase();
    const tokenContract = new Contract(tokenIn, ERC20_ABI, this.readProvider);
    const decimals = await tokenContract.decimals();
    const amount = ethers.parseUnits(amountIn.toString(), decimals);
    const swapParams = {
      zeroForOne,
      amountSpecified: -amount,
      sqrtPriceLimitX96: zeroForOne ? MIN_PRICE_LIMIT : MAX_PRICE_LIMIT,
    };
    const swapRouterInterface = new ethers.Interface(SWAP_ROUTER_ABI);
    const data = swapRouterInterface.encodeFunctionData('swap', [
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
      [swapParams.zeroForOne, swapParams.amountSpecified, swapParams.sqrtPriceLimitX96],
    ]);
    const [nonce, feeData, gasLimit] = await Promise.all([
      this.readProvider.getTransactionCount(from),
      this.readProvider.getFeeData(),
      this.readProvider.estimateGas({ from, to: this.config.swapRouterAddress, data }).catch(() => BigInt(300000)),
    ]);
    return {
      to: this.config.swapRouterAddress,
      value: '0',
      nonce,
      gasLimit: gasLimit.toString(),
      gasPrice: feeData.gasPrice?.toString() || '0',
      chainId: this.chainId,
      data,
    };
  }

  /** Create unsigned add liquidity tx */
  async createAddLiquidityTx(
    from: string,
    token0: string,
    token1: string,
    liquidityAmount: string | number,
    fee: number = 3000,
    tickLower?: number,
    tickUpper?: number
  ): Promise<UnsignedTx> {
    this.initContracts();
    const poolKey = this.createPoolKey(token0, token1, fee);
    const liquidityDelta = ethers.parseEther(liquidityAmount.toString());
    const lmInterface = new ethers.Interface(LIQUIDITY_MANAGER_ABI);
    const data = lmInterface.encodeFunctionData('addLiquidity', [
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
      tickLower ?? MIN_TICK,
      tickUpper ?? MAX_TICK,
      liquidityDelta,
    ]);
    const [nonce, feeData, gasLimit] = await Promise.all([
      this.readProvider.getTransactionCount(from),
      this.readProvider.getFeeData(),
      this.readProvider.estimateGas({ from, to: this.config.liquidityManagerAddress, data }).catch(() => BigInt(500000)),
    ]);
    return {
      to: this.config.liquidityManagerAddress,
      value: '0',
      nonce,
      gasLimit: gasLimit.toString(),
      gasPrice: feeData.gasPrice?.toString() || '0',
      chainId: this.chainId,
      data,
    };
  }

  /** Create unsigned remove liquidity tx */
  async createRemoveLiquidityTx(
    from: string,
    token0: string,
    token1: string,
    liquidityAmount: string | number,
    fee: number = 3000,
    tickLower?: number,
    tickUpper?: number
  ): Promise<UnsignedTx> {
    this.initContracts();
    const poolKey = this.createPoolKey(token0, token1, fee);
    const liquidityDelta = -ethers.parseEther(liquidityAmount.toString());
    const lmInterface = new ethers.Interface(LIQUIDITY_MANAGER_ABI);
    const data = lmInterface.encodeFunctionData('addLiquidity', [
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
      tickLower ?? MIN_TICK,
      tickUpper ?? MAX_TICK,
      liquidityDelta,
    ]);
    const [nonce, feeData, gasLimit] = await Promise.all([
      this.readProvider.getTransactionCount(from),
      this.readProvider.getFeeData(),
      this.readProvider.estimateGas({ from, to: this.config.liquidityManagerAddress, data }).catch(() => BigInt(500000)),
    ]);
    return {
      to: this.config.liquidityManagerAddress,
      value: '0',
      nonce,
      gasLimit: gasLimit.toString(),
      gasPrice: feeData.gasPrice?.toString() || '0',
      chainId: this.chainId,
      data,
    };
  }

  // ============== MetaMask Transaction Operations ==============

  /**
   * Approve token spending via MetaMask
   * @returns Transaction hash
   */
  async approveToken(
    tokenAddress: string,
    spender: string,
    amount: string | number
  ): Promise<string> {
    const browserProvider = this.getBrowserProvider();
    const signer = await browserProvider.getSigner();

    const token = new Contract(tokenAddress, ERC20_ABI, signer);
    const decimals = await token.decimals();
    const value = ethers.parseUnits(amount.toString(), decimals);

    const tx = await token.approve(spender, value);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Approve token for DEX swap router via MetaMask
   */
  async approveForSwap(tokenAddress: string, amount: string | number): Promise<string> {
    return this.approveToken(tokenAddress, this.config.swapRouterAddress, amount);
  }

  /**
   * Execute a swap via MetaMask signing
   * @returns Transaction result with hash
   */
  async executeSwap(
    tokenIn: string,
    tokenOut: string,
    amountIn: string | number
  ): Promise<TxResult> {
    this.initContracts();

    const browserProvider = this.getBrowserProvider();
    const signer = await browserProvider.getSigner();

    const poolKey = this.createPoolKey(tokenIn, tokenOut);
    const zeroForOne = tokenIn.toLowerCase() === poolKey.currency0.toLowerCase();

    const tokenContract = new Contract(tokenIn, ERC20_ABI, this.readProvider);
    const decimals = await tokenContract.decimals();
    const amount = ethers.parseUnits(amountIn.toString(), decimals);

    // Build swap params
    const swapParams = {
      zeroForOne,
      amountSpecified: -amount,
      sqrtPriceLimitX96: zeroForOne ? MIN_PRICE_LIMIT : MAX_PRICE_LIMIT,
    };

    // Encode swap data
    const swapRouterInterface = new ethers.Interface(SWAP_ROUTER_ABI);
    const data = swapRouterInterface.encodeFunctionData('swap', [
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
      [swapParams.zeroForOne, swapParams.amountSpecified, swapParams.sqrtPriceLimitX96],
    ]);

    // Send transaction through MetaMask
    const tx = await signer.sendTransaction({
      to: this.config.swapRouterAddress,
      data,
      value: BigInt(0),
    });

    const receipt = await tx.wait();
    return {
      hash: receipt!.hash,
      block: receipt!.blockNumber,
    };
  }

  /**
   * Send native SEL transfer via MetaMask
   */
  async sendNative(to: string, amount: string): Promise<TxResult> {
    const browserProvider = this.getBrowserProvider();
    const signer = await browserProvider.getSigner();

    const tx = await signer.sendTransaction({
      to,
      value: ethers.parseEther(amount),
    });

    const receipt = await tx.wait();
    return {
      hash: receipt!.hash,
      block: receipt!.blockNumber,
    };
  }

  /**
   * Send ERC20 token transfer via MetaMask
   */
  async sendToken(tokenAddress: string, to: string, amount: string | number): Promise<TxResult> {
    const browserProvider = this.getBrowserProvider();
    const signer = await browserProvider.getSigner();

    const token = new Contract(tokenAddress, ERC20_ABI, signer);
    const decimals = await token.decimals();
    const value = ethers.parseUnits(amount.toString(), decimals);

    const tx = await token.transfer(to, value);
    const receipt = await tx.wait();
    return {
      hash: receipt.hash,
      block: receipt.blockNumber,
    };
  }
}

// Export singleton
let _sdk: SelendraBrowserSDK | null = null;

export function getSDK(): SelendraBrowserSDK {
  if (!_sdk) {
    _sdk = new SelendraBrowserSDK();
  }
  return _sdk;
}

export default getSDK;
