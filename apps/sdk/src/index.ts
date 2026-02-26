/**
 * DEX SDK - Selendra DEX SDK
 *
 * A comprehensive SDK for interacting with the Selendra DEX (Uniswap V4-based)
 *
 * @example
 * ```typescript
 * import { DexSDK, createSDK } from '@dex/sdk';
 *
 * // Create SDK with config
 * const sdk = createSDK({
 *   rpcUrl: 'https://rpc-testnet.selendra.org',
 *   chainId: 1961,
 *   poolManagerAddress: '0x...',
 *   stateViewAddress: '0x...',
 *   liquidityManagerAddress: '0x...',
 *   swapRouterAddress: '0x...',
 * });
 *
 * // Initialize
 * await sdk.initialize();
 *
 * // Get pool info
 * const pool = await sdk.pool.getInfo(token0, token1);
 *
 * // Get swap quote
 * const quote = await sdk.swap.getQuote(tokenIn, tokenOut, '100');
 *
 * // Execute swap
 * const wallet = sdk.createWallet(privateKey);
 * const result = await sdk.swap.swap(wallet, tokenIn, tokenOut, '100');
 * ```
 */

// Main SDK class
export { DexSDK, getDefaultSDK, createSDK } from './sdk';

// Types
export * from './types';

// Constants
export * from './constants';

// ABIs (for advanced usage)
export * from './abi';

// Individual modules (for advanced usage)
export {
  TokenModule,
  PoolModule,
  LiquidityModule,
  SwapModule,
  OracleModule,
  ProtocolFeesModule,
} from './modules';

// Re-export ethers for convenience
export { ethers } from 'ethers';
