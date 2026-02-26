import { ethers } from 'ethers';

// ============== SDK Configuration ==============
export interface SDKConfig {
  rpcUrl?: string;
  chainId?: number;
  poolManagerAddress?: string;
  stateViewAddress?: string;
  liquidityManagerAddress?: string;
  swapRouterAddress?: string;
  priceOracleAddress?: string;
  privateKey?: string;
}

// ============== Pool Types ==============
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
  tick: string;
  protocolFee: string;
  lpFee: string;
  liquidity: string;
  price?: number;
}

export interface PoolInitializeResult {
  poolKey: PoolKey;
  txHash: string;
  priceRatio: number;
  sqrtPriceX96: string;
  gasUsed?: string;
}

// ============== Token Types ==============
export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply?: string;
  balance?: string;
}

export interface TokenBalances {
  native: string;
  tokens: Record<string, string>;
}

export interface TransferResult {
  txHash: string;
  from: string;
  to: string;
  amount: string;
  tokenAddress: string;
  gasUsed: string;
}

export interface ApproveResult {
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

// ============== Swap Types ==============
export interface SwapParams {
  zeroForOne: boolean;
  amountSpecified: bigint;
  sqrtPriceLimitX96: string;
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
export interface AddLiquidityParams {
  token0: string;
  token1: string;
  amount0: number;
  amount1: number;
  tickLower?: number;
  tickUpper?: number;
}

export interface AddLiquidityResult {
  poolKey: PoolKey;
  txHash: string;
  liquidityDelta: string;
  amount0Deposited: string;
  amount1Deposited: string;
  fromWallet?: string;
}

export interface RemoveLiquidityResult {
  poolKey: PoolKey;
  txHash: string;
  liquidityRemoved: string;
  liquidityDelta: string;
  gasUsed: string;
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

export interface CollectFeesResult {
  txHash: string;
  poolKey: PoolKey;
  tickLower: number;
  tickUpper: number;
  fees0Collected: string;
  fees1Collected: string;
  gasUsed: string;
  collector: string;
}

// ============== Oracle Types ==============
export interface PriceInfo {
  price: string;
  twap: string;
  lastUpdate: string;
  fromPool: boolean;
  isStale: boolean;
}

export interface PoolPrice {
  price: string;
  sqrtPriceX96: string;
}

export interface ExternalPrice {
  price: string;
  timestamp: string;
  isValid: boolean;
}

export interface TWAPInfo {
  twap: string;
}

export interface FeedPriceResult {
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

// ============== Protocol Fee Types ==============
export interface ProtocolFeeInfo {
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

export interface ProtocolFeesAccrued {
  tokenAddress: string;
  feesAccrued: string;
  feesFormatted: string;
}

export interface CollectProtocolFeesResult {
  txHash: string;
  recipient: string;
  tokenAddress: string;
  amountCollected: string;
  remainingFees: string;
  gasUsed: string;
}

// ============== Admin Types ==============
export interface AdminResult {
  txHash: string;
  account?: string;
  authorized?: boolean;
  paused?: boolean;
  oldAdmin?: string;
  newAdmin?: string;
  gasUsed: string;
}

// ============== Transaction Types ==============
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

export interface TransactionResult {
  hash: string;
  block: number;
}

// ============== Contract Instances ==============
// Using any type for contracts since ethers.Contract methods are dynamically generated
export type ERC20Contract = ethers.Contract;
export type PoolManagerContract = ethers.Contract;
export type StateViewContract = ethers.Contract;
export type LiquidityManagerContract = ethers.Contract;
export type SwapRouterContract = ethers.Contract;
export type PriceOracleContract = ethers.Contract;

// Helper type for connected contract
export type ConnectedContract<T> = T;
