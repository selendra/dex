/**
 * DEX API Client for Swap Interface
 * Connects to Orange backend API (which wraps the DEX API)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
const DEX_API_URL = `${API_BASE_URL}/api/dex`;

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  error?: string;
}

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
}

// Enhanced token info with Orange metadata
export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  // Extended Orange fields
  logoUrl?: string;
  description?: string;
  projectId?: string;
  website?: string;
  isActive?: boolean;
}

export interface SwapQuoteData {
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
  amountIn: string;
  amountOut: string;
}

// Pool data from SDK getPoolInfo
export interface PoolData {
  poolKey: PoolKey;
  poolId: string;
  sqrtPriceX96: string;
  tick: number;
  liquidity: string;
  price: number;
  exists: boolean;
}

// Token with its associated pools
export interface TokenWithPools {
  token: TokenInfo;
  pools: {
    pool: PoolData;
    pairedToken: TokenInfo;
    fee: string;
  }[];
}

/**
 * Build a list of tokens with their associated initialized pools
 */
export function buildTokensWithPools(tokens: TokenInfo[], pools: PoolData[]): TokenWithPools[] {
  return tokens
    .map((token) => {
      const tokenPools = pools
        .filter(
          (p) =>
            p.poolKey.currency0.toLowerCase() === token.address.toLowerCase() ||
            p.poolKey.currency1.toLowerCase() === token.address.toLowerCase()
        )
        .map((p) => {
          const pairedAddress =
            p.poolKey.currency0.toLowerCase() === token.address.toLowerCase()
              ? p.poolKey.currency1
              : p.poolKey.currency0;
          const pairedToken = tokens.find(
            (t) => t.address.toLowerCase() === pairedAddress.toLowerCase()
          ) || {
            address: pairedAddress,
            name: 'Unknown',
            symbol: '???',
            decimals: 18,
            totalSupply: '0',
          };
          return {
            pool: p,
            pairedToken,
            fee: `${(p.poolKey.fee / 10000).toFixed(2)}%`,
          };
        });

      return { token, pools: tokenPools };
    })
    .filter((tw) => tw.pools.length > 0);
}

/**
 * Health check - verify API is running
 */
export async function checkHealth(): Promise<{ status: string; message: string }> {
  const response = await fetch(`${DEX_API_URL}/health`);
  const result: ApiResponse<{ status: string; message: string }> = await response.json();
  if (!result.success) {
    throw new Error('DEX API is not available');
  }
  return result.data;
}

/**
 * Get all registered tokens
 */
export async function getAllTokens(): Promise<TokenInfo[]> {
  const response = await fetch(`${DEX_API_URL}/tokens`);
  const result: ApiResponse<TokenInfo[]> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to get tokens');
  }

  return result.data;
}

/**
 * Get pool information for a token pair
 */
export async function getPoolInfo(token0: string, token1: string): Promise<PoolInfo> {
  const response = await fetch(`${DEX_API_URL}/pools/${token0}/${token1}`);
  const result: ApiResponse<PoolInfo> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to get pool info');
  }

  return result.data;
}

/**
 * Get token metadata (with enhanced Orange fields)
 */
export async function getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
  const response = await fetch(`${DEX_API_URL}/tokens/${tokenAddress}`);
  const result: ApiResponse<TokenInfo> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to get token info');
  }

  return result.data;
}

/**
 * Get token balance for a specific account
 */
export async function getTokenBalance(
  tokenAddress: string,
  accountAddress: string
): Promise<string> {
  const response = await fetch(`${DEX_API_URL}/tokens/${tokenAddress}/balance/${accountAddress}`);

  const result: ApiResponse<{ balance: string }> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to get token balance');
  }

  return result.data.balance;
}

/**
 * Get swap quote
 */
export async function getSwapQuote(
  tokenIn: string,
  tokenOut: string,
  amountIn: string
): Promise<SwapQuoteData> {
  const response = await fetch(`${DEX_API_URL}/swap/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokenIn, tokenOut, amountIn }),
  });

  const result: ApiResponse<SwapQuoteData> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to get swap quote');
  }

  return result.data;
}

/**
 * Execute an authenticated user swap (self-custody)
 */
export async function executeUserSwap(
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  minAmountOut: string,
  authToken: string
): Promise<SwapResult> {
  const response = await fetch(`${DEX_API_URL}/swap/user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ tokenIn, tokenOut, amountIn, minAmountOut }),
  });

  const result: ApiResponse<SwapResult> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to execute swap');
  }

  return result.data;
}

/**
 * Get liquidity info for a pool
 */
export async function getLiquidityInfo(token0: string, token1: string): Promise<PoolInfo> {
  const response = await fetch(`${DEX_API_URL}/liquidity/${token0}/${token1}`);

  const result: ApiResponse<PoolInfo> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to get liquidity info');
  }

  return result.data;
}

/**
 * Get token symbol by address from cached token list
 */
export function getTokenSymbolFromList(address: string, tokens: TokenInfo[]): string | null {
  const token = tokens.find((t) => t.address.toLowerCase() === address.toLowerCase());
  return token?.symbol ?? null;
}

/**
 * Save pool contract pair to database after on-chain initialization
 */
export async function savePoolToDatabase(poolData: {
  poolId: string;
  token0: string;
  token1: string;
  fee: number;
  tickSpacing: number;
  displayName?: string;
  description?: string;
}): Promise<void> {
  const response = await fetch(`${DEX_API_URL}/pools/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(poolData),
  });

  const result: ApiResponse<unknown> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to save pool to database');
  }
}

/**
 * Get all saved pools from database
 */
export async function getAllPools(): Promise<PoolInfo[]> {
  const response = await fetch(`${DEX_API_URL}/pools`);
  const result: ApiResponse<PoolInfo[]> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to get pools');
  }

  return result.data;
}
