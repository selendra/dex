# Quick Start Guide

## 🚀 Complete Setup (from scratch)

### Terminal 1: Start Hardhat Node
```bash
npm run node
```

### Terminal 2: Deploy Everything
```bash
# 1. Deploy core contracts (PoolManager, SwapRouter, etc.)
npm run deploy:local

# 2. Deploy test tokens (TOKENS, TOKENA, TOKENB, TOKENC)
npm run deploy:tokens

# 3. Deploy custom routers (SimpleLiquidityManager, WorkingSwapRouter)
npm run deploy:routers
```

### Terminal 3: Run Tests
```bash
# Run complete workflow test (initializes pools, adds liquidity, executes swaps)
npm run test:workflow
```

## 📁 Project Structure

```
scripts/
├── deploy/          # Deployment scripts
│   ├── deploy.js                      # Core contracts
│   ├── deploy-4-test-tokens.js        # Test tokens
│   ├── deploy-test-routers.js         # Custom routers
│   └── ...
│
└── test/            # Test scripts
    ├── test-complete-workflow.js      # ✅ Main test (RECOMMENDED)
    ├── try-all-swap-variations.js     # Swap parameter diagnostics
    └── ...
```

## ✅ Expected Results

When you run `npm run test:workflow`, you should see:

```
🚀 COMPLETE 4-TOKEN DEX WORKFLOW TEST

STEP 1: INITIALIZE POOLS
✅ TOKENA/TOKENS (10:1) initialized
✅ TOKENB/TOKENS (20:1) initialized
✅ TOKENC/TOKENS (1:1) initialized

STEP 2: APPROVE TOKENS
✅ All tokens approved

STEP 3: ADD LIQUIDITY
✅ TOKENC/TOKENS: Added 100000000000000000000

STEP 4: EXECUTE SWAPS
✅ SUCCESS! Spent 5.08 TOKENC, Got 5.0 TOKENS

✅✅✅ WORKFLOW COMPLETE! ✅✅✅
```

## 🔧 Available NPM Commands

- `npm run node` - Start Hardhat local network
- `npm run compile` - Compile smart contracts
- `npm run deploy:local` - Deploy core Uniswap V4 contracts
- `npm run deploy:tokens` - Deploy 4 test tokens
- `npm run deploy:routers` - Deploy custom liquidity/swap routers
- `npm run test:workflow` - Run complete end-to-end test
- `npm run clean` - Clean artifacts and cache

## 📝 Notes

- **Nonce Management**: All scripts use explicit `{ nonce: nonce++ }` to prevent ethers.js v6 caching issues
- **Token Sorting**: Addresses are automatically sorted for PoolKey (currency0 < currency1)
- **Swap Parameters**: 
  - token0→token1: `[true, +amount, "4295128740"]`
  - token1→token0: `[false, +amount, "1461446703485210103287273052203988822378723970342"]`
