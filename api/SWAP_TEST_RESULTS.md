# Swap Testing with cURL - Complete Guide

## Current Status

✅ **API Server is Running**
- Server: `http://localhost:3000`
- All contracts deployed and verified
- Health check: PASSED

## ⚠️ Issue: No Pools Exist Yet

The swap attempts are failing because **no liquidity pools have been initialized**. Before you can swap tokens, you need to:

1. Deploy ERC20 tokens
2. Initialize a pool
3. Add liquidity to the pool
4. Then perform swaps

---

## Quick Test Results

### ✅ Health Check (Working)
```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "contracts": {
      "poolManager": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      "positionManager": "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
      "swapRouter": "0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB"
    }
  }
}
```

### ❌ Swap Quote (Pool doesn't exist)
```bash
curl -X POST http://localhost:3000/api/swap/quote \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "tokenOut": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "amountIn": "1000000000000000000",
    "fee": 3000
  }'
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to get pool price: execution reverted"
  }
}
```

**Reason:** Pool for these tokens doesn't exist yet.

---

## 🛠️ Setup Required Before Swapping

### Step 1: Deploy Test Tokens

Create a deployment script for ERC20 test tokens:

```javascript
// scripts/deploy-test-tokens.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying test tokens with account:", deployer.address);

  // Deploy Token A
  const TokenA = await hre.ethers.getContractFactory("ERC20Mock");
  const tokenA = await TokenA.deploy("Token A", "TKNA", 18);
  await tokenA.waitForDeployment();
  
  // Deploy Token B
  const TokenB = await hre.ethers.getContractFactory("ERC20Mock");
  const tokenB = await TokenB.deploy("Token B", "TKNB", 18);
  await tokenB.waitForDeployment();

  console.log("Token A deployed to:", await tokenA.getAddress());
  console.log("Token B deployed to:", await tokenB.getAddress());
  
  // Mint some tokens
  await tokenA.mint(deployer.address, ethers.parseEther("10000"));
  await tokenB.mint(deployer.address, ethers.parseEther("10000"));
  
  console.log("Minted 10000 tokens each");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### Step 2: Initialize Pool

After deploying tokens, you need to initialize a pool with initial price.

### Step 3: Add Initial Liquidity

Use the liquidity endpoints to add initial liquidity to the pool.

---

## 📋 Working cURL Examples (API Structure Tests)

These test the API structure without requiring actual pools:

### 1. Health Check
```bash
curl http://localhost:3000/health
```

### 2. Liquidity Add Quote (will calculate but fail without pool)
```bash
curl -X POST http://localhost:3000/api/liquidity/add/quote \
  -H "Content-Type: application/json" \
  -d '{
    "currency0": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "currency1": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "fee": 3000,
    "tickLower": -887220,
    "tickUpper": 887220,
    "amount0Desired": "1000000000000000000",
    "amount1Desired": "1000000000000000000"
  }'
```

### 3. Swap Route (will search all fee tiers)
```bash
curl -X POST http://localhost:3000/api/swap/route \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "tokenOut": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "amountIn": "1000000000000000000"
  }'
```

### 4. List Pools
```bash
curl "http://localhost:3000/api/pools?limit=10"
```

---

## 🚀 Quick Setup for Testing Swaps

### Option 1: Use Existing Deployed Tokens (If Any)

If you have already deployed tokens on the Hardhat network, use their addresses:

```bash
# Find deployed tokens
cd /root/project/dex
grep -r "deployed to" deployments/ artifacts/

# Use those addresses in your curl commands
```

### Option 2: Full Setup Script

I can create a complete setup script that:
1. Deploys 2 test ERC20 tokens
2. Initializes a pool
3. Adds liquidity
4. Tests a swap

Would you like me to create this?

---

## 📊 Current API Endpoints Status

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /health` | ✅ Working | Returns server and contract status |
| `POST /api/swap/quote` | ⚠️ Needs Pool | Requires initialized pool |
| `POST /api/swap/execute` | ⚠️ Needs Pool | Requires initialized pool |
| `POST /api/swap/route` | ⚠️ Needs Pool | Returns "no route found" without pools |
| `POST /api/price/quote` | ⚠️ Needs Pool | Requires initialized pool |
| `POST /api/liquidity/add/quote` | ⚠️ Needs Pool | Will fail on pool price check |
| `POST /api/liquidity/add` | ⚠️ Needs Pool | Requires pool initialization first |
| `GET /api/pools` | ✅ Working | Returns empty list (no pools) |

---

## 💡 Next Steps

Choose one:

### A. Create Test Setup
I can create a complete test environment with:
- 2 deployed ERC20 tokens
- Initialized pool
- Initial liquidity
- Working swap examples

### B. Use Demo Data
Test the API structure with mock/demo responses

### C. Manual Setup
Follow the steps above to:
1. Deploy tokens
2. Initialize pools
3. Add liquidity
4. Test swaps

---

## 🔍 Verify What You Have

Check if any tokens are already deployed:

```bash
# Check artifacts for deployed contracts
ls -la /root/project/dex/artifacts/contracts/

# Check deployment records
ls -la /root/project/dex/deployments/
```

Let me know which option you'd like to proceed with!
