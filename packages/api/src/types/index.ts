import { Contract, Wallet, JsonRpcProvider } from 'ethers';

// ============== Pool Types ==============

export interface PoolKey {
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
}

export interface SwapParams {
  zeroForOne: boolean;
  amountSpecified: bigint;
  sqrtPriceLimitX96: string;
}

export interface PoolInfo {
  poolKey: PoolKey;
  poolId: string;
  sqrtPriceX96: string;
  tick: string;
  protocolFee: string;
  lpFee: string;
  liquidity: string;
}

// ============== Token Types ==============

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
}

export interface TokenBalances {
  native: string;
  tokens: Record<string, string>;
}

// ============== Swap Types ==============

export interface SwapQuote {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  estimatedAmountOut: string;
  price: number;
  priceImpact: string;
  fee: string;
  poolLiquidity: string;
}

export interface SwapResult {
  txHash: string;
  poolKey: PoolKey;
  amountIn: string;
  amountOut: string;
  minAmountOut: string;
  zeroForOne: boolean;
  gasUsed: string;
  userAddress: string;
}

// ============== Liquidity Types ==============

export interface LiquidityResult {
  poolKey: PoolKey;
  txHash: string;
  liquidityDelta: string;
  amount0Deposited?: string;
  amount1Deposited?: string;
  liquidityRemoved?: string;
  fromWallet?: string;
  gasUsed?: string;
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
  liquidityFormatted: string;
  feeGrowthInside0LastX128: string;
  feeGrowthInside1LastX128: string;
  currentFeeGrowth0X128: string;
  currentFeeGrowth1X128: string;
  fees0Owed: string;
  fees1Owed: string;
  fees0OwedFormatted: string;
  fees1OwedFormatted: string;
}

// ============== Price Oracle Types ==============

export interface PriceInfo {
  price: string;
  twap: string;
  lastUpdate: string;
  fromPool: boolean;
  isStale: boolean;
}

export interface PriceData {
  price: string;
  timestamp: string;
  isValid: boolean;
}

export interface PriceFeedResult {
  txHash: string;
  token0: string;
  token1: string;
  price: string;
  gasUsed: string;
}

export interface OracleConfig {
  defaultFee: string;
  defaultTickSpacing: string;
  maxPriceAge: string;
  twapWindow: string;
  admin: string;
}

// ============== Admin Types ==============

export interface AdminResult {
  txHash: string;
  gasUsed: string;
  [key: string]: string | boolean;
}

export interface ProtocolFeeInfo {
  protocolFeeController: string;
  poolManagerOwner: string;
}

export interface ProtocolFeeResult {
  txHash: string;
  gasUsed: string;
  tokenAddress?: string;
  feesAccrued?: string;
  feesFormatted?: string;
}

// ============== Transaction Types ==============

export interface TransferResult {
  txHash: string;
  from: string;
  to: string;
  amount: string;
  tokenAddress: string;
  gasUsed: string;
}

export interface ApprovalResult {
  txHash: string;
  owner: string;
  spender: string;
  amount: string;
  tokenAddress: string;
  gasUsed: string;
}

export interface AllowanceResult {
  tokenAddress: string;
  owner: string;
  spender: string;
  allowance: string;
}

// ============== API Request/Response Types ==============

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: string;
}

export interface SwapRequest {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut?: string;
  privateKey: string;
}

export interface QuoteRequest {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  privateKey?: string;
}

export interface LiquidityAddRequest {
  token0: string;
  token1: string;
  amount0: string;
  amount1: string;
  privateKey: string;
  tickLower?: number;
  tickUpper?: number;
}

export interface LiquidityRemoveRequest {
  token0: string;
  token1: string;
  liquidityAmount: string;
  privateKey: string;
  tickLower?: number;
  tickUpper?: number;
}

export interface PoolInitRequest {
  token0: string;
  token1: string;
  priceRatio?: number;
  privateKey: string;
}

export interface TokenTransferRequest {
  tokenAddress: string;
  toAddress: string;
  amount: string;
  privateKey: string;
}

export interface TokenApproveRequest {
  tokenAddress: string;
  spenderAddress: string;
  amount: string;
  privateKey: string;
}

// ============== Fee Tick Spacing Map ==============

export interface FeeTickSpacingMap {
  [fee: number]: number;
}

// ============== Blockchain Service Types ==============

export interface BlockchainServiceInterface {
  poolManager: Contract | null;
  stateView: Contract | null;
  liquidityManager: Contract | null;
  swapRouter: Contract | null;
  priceOracle: Contract | null;
  tokens: Record<string, Contract>;
  signer: Wallet | null;
  provider: JsonRpcProvider | null;
  
  initialize(): Promise<boolean>;
  createWalletFromPrivateKey(privateKey: string): Wallet;
  getAddressFromPrivateKey(privateKey: string): string;
  loadToken(tokenAddress: string): Promise<Contract>;
  loadTokenWithWallet(tokenAddress: string, wallet: Wallet): Contract;
  getTokenInfo(tokenAddress: string): Promise<TokenInfo>;
  getTokenBalance(tokenAddr: string, accountAddr?: string | null): Promise<string>;
  getNativeBalance(accountAddr?: string | null): Promise<string>;
  getUserBalances(accountAddr: string, tokenAddresses?: string[]): Promise<TokenBalances>;
  
  // Pool operations
  sortTokens(token0Addr: string, token1Addr: string): [string, string];
  createPoolKey(token0Addr: string, token1Addr: string, fee?: number | null, tickSpacing?: number | null): PoolKey;
  calculatePoolId(poolKey: PoolKey): string;
  initializePool(token0Addr: string, token1Addr: string, priceRatio?: number | null): Promise<{ poolKey: PoolKey; txHash: string; priceRatio: number; sqrtPriceX96: string }>;
  initializePoolWithWallet(userWallet: Wallet, token0Addr: string, token1Addr: string, priceRatio?: number | null): Promise<{ poolKey: PoolKey; txHash: string; priceRatio: number; sqrtPriceX96: string; gasUsed: string }>;
  getPoolInfo(token0Addr: string, token1Addr: string): Promise<PoolInfo>;
  getAllPoolsInfo(tokenAddresses: string[]): Promise<PoolInfo[]>;
  
  // Liquidity operations
  addLiquidity(token0Addr: string, token1Addr: string, amount0: number, amount1: number, tickLower?: number | null, tickUpper?: number | null): Promise<LiquidityResult>;
  addLiquidityWithWallet(userWallet: Wallet, token0Addr: string, token1Addr: string, amount0: number, amount1: number, tickLower?: number | null, tickUpper?: number | null): Promise<LiquidityResult>;
  removeLiquidity(token0Addr: string, token1Addr: string, liquidityAmount: number, tickLower?: number | null, tickUpper?: number | null): Promise<LiquidityResult>;
  
  // Swap operations
  getSwapQuote(tokenInAddr: string, tokenOutAddr: string, amountIn: number): Promise<SwapQuote>;
  executeSwap(tokenInAddr: string, tokenOutAddr: string, amountIn: number, minAmountOut?: number, userWallet?: Wallet | null): Promise<SwapResult>;
}
