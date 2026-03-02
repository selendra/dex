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
  try {
    const response = await fetch(`${DEX_API_URL}/health`);
    const result: ApiResponse<{ status: string; message: string }> = await response.json();
    if (!result.success) {
      throw new Error('DEX API is not available');
    }
    return result.data;
  } catch {
    // Fallback: API not running, return local status
    return { status: 'local', message: 'Running in local-only mode (no backend)' };
  }
}

/**
 * Get all registered tokens
 * Falls back to local token registry if API is unavailable
 */
export async function getAllTokens(): Promise<TokenInfo[]> {
  try {
    const response = await fetch(`${DEX_API_URL}/tokens`);
    const result: ApiResponse<TokenInfo[]> = await response.json();

    if (result.success) {
      return result.data;
    }
  } catch {
    // API unavailable, fallback to local registry
  }

  // Fallback: Use local token registry
  const { REGISTERED_TOKENS } = await import('./tokenRegistry');
  return REGISTERED_TOKENS.map((t) => ({
    address: t.address,
    name: t.name,
    symbol: t.symbol,
    decimals: t.decimals,
    totalSupply: '0', // Will be fetched from SDK if needed
    description: t.description,
  }));
}

/**
 * Get pool information for a token pair
 * Falls back to SDK if API is unavailable
 */
export async function getPoolInfo(token0: string, token1: string): Promise<PoolInfo> {
  try {
    const response = await fetch(`${DEX_API_URL}/pools/${token0}/${token1}`);
    const result: ApiResponse<PoolInfo> = await response.json();

    if (result.success) {
      return result.data;
    }
  } catch {
    // API unavailable, fallback to SDK
  }

  // Fallback: Use SDK
  const { getSDK } = await import('./sdk');
  const sdk = getSDK();
  const poolInfo = await sdk.pool.getInfo(token0, token1);

  return {
    poolId: poolInfo.poolId,
    poolKey: poolInfo.poolKey,
    sqrtPriceX96: poolInfo.sqrtPriceX96,
    tick: poolInfo.tick.toString(),
    protocolFee: poolInfo.protocolFee || '0',
    lpFee: poolInfo.lpFee || '0',
    liquidity: poolInfo.liquidity,
  };
}

/**
 * Get token metadata (with enhanced Orange fields)
 * Falls back to SDK + local registry if API is unavailable
 */
export async function getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
  try {
    const response = await fetch(`${DEX_API_URL}/tokens/${tokenAddress}`);
    const result: ApiResponse<TokenInfo> = await response.json();

    if (result.success) {
      return result.data;
    }
  } catch {
    // API unavailable, fallback to SDK
  }

  // Fallback: Use SDK + local registry
  const { REGISTERED_TOKENS } = await import('./tokenRegistry');
  const registeredToken = REGISTERED_TOKENS.find(
    (t) => t.address.toLowerCase() === tokenAddress.toLowerCase()
  );

  if (registeredToken) {
    return {
      address: registeredToken.address,
      name: registeredToken.name,
      symbol: registeredToken.symbol,
      decimals: registeredToken.decimals,
      totalSupply: '0',
      description: registeredToken.description,
    };
  }

  // Try SDK if not in registry
  const { getSDK } = await import('./sdk');
  const sdk = getSDK();
  const info = await sdk.token.getInfo(tokenAddress);
  return {
    address: info.address,
    name: info.name,
    symbol: info.symbol,
    decimals: info.decimals,
    totalSupply: info.totalSupply || '0',
  };
}

/**
 * Get token balance for a specific account
 */
export async function getTokenBalance(
  tokenAddress: string,
  accountAddress: string
): Promise<string> {
  try {
    const response = await fetch(`${DEX_API_URL}/tokens/${tokenAddress}/balance/${accountAddress}`);
    const result: ApiResponse<{ balance: string }> = await response.json();

    if (result.success) {
      return result.data.balance;
    }
  } catch {
    // API unavailable, fallback to SDK
  }

  // Fallback: Use SDK
  const { getSDK } = await import('./sdk');
  const sdk = getSDK();
  return sdk.getTokenBalance(tokenAddress, accountAddress);
}

