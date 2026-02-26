/**
 * Constants for DEX operations
 */

// sqrt(1) * 2^96 - represents 1:1 price ratio
export const SQRT_PRICE_1_1 = '79228162514264337593543950336';

// Full range ticks
export const MIN_TICK = -887220;
export const MAX_TICK = 887220;

// Default fee tier (0.3%)
export const FEE_MEDIUM = 3000;
export const TICK_SPACING_MEDIUM = 60;

// Price limits for swaps
// MIN_SQRT_PRICE = 4295128739 + 1
export const MIN_PRICE_LIMIT = '4295128740';
// MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342 - 1
export const MAX_PRICE_LIMIT = '1461446703485210103287273052203988822378723970341';

// Fee tier to tick spacing mapping (Uniswap V4 standard)
export const FEE_TICK_SPACING: Record<number, number> = {
  100: 1,     // 0.01% fee -> tick spacing 1
  500: 10,    // 0.05% fee -> tick spacing 10
  3000: 60,   // 0.30% fee -> tick spacing 60
  10000: 200, // 1.00% fee -> tick spacing 200
};

// Default Selendra network configuration
export const DEFAULT_RPC_URL = 'https://rpc-testnet.selendra.org';
export const DEFAULT_CHAIN_ID = 1961;
