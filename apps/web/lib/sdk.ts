/**
 * Browser-compatible SDK wrapper for Selendra DEX
 * Mirrors the @dex/sdk API but works in the browser with MetaMask
 *
 * This SDK provides the same interface as the server-side SDK but uses
 * BrowserProvider for MetaMask integration instead of JsonRpcProvider.
 */

import { ethers, BrowserProvider, JsonRpcProvider, Contract } from 'ethers';

// ============== Types (aligned with @dex/sdk) ==============

export interface PoolKey {
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
}

export interface PoolInfo {
  poolKey: PoolKey;
  poolId: string;
  sqrtPriceX96: string;
  tick: number;
  protocolFee?: string;
  lpFee?: string;
  liquidity: string;
  price: number;
  exists: boolean;
}

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply?: string;
  balance?: string;
}

export interface SwapQuote {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  estimatedAmountOut: string;
  price: number;
  priceImpact: string;
  fee: string;
  poolLiquidity?: string;
}

export interface TransactionResult {
  hash: string;
  block: number | null;
}

export interface InitPoolResult extends TransactionResult {
  poolId: string;
  poolKey: PoolKey;
}

export interface UnsignedTransaction {
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

export interface PositionInfo {
  token0: string;
  token1: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  poolId: string;
  positionOwner: string;
  liquidity: string;
  feeGrowthInside0LastX128: string;
  feeGrowthInside1LastX128: string;
}

export interface AllowanceResult {
  tokenAddress: string;
  owner: string;
  spender: string;
  allowance: string;
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
  'function owner() view returns (address)',
  'function protocolFeeController() view returns (address)',
  'function setProtocolFeeController(address controller)',
  'function setProtocolFee((address,address,uint24,int24,address) key, uint24 newProtocolFee)',
  'function collectProtocolFees(address recipient, address currency, uint256 amount) returns (uint256)',
  'function protocolFeesAccrued(address currency) view returns (uint256)',
];

const STATE_VIEW_ABI = [
  'function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)',
  'function getLiquidity(bytes32 poolId) view returns (uint128)',
  'function getPositionInfo(bytes32 poolId, address owner, int24 tickLower, int24 tickUpper, bytes32 salt) view returns (uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128)',
  'function getFeeGrowthGlobals(bytes32 poolId) view returns (uint256 feeGrowthGlobal0x128, uint256 feeGrowthGlobal1x128)',
];

const SWAP_ROUTER_ABI = [
  'function swap((address,address,uint24,int24,address) key, (bool,int256,uint160) params) returns (int256)',
  'function paused() view returns (bool)',
  'function pause()',
  'function unpause()',
];

const LIQUIDITY_MANAGER_ABI = [
  'function addLiquidity((address,address,uint24,int24,address) key, int24 tickLower, int24 tickUpper, int256 liquidityDelta) returns (int256, int256)',
  'function initializePool((address,address,uint24,int24,address) key, uint160 sqrtPriceX96) returns (int24)',
];

const PRICE_ORACLE_ABI = [
  'function getPrice(address token0, address token1) view returns (uint256 price, uint256 timestamp, bool isStale)',
  'function getTWAP(address token0, address token1, uint32 twapWindow) view returns (uint256)',
  'function feedPrice(address token0, address token1, uint256 price)',
  'function feedPricesBatch(address[] calldata token0s, address[] calldata token1s, uint256[] calldata prices)',
  'function setTwapWindow(uint32 _twapWindow)',
  'function setStalePriceThreshold(uint256 _threshold)',
  'function getPoolPrice(address token0, address token1) view returns (uint256 price, uint160 sqrtPriceX96)',
  'function getExternalPrice(address token0, address token1) view returns (uint256 price, uint256 timestamp, bool isValid)',
  'function twapWindow() view returns (uint32)',
  'function stalePriceThreshold() view returns (uint256)',
  'function poolManager() view returns (address)',
  'function stateView() view returns (address)',
  'function owner() view returns (address)',
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
    priceOracleAddress: process.env.NEXT_PUBLIC_PRICE_ORACLE_ADDRESS || '',
  };
}

// ============== Constants (aligned with @dex/sdk) ==============

