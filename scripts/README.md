# Scripts Directory

## Structure

### `deploy/` - Deployment Scripts
Scripts for deploying contracts and initializing the DEX:

- **deploy.js** - Deploy core Uniswap V4 contracts (PoolManager, PositionManager, SwapRouter, StateView)
- **deploy-4-test-tokens.js** - Deploy 4 test tokens with specific price ratios
  - TOKENS (stable coin)
  - TOKENA (10:1 ratio)
  - TOKENB (20:1 ratio)
  - TOKENC (1:1 ratio)
- **deploy-test-routers.js** - Deploy custom liquidity and swap routers
- **deploy-tokens.js** - Deploy basic test tokens
- **initialize-pool.js** - Initialize a single pool with specific parameters

### `test/` - Test Scripts
Scripts for testing DEX functionality:

- **test-complete-workflow.js** - ✅ **RECOMMENDED** - Complete end-to-end test showing:
  - Pool initialization
  - Token approvals
  - Adding liquidity
  - Executing swaps with correct parameters
  
- **test-4-tokens-FINAL.js** - Legacy test script (may have syntax issues)
- **try-all-swap-variations.js** - Diagnostic script for testing different swap parameters
- **manual-swap-test.js** - Simple manual swap test
- **demo-slippage-control.js** - Demonstrate slippage protection
- **init-3-pools.js** - Initialize 3 pools separately
- **test-swap-working.js** - Basic working swap example
- **test-swap.js** - Simple swap test

## Quick Start

### 1. Deploy Everything
```bash
# Terminal 1: Start Hardhat node
npm run node

# Terminal 2: Deploy core contracts
node scripts/deploy/deploy.js

# Deploy test tokens
node scripts/deploy/deploy-4-test-tokens.js

# Deploy custom routers
node scripts/deploy/deploy-test-routers.js
```

### 2. Run Complete Test
```bash
# Run full workflow test (initializes pools, adds liquidity, executes swaps)
node scripts/test/test-complete-workflow.js
```

## Notes

- All scripts use explicit nonce management to prevent ethers.js v6 caching issues
- Token addresses are sorted automatically for PoolKey construction
- Swap parameters: `[zeroForOne, exactOutput, priceLimit]`
  - For token0->token1: `zeroForOne=true, priceLimit="4295128740"`
  - For token1->token0: `zeroForOne=false, priceLimit="1461446703485210103287273052203988822378723970342"`
