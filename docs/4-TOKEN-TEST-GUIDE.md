# 4-Token DEX Test - Complete Setup

## Tokens Deployed

| Token | Symbol | Address | Value |
|-------|--------|---------|-------|
| Token Stable | TOKENS | `0x9A676e781A523b5d0C0e43731313A708CB607508` | Base (1:1) |
| Token A | TOKENA | `0x0B306BF915C4d645ff596e518fAf3F9669b97016` | 10 TOKENA = 1 TOKENS |
| Token B | TOKENB | `0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1` | 20 TOKENB = 1 TOKENS |
| Token C | TOKENC | `0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE` | 1 TOKENC = 1 TOKENS |

## Routers Deployed

| Contract | Address |
|----------|---------|
| SimpleLiquidityManager | `0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1` |
| WorkingSwapRouter | `0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44` |

## Quick Start

### 1. Deploy Tokens
```bash
npx hardhat run scripts/deploy-4-test-tokens.js --network localhost
```

### 2. Deploy Routers
```bash
npx hardhat run scripts/deploy-test-routers.js --network localhost
```

### 3. Update .env
```bash
TOKENS_ADDRESS=0x9A676e781A523b5d0C0e43731313A708CB607508
TOKENA_ADDRESS=0x0B306BF915C4d645ff596e518fAf3F9669b97016
TOKENB_ADDRESS=0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1
TOKENC_ADDRESS=0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE
LIQUIDITY_ROUTER_ADDRESS=0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1
SWAP_ROUTER_ADDRESS=0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44
```

### 4. Run Complete Workflow Test
```bash
node scripts/test-4-tokens-complete.js
```

## What the Test Does

### Step 1: Initialize 3 Pools
- **TOKENS/TOKENA** pool at 10:1 ratio
- **TOKENS/TOKENB** pool at 20:1 ratio  
- **TOKENS/TOKENC** pool at 1:1 ratio

### Step 2: Mint & Approve Tokens
- Mints 50,000 of each token if needed
- Approves SwapRouter for all tokens

### Step 3: Add Liquidity
- Transfers 1,000 tokens to LiquidityRouter
- Adds 100 units of liquidity to each pool
- Verifies liquidity increase

### Step 4: Execute Swaps
- **Swap 1**: 10 TOKENS → TOKENA (should get ~100 TOKENA)
- **Swap 2**: 10 TOKENS → TOKENB (should get ~200 TOKENB)
- **Swap 3**: 10 TOKENC → TOKENS (should get ~10 TOKENS)

### Step 5: Remove Liquidity
- Removes 50 units of liquidity from each pool
- Transfers tokens back to wallet
- Verifies liquidity decrease

### Step 6: Verify Results
- Shows final token balances
- Shows final pool liquidity
- Confirms all operations succeeded

## Price Verification

After swaps, verify the price ratios:

- If you spend 10 TOKENS, you should get approximately:
  - **~100 TOKENA** (10:1 ratio)
  - **~200 TOKENB** (20:1 ratio)
  
- If you spend 10 TOKENC, you should get approximately:
  - **~10 TOKENS** (1:1 ratio)

## Troubleshooting

### Pool Not Initialized Error
Run the initialization separately:
```bash
node ethers-examples/01-initialize-pool.js
```

### Nonce Issues
Restart the Hardhat node:
```bash
# Terminal 1
npm run node

# Terminal 2
npx hardhat run scripts/deploy-all.js --network localhost
npx hardhat run scripts/deploy-4-test-tokens.js --network localhost
npx hardhat run scripts/deploy-test-routers.js --network localhost
```

### Insufficient Balance
Mint more tokens:
```bash
# In node or script:
await tokenS.mint(wallet.address, ethers.parseEther("100000"));
```

## Files Created

### Deployment Scripts
- [scripts/deploy-4-test-tokens.js](scripts/deploy-4-test-tokens.js) - Deploy 4 tokens
- [scripts/deploy-test-routers.js](scripts/deploy-test-routers.js) - Deploy liquidity & swap routers

### Test Scripts
- [scripts/test-4-tokens-complete.js](scripts/test-4-tokens-complete.js) - Complete end-to-end test

## Manual Testing

You can also test individual operations:

```javascript
const { ethers } = require("ethers");
require("dotenv").config();

// Initialize pool
await poolManager.initialize(
  [tokenS, tokenA, 3000, 60, ethers.ZeroAddress],
  getSqrtPriceX96(10), // 10:1 ratio
  "0x"
);

// Add liquidity
await token0.transfer(liquidityRouter.target, ethers.parseEther("1000"));
await token1.transfer(liquidityRouter.target, ethers.parseEther("1000"));
await liquidityRouter.addLiquidity(
  [tokenS, tokenA, 3000, 60, ethers.ZeroAddress],
  -600,
  600,
  ethers.parseEther("100")
);

// Swap
await tokenS.approve(swapRouter.target, ethers.MaxUint256);
await swapRouter.swap(
  [tokenS, tokenA, 3000, 60, ethers.ZeroAddress],
  {
    zeroForOne: true,
    amountSpecified: -ethers.parseEther("10"),
    sqrtPriceLimitX96: MIN_PRICE_LIMIT
  }
);
```

## Success Criteria

✅ All 3 pools initialized with correct price ratios  
✅ Liquidity added to all pools  
✅ 3 swaps executed successfully  
✅ Price ratios verified (10:1, 20:1, 1:1)  
✅ Liquidity removed from all pools  
✅ Final balances correct  

## Next Steps

- Add more pools with different fee tiers
- Test concentrated liquidity positions
- Implement fee collection
- Add price impact calculations
- Test slippage protection