export const MIN_PRICE_LIMIT = '4295128740';
export const MAX_PRICE_LIMIT = '1461446703485210103287273052203988822378723970341';
export const SQRT_PRICE_1_1 = '79228162514264337593543950336';
export const MIN_TICK = -887220;
export const MAX_TICK = 887220;
export const FEE_TICK_SPACING: Record<number, number> = {
  100: 1,
  500: 10,
  3000: 60,
  10000: 200,
};

// ============== Helper Functions ==============

function getBrowserProvider(): BrowserProvider {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask is not installed');
  }
  return new BrowserProvider(window.ethereum);
}

function sortTokens(token0: string, token1: string): [string, string] {
  return token0.toLowerCase() < token1.toLowerCase() ? [token0, token1] : [token1, token0];
}

function createPoolKey(token0: string, token1: string, fee: number = 3000): PoolKey {
  const [c0, c1] = sortTokens(token0, token1);
  return {
    currency0: c0,
    currency1: c1,
    fee,
    tickSpacing: FEE_TICK_SPACING[fee] || 60,
    hooks: ethers.ZeroAddress,
  };
}

function calculatePoolId(poolKey: PoolKey): string {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'address', 'uint24', 'int24', 'address'],
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
    )
  );
}

// ============== Token Module ==============

class TokenModule {
  private provider: JsonRpcProvider;

  constructor(provider: JsonRpcProvider) {
    this.provider = provider;
  }

  async getInfo(tokenAddress: string, walletAddress?: string): Promise<TokenInfo> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.provider);
    const [name, symbol, decimals, totalSupply, balance] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply(),
      walletAddress ? token.balanceOf(walletAddress) : BigInt(0),
    ]);
    return {
      address: tokenAddress,
      name,
      symbol,
      decimals: Number(decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      balance: walletAddress ? ethers.formatUnits(balance, decimals) : undefined,
    };
  }

  async getBalance(tokenAddress: string, walletAddress: string): Promise<string> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.provider);
    const [decimals, balance] = await Promise.all([
      token.decimals(),
      token.balanceOf(walletAddress),
    ]);
    return ethers.formatUnits(balance, decimals);
  }

  async getAllowance(
    tokenAddress: string,
    owner: string,
    spender: string
  ): Promise<AllowanceResult> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.provider);
    const [decimals, allowance] = await Promise.all([
      token.decimals(),
      token.allowance(owner, spender),
    ]);
    return {
      tokenAddress,
      owner,
      spender,
      allowance: ethers.formatUnits(allowance, decimals),
    };
  }

  async approve(
    tokenAddress: string,
    spender: string,
    amount: string | number
  ): Promise<TransactionResult> {
    const browserProvider = getBrowserProvider();
    const signer = await browserProvider.getSigner();
    const token = new Contract(tokenAddress, ERC20_ABI, signer);
    const decimals = await token.decimals();
    const value = ethers.parseUnits(amount.toString(), decimals);
    const tx = await token.approve(spender, value);
    const receipt = await tx.wait();
    return { hash: receipt.hash, block: receipt.blockNumber };
  }

  async transfer(
    tokenAddress: string,
    to: string,
    amount: string | number
  ): Promise<TransactionResult> {
    const browserProvider = getBrowserProvider();
    const signer = await browserProvider.getSigner();
    const token = new Contract(tokenAddress, ERC20_ABI, signer);
    const decimals = await token.decimals();
    const value = ethers.parseUnits(amount.toString(), decimals);
    const tx = await token.transfer(to, value);
    const receipt = await tx.wait();
    return { hash: receipt.hash, block: receipt.blockNumber };
  }
}

// ============== Pool Module ==============

class PoolModule {
  private provider: JsonRpcProvider;
  private config: ReturnType<typeof getConfig>;
  private stateView: Contract | null = null;
  private liquidityManager: Contract | null = null;
  private poolManager: Contract | null = null;

  constructor(provider: JsonRpcProvider) {
    this.provider = provider;
    this.config = getConfig();
    this.initContracts();
  }