/**
 * Get swap quote
 * Falls back to SDK if API is unavailable
 */
export async function getSwapQuote(
  tokenIn: string,
  tokenOut: string,
  amountIn: string
): Promise<SwapQuoteData> {
  try {
    const response = await fetch(`${DEX_API_URL}/swap/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenIn, tokenOut, amountIn }),
    });

    const result: ApiResponse<SwapQuoteData> = await response.json();

    if (result.success) {
      return result.data;
    }
  } catch {
    // API unavailable, fallback to SDK
  }

  // Fallback: Use SDK
  const { getSDK } = await import('./sdk');
  const sdk = getSDK();
  const quote = await sdk.getSwapQuote(tokenIn, tokenOut, amountIn);
  return {
    tokenIn: quote.tokenIn,
    tokenOut: quote.tokenOut,
    amountIn: quote.amountIn,
    estimatedAmountOut: quote.estimatedAmountOut,
    price: quote.price,
    priceImpact: quote.priceImpact,
    fee: quote.fee,
    poolLiquidity: quote.poolLiquidity || '0',
  };
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
 * Falls back to SDK if API is unavailable
 */
export async function getLiquidityInfo(token0: string, token1: string): Promise<PoolInfo> {
  try {
    const response = await fetch(`${DEX_API_URL}/liquidity/${token0}/${token1}`);
    const result: ApiResponse<PoolInfo> = await response.json();

    if (result.success) {
      return result.data;
    }
  } catch {
    // API unavailable, fallback to SDK
  }

  // Fallback: Use SDK
  const { getSDK } = await import('./sdk');
  const sdk = getSDK();
  const poolInfo = await sdk.pool.getInfo(token0, token1);

  return {
    poolId: poolInfo.poolId,
    poolKey: poolInfo.poolKey,
    sqrtPriceX96: poolInfo.sqrtPriceX96,
    tick: poolInfo.tick.toString(),
    protocolFee: poolInfo.protocolFee || '0',
    lpFee: poolInfo.lpFee || '0',
    liquidity: poolInfo.liquidity,
  };
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
 * Falls back to SDK to fetch pool info
 */
export async function getAllPools(): Promise<PoolInfo[]> {
  try {
    const response = await fetch(`${DEX_API_URL}/pools`);
    const result: ApiResponse<PoolInfo[]> = await response.json();

    if (result.success) {
      return result.data;
    }
  } catch {
    // API unavailable, fallback to SDK
  }

  // Fallback: Use SDK to check pools between registered tokens
  const { REGISTERED_TOKENS } = await import('./tokenRegistry');
  const { getSDK } = await import('./sdk');
  const sdk = getSDK();

  const pools: PoolInfo[] = [];

  // Check pools for each token pair
  for (let i = 0; i < REGISTERED_TOKENS.length; i++) {
    for (let j = i + 1; j < REGISTERED_TOKENS.length; j++) {
      try {
        const token0 = REGISTERED_TOKENS[i].address;
        const token1 = REGISTERED_TOKENS[j].address;
        const poolInfo = await sdk.pool.getInfo(token0, token1);
        if (poolInfo.exists) {
          pools.push({
            poolId: poolInfo.poolId,
            poolKey: poolInfo.poolKey,
            sqrtPriceX96: poolInfo.sqrtPriceX96,
            tick: poolInfo.tick.toString(),
            protocolFee: poolInfo.protocolFee || '0',
            lpFee: poolInfo.lpFee || '0',
            liquidity: poolInfo.liquidity,
          });
        }
      } catch {
        // Pool doesn't exist, skip
      }
    }
  }

  return pools;
}
