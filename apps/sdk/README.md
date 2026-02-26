# DEX SDK

A comprehensive TypeScript SDK for interacting with the Selendra DEX (Uniswap V4-based).

## Installation

```bash
pnpm add @dex/sdk
```

## Quick Start

```typescript
import { createSDK } from '@dex/sdk';

// Create SDK instance
const sdk = createSDK({
  rpcUrl: 'https://rpc-testnet.selendra.org',
  chainId: 1961,
  poolManagerAddress: '0x...',
  stateViewAddress: '0x...',
  liquidityManagerAddress: '0x...',
  swapRouterAddress: '0x...',
});

// Initialize SDK
await sdk.initialize();

// Create a wallet
const wallet = sdk.createWallet('0x...');

// Get token info
const tokenInfo = await sdk.token.getInfo('0x...');

// Get swap quote
const quote = await sdk.swap.getQuote(tokenIn, tokenOut, '100');

// Execute swap
const result = await sdk.swap.swap(wallet, tokenIn, tokenOut, '100');
```

## Features

### Token Operations
- Get token info (name, symbol, decimals, totalSupply)
- Get token balance
- Transfer tokens
- Approve spender
- Get allowance
- Mint/Burn tokens (for test tokens)

### Pool Operations
- Initialize new pools
- Get pool info (price, liquidity, tick)
- Get all pools for a set of tokens
- Create pool keys and calculate pool IDs

### Liquidity Operations
- Add liquidity to pools
- Remove liquidity
- Get position info
- Collect LP fees

### Swap Operations
- Get swap quotes
- Execute swaps
- Pause/unpause swaps (admin)

### Oracle Operations
- Get price (from pool or external feed)
- Get TWAP
- Feed external prices (authorized feeders)
- Get oracle configuration

### Protocol Fees
- Get protocol fee configuration
- Set protocol fees (admin)
- Collect protocol fees

## Environment Variables

The SDK can read configuration from environment variables:

```env
SELENDRA_RPC_URL=https://rpc-testnet.selendra.org
SELENDRA_CHAIN_ID=1961
SELENDRA_POOL_MANAGER_ADDRESS=0x...
SELENDRA_STATE_VIEW_ADDRESS=0x...
SELENDRA_LIQUIDITY_MANAGER_ADDRESS=0x...
SELENDRA_SWAP_ROUTER_ADDRESS=0x...
SELENDRA_PRICE_ORACLE_ADDRESS=0x...
PRIVATE_KEY=0x...  # Optional default signer
```

## API Reference

### DexSDK

Main SDK class with access to all modules:

- `sdk.token` - Token operations
- `sdk.pool` - Pool operations
- `sdk.liquidity` - Liquidity operations
- `sdk.swap` - Swap operations
- `sdk.oracle` - Oracle operations
- `sdk.protocolFees` - Protocol fee operations

### Token Module

```typescript
// Get token info
const info = await sdk.token.getInfo(tokenAddress);

// Get balance
const balance = await sdk.token.getBalance(tokenAddress, accountAddress);

// Transfer
const result = await sdk.token.transfer(wallet, tokenAddress, toAddress, amount);

// Approve
const result = await sdk.token.approve(wallet, tokenAddress, spenderAddress, amount);
```

### Pool Module

```typescript
// Get pool info
const pool = await sdk.pool.getInfo(token0, token1);

// Initialize pool
const result = await sdk.pool.initializePool(wallet, token0, token1, priceRatio);

// Create pool key
const poolKey = sdk.pool.createPoolKey(token0, token1, fee);

// Calculate pool ID
const poolId = sdk.pool.calculatePoolId(poolKey);
```

### Liquidity Module

```typescript
// Add liquidity
const result = await sdk.liquidity.addLiquidity(
  wallet,
  token0,
  token1,
  amount0,
  amount1
);

// Remove liquidity
const result = await sdk.liquidity.removeLiquidity(
  wallet,
  token0,
  token1,
  liquidityAmount
);

// Get position info
const position = await sdk.liquidity.getPositionInfo(token0, token1);

// Collect fees
const fees = await sdk.liquidity.collectFees(wallet, token0, token1);
```

### Swap Module

```typescript
// Get quote
const quote = await sdk.swap.getQuote(tokenIn, tokenOut, amountIn);

// Execute swap
const result = await sdk.swap.swap(wallet, tokenIn, tokenOut, amountIn, minAmountOut);
```

### Oracle Module

```typescript
// Get price
const price = await sdk.oracle.getPrice(token0, token1);

// Get TWAP
const twap = await sdk.oracle.getTWAP(token0, token1);

// Feed price (authorized feeder)
const result = await sdk.oracle.feedPrice(wallet, token0, token1, price);
```

## Building

```bash
pnpm build
```

## Development

```bash
pnpm dev  # Watch mode
```

## License

MIT