  private initContracts() {
    const { poolManagerAddress, stateViewAddress, liquidityManagerAddress } = this.config;
    if (poolManagerAddress) {
      this.poolManager = new Contract(poolManagerAddress, POOL_MANAGER_ABI, this.provider);
    }
    if (stateViewAddress) {
      this.stateView = new Contract(stateViewAddress, STATE_VIEW_ABI, this.provider);
    }
    if (liquidityManagerAddress) {
      this.liquidityManager = new Contract(liquidityManagerAddress, LIQUIDITY_MANAGER_ABI, this.provider);
    }
  }

  sortTokens(token0: string, token1: string): [string, string] {
    return sortTokens(token0, token1);
  }

  getTickSpacing(fee: number): number {
    return FEE_TICK_SPACING[fee] || 60;
  }

  createPoolKey(token0: string, token1: string, fee: number = 3000): PoolKey {
    return createPoolKey(token0, token1, fee);
  }

  calculatePoolId(poolKey: PoolKey): string {
    return calculatePoolId(poolKey);
  }

  async getInfo(token0: string, token1: string, fee: number = 3000): Promise<PoolInfo> {
    if (!this.stateView) {
      throw new Error('StateView contract not configured');
    }

    const poolKey = this.createPoolKey(token0, token1, fee);
    const poolId = this.calculatePoolId(poolKey);

    try {
      const [slot0, liquidity] = await Promise.all([
        this.stateView.getSlot0(poolId),
        this.stateView.getLiquidity(poolId),
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
        protocolFee: slot0[2]?.toString(),
        lpFee: slot0[3]?.toString(),
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

  priceToSqrtPriceX96(price: number): string {
    const Q96 = BigInt(2) ** BigInt(96);
    const sqrtPrice = Math.sqrt(price);
    const sqrtPriceScaled = BigInt(Math.floor(sqrtPrice * 1e18));
    return ((sqrtPriceScaled * Q96) / BigInt(1e18)).toString();
  }

  async initializePool(
    token0: string,
    token1: string,
    priceRatio: number = 1,
    fee: number = 3000
  ): Promise<InitPoolResult> {
    const browserProvider = getBrowserProvider();
    const signer = await browserProvider.getSigner();

    const poolKey = this.createPoolKey(token0, token1, fee);
    const poolId = this.calculatePoolId(poolKey);
    const sqrtPriceX96 = priceRatio === 1 ? SQRT_PRICE_1_1 : this.priceToSqrtPriceX96(priceRatio);

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
}

// ============== Liquidity Module ==============

class LiquidityModule {
  private provider: JsonRpcProvider;
  private config: ReturnType<typeof getConfig>;
  private stateView: Contract | null = null;

  constructor(provider: JsonRpcProvider) {
    this.provider = provider;
    this.config = getConfig();
    this.initContracts();
  }

  private initContracts() {
    const { stateViewAddress } = this.config;
    if (stateViewAddress) {
      this.stateView = new Contract(stateViewAddress, STATE_VIEW_ABI, this.provider);
    }
  }

  async addLiquidity(
    token0: string,
    token1: string,
    liquidityAmount: string | number,
    fee: number = 3000,
    tickLower?: number,
    tickUpper?: number
  ): Promise<TransactionResult> {
    const browserProvider = getBrowserProvider();
    const signer = await browserProvider.getSigner();

    const poolKey = createPoolKey(token0, token1, fee);
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

  async removeLiquidity(
    token0: string,
    token1: string,
    liquidityAmount: string | number,
    fee: number = 3000,
    tickLower?: number,
    tickUpper?: number
  ): Promise<TransactionResult> {
    const browserProvider = getBrowserProvider();
    const signer = await browserProvider.getSigner();

    const poolKey = createPoolKey(token0, token1, fee);
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

  async getPositionInfo(
    ownerAddress: string,
    token0: string,
    token1: string,
    fee: number = 3000,
    tickLower?: number,
    tickUpper?: number
  ): Promise<PositionInfo | null> {
    if (!this.stateView) {
      throw new Error('StateView contract not configured');
    }

    const poolKey = createPoolKey(token0, token1, fee);
    const poolId = calculatePoolId(poolKey);

    try {
      const positionInfo = await this.stateView.getPositionInfo(
        poolId,
        ownerAddress,
        tickLower ?? MIN_TICK,
        tickUpper ?? MAX_TICK,
        ethers.ZeroHash
      );

      return {
        token0: poolKey.currency0,
        token1: poolKey.currency1,
        fee: poolKey.fee,
        tickLower: tickLower ?? MIN_TICK,
        tickUpper: tickUpper ?? MAX_TICK,
        poolId,
        positionOwner: ownerAddress,
        liquidity: positionInfo[0].toString(),
        feeGrowthInside0LastX128: positionInfo[1].toString(),
        feeGrowthInside1LastX128: positionInfo[2].toString(),
      };
    } catch {
      return null;
    }
  }
}

// ============== Swap Module ==============

class SwapModule {
  private provider: JsonRpcProvider;
  private config: ReturnType<typeof getConfig>;
  private stateView: Contract | null = null;
  private swapRouter: Contract | null = null;

  constructor(provider: JsonRpcProvider) {
    this.provider = provider;
    this.config = getConfig();
    this.initContracts();
  }

  private initContracts() {
    const { stateViewAddress, swapRouterAddress } = this.config;
    if (stateViewAddress) {
      this.stateView = new Contract(stateViewAddress, STATE_VIEW_ABI, this.provider);
    }
    if (swapRouterAddress) {
      this.swapRouter = new Contract(swapRouterAddress, SWAP_ROUTER_ABI, this.provider);
    }
  }

  async getQuote(tokenIn: string, tokenOut: string, amountIn: string | number): Promise<SwapQuote> {
    if (!this.stateView) {
      throw new Error('StateView contract not configured');
    }

    const poolKey = createPoolKey(tokenIn, tokenOut);
    const poolId = calculatePoolId(poolKey);

    const [slot0, liquidity] = await Promise.all([
      this.stateView.getSlot0(poolId),
      this.stateView.getLiquidity(poolId),
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
    const priceImpact = liquidityNum > 0 ? (amountInNum / liquidityNum) * 100 : 0;

    return {
      tokenIn,
      tokenOut,
      amountIn: amountIn.toString(),
      estimatedAmountOut: estimatedAmountOut.toFixed(18),
      price: zeroForOne ? price : 1 / price,
      priceImpact: priceImpact.toFixed(4) + '%',
      fee: (feePercent * 100).toFixed(2) + '%',
      poolLiquidity: liquidityNum.toString(),
    };
  }

  async swap(tokenIn: string, tokenOut: string, amountIn: string | number): Promise<TransactionResult> {
    const browserProvider = getBrowserProvider();
    const signer = await browserProvider.getSigner();

    const poolKey = createPoolKey(tokenIn, tokenOut);
    const zeroForOne = tokenIn.toLowerCase() === poolKey.currency0.toLowerCase();

    const tokenContract = new Contract(tokenIn, ERC20_ABI, this.provider);
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

    const tx = await signer.sendTransaction({
      to: this.config.swapRouterAddress,
      data,
      value: BigInt(0),
    });

    const receipt = await tx.wait();
    return { hash: receipt!.hash, block: receipt!.blockNumber };
  }

  async isPaused(): Promise<boolean> {
    if (!this.swapRouter) {
      throw new Error('SwapRouter contract not configured');
    }
    return this.swapRouter.paused();
  }

  getRouterAddress(): string {
    return this.config.swapRouterAddress;
  }
}

// ============== Oracle Module ==============

class OracleModule {
  private provider: JsonRpcProvider;
  private config: ReturnType<typeof getConfig>;
  private priceOracle: Contract | null = null;

  constructor(provider: JsonRpcProvider) {
    this.provider = provider;
    this.config = getConfig();
    this.initContracts();
  }

  private initContracts() {
    const { priceOracleAddress } = this.config;
    if (priceOracleAddress) {
      this.priceOracle = new Contract(priceOracleAddress, PRICE_ORACLE_ABI, this.provider);
    }
  }

  isConfigured(): boolean {
    return !!this.priceOracle;
  }

  async getPrice(token0: string, token1: string): Promise<{
    price: string;
    timestamp: string;
    isStale: boolean;
  }> {
    if (!this.priceOracle) {
      throw new Error('PriceOracle contract not configured');
    }

    const [sorted0, sorted1] = sortTokens(token0, token1);
    const result = await this.priceOracle.getPrice(sorted0, sorted1);

    return {
      price: ethers.formatUnits(result[0], 18),
      timestamp: result[1].toString(),
      isStale: result[2],
    };
  }

  async getTWAP(token0: string, token1: string, twapWindow?: number): Promise<string> {
    if (!this.priceOracle) {
      throw new Error('PriceOracle contract not configured');
    }

    const [sorted0, sorted1] = sortTokens(token0, token1);
    const window = twapWindow ?? 300; // Default 5 minutes
    const twap = await this.priceOracle.getTWAP(sorted0, sorted1, window);

    return ethers.formatUnits(twap, 18);
  }

  async getPoolPrice(token0: string, token1: string): Promise<{
    price: string;
    sqrtPriceX96: string;
  }> {
    if (!this.priceOracle) {
      throw new Error('PriceOracle contract not configured');
    }

    const [sorted0, sorted1] = sortTokens(token0, token1);
    const result = await this.priceOracle.getPoolPrice(sorted0, sorted1);

    return {
      price: ethers.formatUnits(result[0], 18),
      sqrtPriceX96: result[1].toString(),
    };
  }

  async feedPrice(
    token0: string,
    token1: string,
    price: string | number
  ): Promise<TransactionResult> {
    if (!this.priceOracle) {
      throw new Error('PriceOracle contract not configured');
    }

    const browserProvider = getBrowserProvider();
    const signer = await browserProvider.getSigner();

    const [sorted0, sorted1] = sortTokens(token0, token1);
    const priceWei = ethers.parseUnits(price.toString(), 18);

    const oracleWithSigner = this.priceOracle.connect(signer) as Contract;
    const tx = await oracleWithSigner.feedPrice(sorted0, sorted1, priceWei);
    const receipt = await tx.wait();

    return { hash: receipt.hash, block: receipt.blockNumber };
  }
}

// ============== Protocol Fees Module ==============

class ProtocolFeesModule {
  private provider: JsonRpcProvider;
  private config: ReturnType<typeof getConfig>;
  private poolManager: Contract | null = null;

  constructor(provider: JsonRpcProvider) {
    this.provider = provider;
    this.config = getConfig();
    this.initContracts();
  }

  private initContracts() {
    const { poolManagerAddress } = this.config;
    if (poolManagerAddress) {
      this.poolManager = new Contract(poolManagerAddress, POOL_MANAGER_ABI, this.provider);
    }
  }

  async getController(): Promise<string> {
    if (!this.poolManager) {
      throw new Error('PoolManager contract not configured');
    }
    return this.poolManager.protocolFeeController();
  }

  async getOwner(): Promise<string> {
    if (!this.poolManager) {
      throw new Error('PoolManager contract not configured');
    }
    return this.poolManager.owner();
  }

  async setProtocolFeeController(controllerAddress: string): Promise<TransactionResult> {
    if (!this.poolManager) {
      throw new Error('PoolManager contract not configured');
    }

    const browserProvider = getBrowserProvider();
    const signer = await browserProvider.getSigner();

    const pmWithSigner = this.poolManager.connect(signer) as Contract;
    const tx = await pmWithSigner.setProtocolFeeController(controllerAddress);
    const receipt = await tx.wait();

    return { hash: receipt.hash, block: receipt.blockNumber };
  }

  async collectProtocolFees(
    recipient: string,
    currency: string,
    amount: string | number
  ): Promise<TransactionResult> {
    if (!this.poolManager) {
      throw new Error('PoolManager contract not configured');
    }

    const browserProvider = getBrowserProvider();
    const signer = await browserProvider.getSigner();

    const amountWei = ethers.parseEther(amount.toString());
    const pmWithSigner = this.poolManager.connect(signer) as Contract;
    const tx = await pmWithSigner.collectProtocolFees(recipient, currency, amountWei);
    const receipt = await tx.wait();

    return { hash: receipt.hash, block: receipt.blockNumber };
  }

  async getFeesAccrued(tokenAddress: string): Promise<{
    tokenAddress: string;
    feesAccrued: string;
    feesFormatted: string;
  }> {
    if (!this.poolManager) {
      throw new Error('PoolManager contract not configured');
    }

    const fees = await this.poolManager.protocolFeesAccrued(tokenAddress);

    return {
      tokenAddress,
      feesAccrued: fees.toString(),
      feesFormatted: ethers.formatUnits(fees, 18),
    };
  }

  isConfigured(): boolean {
    return !!this.poolManager;
  }
}

// ============== Main SDK Class ==============

export class SelendraBrowserSDK {
  private readProvider: JsonRpcProvider;
  private chainId: number;
  private config: ReturnType<typeof getConfig>;

  // Modules (aligned with @dex/sdk)
  public readonly token: TokenModule;
  public readonly pool: PoolModule;
  public readonly liquidity: LiquidityModule;
  public readonly swap: SwapModule;
  public readonly oracle: OracleModule;
  public readonly protocolFees: ProtocolFeesModule;

  constructor() {
    this.config = getConfig();
    this.chainId = this.config.chainId;
    this.readProvider = new JsonRpcProvider(this.config.rpcUrl);

    // Initialize modules
    this.token = new TokenModule(this.readProvider);
    this.pool = new PoolModule(this.readProvider);
    this.liquidity = new LiquidityModule(this.readProvider);
    this.swap = new SwapModule(this.readProvider);
    this.oracle = new OracleModule(this.readProvider);
    this.protocolFees = new ProtocolFeesModule(this.readProvider);
  }

  // ============== Chain & Config ==============

  getChainId(): number {
    return this.chainId;
  }

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

  getContractAddresses(): Record<string, string> {
    return {
      poolManager: this.config.poolManagerAddress,
      stateView: this.config.stateViewAddress,
      liquidityManager: this.config.liquidityManagerAddress,
      swapRouter: this.config.swapRouterAddress,
      priceOracle: this.config.priceOracleAddress,
    };
  }

  getSwapRouterAddress(): string {
    return this.config.swapRouterAddress;
  }

  getLiquidityManagerAddress(): string {
    return this.config.liquidityManagerAddress;
  }

  // ============== Native Balance ==============

  async getNativeBalance(address: string): Promise<string> {
    const balance = await this.readProvider.getBalance(address);
    return ethers.formatEther(balance);
  }

  // ============== Convenience Methods (backwards compatibility) ==============

  async getTokenInfo(tokenAddress: string, walletAddress?: string): Promise<TokenInfo> {
    return this.token.getInfo(tokenAddress, walletAddress);
  }

  async getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string> {
    return this.token.getBalance(tokenAddress, walletAddress);
  }

  async getTokenAllowance(tokenAddress: string, owner: string, spender: string): Promise<string> {
    const result = await this.token.getAllowance(tokenAddress, owner, spender);
    return result.allowance;
  }

  async getPoolInfo(token0: string, token1: string, fee: number = 3000): Promise<PoolInfo> {
    return this.pool.getInfo(token0, token1, fee);
  }

  async getSwapQuote(tokenIn: string, tokenOut: string, amountIn: string | number): Promise<SwapQuote> {
    return this.swap.getQuote(tokenIn, tokenOut, amountIn);
  }

  async executeSwap(tokenIn: string, tokenOut: string, amountIn: string | number): Promise<TransactionResult> {
    return this.swap.swap(tokenIn, tokenOut, amountIn);
  }

  async initializePool(
    token0: string,
    token1: string,
    priceRatio: number = 1,
    fee: number = 3000
  ): Promise<InitPoolResult> {
    return this.pool.initializePool(token0, token1, priceRatio, fee);
  }

  async addLiquidity(
    token0: string,
    token1: string,
    liquidityAmount: string | number,
    fee: number = 3000,
    tickLower?: number,
    tickUpper?: number
  ): Promise<TransactionResult> {
    return this.liquidity.addLiquidity(token0, token1, liquidityAmount, fee, tickLower, tickUpper);
  }

  async removeLiquidity(
    token0: string,
    token1: string,
    liquidityAmount: string | number,
    fee: number = 3000,
    tickLower?: number,
    tickUpper?: number
  ): Promise<TransactionResult> {
    return this.liquidity.removeLiquidity(token0, token1, liquidityAmount, fee, tickLower, tickUpper);
  }

  // ============== Token Approvals ==============

  async approveToken(tokenAddress: string, spender: string, amount: string | number): Promise<string> {
    const result = await this.token.approve(tokenAddress, spender, amount);
    return result.hash;
  }

  async approveForSwap(tokenAddress: string, amount: string | number): Promise<string> {
    return this.approveToken(tokenAddress, this.config.swapRouterAddress, amount);
  }

  async approveForLiquidity(tokenAddress: string, amount: string | number): Promise<string> {
    return this.approveToken(tokenAddress, this.config.liquidityManagerAddress, amount);
  }

  // ============== Native Transfers ==============

  async sendNative(to: string, amount: string): Promise<TransactionResult> {
    const browserProvider = getBrowserProvider();
    const signer = await browserProvider.getSigner();

    const tx = await signer.sendTransaction({
      to,
      value: ethers.parseEther(amount),
    });

    const receipt = await tx.wait();
    return { hash: receipt!.hash, block: receipt!.blockNumber };
  }

  // ============== Token Transfers ==============

  async sendToken(tokenAddress: string, to: string, amount: string | number): Promise<TransactionResult> {
    return this.token.transfer(tokenAddress, to, amount);
  }

  // ============== Utility Methods ==============

  sortTokens(token0: string, token1: string): [string, string] {
    return sortTokens(token0, token1);
  }

  getTickSpacing(fee: number): number {
    return FEE_TICK_SPACING[fee] || 60;
  }

  createPoolKey(token0: string, token1: string, fee: number = 3000): PoolKey {
    return createPoolKey(token0, token1, fee);
  }

  calculatePoolId(poolKey: PoolKey): string {
    return calculatePoolId(poolKey);
  }

  priceToSqrtPriceX96(price: number): string {
    return this.pool.priceToSqrtPriceX96(price);
  }

  async estimateGas(from: string, to: string, amount: string | number, data: string = '0x'): Promise<string> {
    const gasLimit = await this.readProvider.estimateGas({
      from,
      to,
      value: ethers.parseEther(amount.toString()),
      data,
    });
    return gasLimit.toString();
  }

  verify(message: string, signature: string): string {
    return ethers.verifyMessage(message, signature);
  }

  async sendSigned(signedTx: string): Promise<TransactionResult> {
    const tx = await this.readProvider.broadcastTransaction(signedTx);
    const receipt = await tx.wait();
    return { hash: receipt!.hash, block: receipt!.blockNumber };
  }

  // ============== Unsigned Transaction Creators ==============

  async createTx(from: string, to: string, amount: string | number, data: string = '0x'): Promise<UnsignedTransaction> {
    const [nonce, feeData, gasLimit] = await Promise.all([
      this.readProvider.getTransactionCount(from),
      this.readProvider.getFeeData(),
      this.estimateGas(from, to, amount.toString(), data),
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

  async createTokenTx(from: string, tokenAddress: string, to: string, amount: string | number): Promise<UnsignedTransaction> {
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

  async createApproveTx(from: string, tokenAddress: string, spender: string, amount: string | number): Promise<UnsignedTransaction> {
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

  async createSwapTx(from: string, tokenIn: string, tokenOut: string, amountIn: string | number): Promise<UnsignedTransaction> {
    const poolKey = createPoolKey(tokenIn, tokenOut);
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

  async createAddLiquidityTx(
    from: string,
    token0: string,
    token1: string,
    liquidityAmount: string | number,
    fee: number = 3000,
    tickLower?: number,
    tickUpper?: number
  ): Promise<UnsignedTransaction> {
    const poolKey = createPoolKey(token0, token1, fee);
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

  async createInitializePoolTx(from: string, token0: string, token1: string, priceRatio: number = 1, fee: number = 3000): Promise<UnsignedTransaction> {
    const poolKey = createPoolKey(token0, token1, fee);
    const sqrtPriceX96 = priceRatio === 1 ? SQRT_PRICE_1_1 : this.pool.priceToSqrtPriceX96(priceRatio);
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
}

// ============== Singleton Export ==============

let _sdk: SelendraBrowserSDK | null = null;

export function getSDK(): SelendraBrowserSDK {
  if (!_sdk) {
    _sdk = new SelendraBrowserSDK();
  }
  return _sdk;
}

export default getSDK;
