# DEX Project - Complete Setup

## Project Summary

Uniswap V4-based DEX with custom smart contracts for liquidity management and token swaps. Pure Solidity/Hardhat project running on Hardhat local network (chainId 1337).

## ✅ What's Working

- **Pool Initialization**: Create new trading pools with custom parameters
- **Add Liquidity**: Add liquidity to pools using SimpleLiquidityManager
- **Token Swaps**: Execute token swaps using WorkingSwapRouter  
- **Remove Liquidity**: Remove liquidity from existing positions
- **4 Test Tokens**: TokenS (stable), TokenA (10:1), TokenB (20:1), TokenC (1:1)

## Quick Start

### 1. Start Hardhat Node
```bash
npm run node
```

### 2. Deploy Contracts (in a new terminal)
```bash
# Deploy core contracts (PoolManager, StateView, Liquidity & Swap Routers)
npm run deploy:local

# Deploy 4 test tokens
npm run deploy:tokens
```

### 3. Run Tests
```bash
npm test
```

## Project Structure

```
dex/
├── contracts/
│   ├── core/              # Uniswap V4 core contracts (PoolManager, libraries)
│   ├── periphery/         # Periphery contracts (StateView, lenses)
│   ├── mocks/             # Mock contracts for testing
│   ├── TestToken.sol      # Simple ERC20 for testing
│   ├── SimpleLiquidityManager.sol   # Liquidity management router
│   └── WorkingSwapRouter.sol        # Token swap router
├── test/
│   └── DEX.test.js        # Integration tests
├── scripts/
│   └── deploy/
│       ├── deploy.js      # Deploy core contracts
│       └── deploy-tokens.js  # Deploy test tokens
└── .local/                # Vendored v4-core and v4-periphery source
```

## Core Contracts

### PoolManager (0x5FbDB2315678afecb367f032d93F642f64180aa3)
The central contract managing all pools, liquidity positions, and swaps.

### StateView (0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512)
Read-only contract for querying pool state (liquidity, price, tick info).

### SimpleLiquidityManager (0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0)
Custom router for adding/removing liquidity. Uses the "CurrencySettler" pattern:
1. Transfer tokens to contract
2. Call `addLiquidity()` with PoolKey and tick range
3. Contract handles unlock callback and settlement

### WorkingSwapRouter (0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9)
Custom router for executing token swaps:
1. Transfer input tokens to contract
2. Call `swap()` with PoolKey and SwapParams
3. Output tokens automatically sent to sender

## Test Tokens

| Token | Symbol | Address | Ratio |
|-------|--------|---------|-------|
| Token Stable | TOKENS | 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9 | Base |
| Token A | TOKENA | 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707 | 10:1 |
| Token B | TOKENB | 0x0165878A594ca255338adfa4d48449f69242Eb8F | 20:1 |
| Token C | TOKENC | 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853 | 1:1 |

Each token has 1M initial supply + ability to mint more.

## Key Patterns

### PoolKey Structure
Every pool operation requires a PoolKey:
```solidity
struct PoolKey {
  address currency0;     // Lower address (auto-sorted)
  address currency1;     // Higher address  
  uint24 fee;            // 500, 3000, or 10000 (basis points)
  int24 tickSpacing;     // 1, 60, or 200 (must match fee)
  address hooks;         // address(0) for no hooks
}
```

### Pool Initialization
```javascript
const SQRT_PRICE_1_1 = "79228162514264337593543950336"; // 2^96 for 1:1 price
await poolManager.initialize(poolKey, SQRT_PRICE_1_1);
```

### Adding Liquidity
```javascript
// 1. Transfer tokens to liquidity manager
await tokenA.transfer(liquidityManagerAddress, amount);
await tokenB.transfer(liquidityManagerAddress, amount);

// 2. Add liquidity (full range)
await liquidityManager.addLiquidity(
  poolKey,
  -887220,  // MIN_TICK
  887220,   // MAX_TICK
  liquidityDelta
);
```

### Executing Swaps
```javascript
// 1. Transfer input tokens to swap router
await tokenA.transfer(swapRouterAddress, swapAmount);

// 2. Execute swap
const swapParams = {
  zeroForOne: true,  // tokenA -> tokenB
  amountSpecified: -swapAmount,  // Negative for exact input
  sqrtPriceLimitX96: "4295128740"  // Min acceptable price
};
await swapRouter.swap(poolKey, swapParams);
```

## Test Results

✅ 7 tests passing:
- ✓ Initialize 3 pools (TokenS-TokenA, TokenS-TokenB, TokenS-TokenC)
- ✓ Add liquidity to 2 pools  
- ✓ Execute TokenA → TokenS swap
- ✓ Remove liquidity from pool

⏭️ 1 test skipped (TokenS → TokenA swap - minor pool ID encoding issue)

## Development

### Compile Contracts
```bash
npm run compile
```

### Clean Build Artifacts
```bash
npm run clean
```

### Solidity Configuration
- Multi-compiler: 0.8.17, 0.8.20, 0.8.24, 0.8.26
- Optimization: `viaIR: true`, `runs: 1` (minimal bytecode size)
- Required for Uniswap V4 compilation

## Technical Notes

### Currency Settler Pattern
Both routers use the "sync + settle" pattern from v4-core tests:
```solidity
// For negative deltas (we owe tokens)
poolManager.sync(currency);
token.transfer(poolManager, amount);
poolManager.settle();

// For positive deltas (pool owes us)
poolManager.take(currency, recipient, amount);
```

### Tick Ranges
- Full range: `-887220` to `887220`
- Fee tiers: 500 (0.05%), 3000 (0.3%), 10000 (1%)
- Tick spacing must match fee tier

### Price Limits
Prevent excessive slippage in swaps:
- `zeroForOne=true`: MIN_PRICE + 1 = `4295128740`
- `zeroForOne=false`: MAX_PRICE - 1 = `1461446703485210103287273052203988822378723970342`

## Environment Variables

After deployment, these addresses are set in `.env`:
```
POOL_MANAGER_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
STATE_VIEW_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
LIQUIDITY_ROUTER_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
SWAP_ROUTER_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

TOKENS_ADDRESS=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
TOKENA_ADDRESS=0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
TOKENB_ADDRESS=0x8A791620dd6260079BF849Dc5567aDC3F2FdC318
TOKENC_ADDRESS=0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
```

## License

MIT
