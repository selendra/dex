# Pure Ethers.js Examples

Simple, standalone examples using only ethers.js - **no Hardhat required!**

Just install `ethers` and run with `node` command.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install ethers dotenv
```

### 2. Create .env File

```bash
# Network (optional, defaults to localhost:8545)
RPC_URL=http://localhost:8545

# Wallet (optional, defaults to Hardhat's first account)
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Contract Addresses
POOL_MANAGER_ADDRESS=0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
STATE_VIEW_ADDRESS=0x8A791620dd6260079BF849Dc5567aDC3F2FdC318
POSITION_MANAGER_ADDRESS=0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82

# Your Tokens
TOKEN0_ADDRESS=0x...
TOKEN1_ADDRESS=0x...
```

### 3. Deploy Test Routers (Required for liquidity & swaps)

```bash
npx hardhat run scripts/deploy-test-routers.js --network localhost
```

This deploys:
- `PoolModifyLiquidityTest` (for adding liquidity)
- `PoolSwapTest` (for swapping)

Add the addresses to your `.env`:
```bash
LIQUIDITY_ROUTER_ADDRESS=0x...
SWAP_ROUTER_ADDRESS=0x...
| # | File | Description | Type |
|---|------|-------------|------|
| 1 | `01-initialize-pool.js` | Create a new pool | Setup |
| 2 | `02-query-pool.js` | Read pool state (no gas) | Query |
| 3 | `03-approve-tokens.js` | Approve tokens | Setup |
| 4 | `04-complete-workflow.js` | All-in-one demo | Demo |
| 5 | `05-add-liquidity.js` | **Add liquidity (REAL!)** | **DEX Core** |
| 6 | `06-swap.js` | **Swap tokens (REAL!)** | **DEX Core** |

```

### 4. Run Examples

```bash
# FULL DEX WORKFLOW:
node ethers-examples/01-initialize-pool.js    # Create pool
node ethers-examples/05-add-liquidity.js      # Add liquidity (REAL!)
node ethers-examples/06-swap.js               # Swap tokens (REAL!)

# Or check pool state
node ethers-examples/02-query-pool.js
node ethers-examples/03-approve-tokens.js
node ethers-examples/04-complete-workflow.js
```

## 📁 Examples

### 1. Initialize Pool
**File:** `01-initialize-pool.js`

Creates a new pool with a token pair.

```bash
node ethers-examples/01-initialize-pool.js
```

**What it does:**
- Connects to RPC provider
- Sorts token addresses
- Creates PoolKey structure  
- Initializes pool at 1:1 price
- Outputs Pool ID

**Requirements:**
- `TOKEN0_ADDRESS` and `TOKEN1_ADDRESS` in .env

---

### 2. Query Pool State
**File:** `02-query-pool.js`

Reads pool information without making transactions.

```bash
node ethers-examples/02-query-pool.js
```

**What it reads:**
- Current price (sqrtPriceX96)
- Current tick
- Total liquidity
- Fee accumulation
- Tick information
- Token details

**Requirements:**
- `POOL_ID` or `TOKEN0/TOKEN1_ADDRESS` in .env

---

### 3. Approve Tokens
**File:** `03-approve-tokens.js`

Checks balances and approves tokens for trading.

```bash
node ethers-examples/03-approve-tokens.js
```

**What it does:**
- Checks token balances
- Mints tokens if needed (test tokens only)
- Checks allowances
- Approves tokens to PoolManager
- Approves tokens to PositionManager

**Requirements:**
- `TOKEN0_ADDRESS` and `TOKEN1_ADDRESS` in .env

---

### 4. Complete Workflow
**File:** `04-complete-workflow.js`

All-in-one demonstration of the DEX.

```bash
node ethers-examples/04-complete-workflow.js
```

**What it does:**
1. Checks token information
2. Initializes pool (if needed)
3. Queries pool state
4. Approves tokens
5. Provides summary and next steps

**Requirements:**
- `TOKEN0_ADDRESS` and `TOKEN1_ADDRESS` in .env

---

### 5. Add Liquidity (REAL!)
**File:** `05-add-liquidity.js`

Actually adds liquidity to a pool using PoolModifyLiquidityTest.

```bash
node ethers-examples/05-add-liquidity.js
```

**What it does:**
- Checks and mints tokens
- Approves to LiquidityRouter
- Adds concentrated or full-range liquidity
- Shows pool liquidity before/after
- Displays tokens spent

**Requirements:**
- `TOKEN0_ADDRESS`, `TOKEN1_ADDRESS` in .env
- `LIQUIDITY_ROUTER_ADDRESS` in .env (deploy first)

---

### 6. Swap Tokens (REAL!)
**File:** `06-swap.js`

Actually executes token swaps using PoolSwapTest.

```bash
node ethers-examples/06-swap.js
```

**What it does:**
- Checks balances before/after
- Approves tokens to SwapRouter
- Executes exact input swap
- Shows price impact
- Displays swap results

**Requirements:**
- `TOKEN0_ADDRESS`, `TOKEN1_ADDRESS` in .env
- `SWAP_ROUTER_ADDRESS` in .env (deploy first)

---

## 🔑 Key Differences from Hardhat Examples

| Feature | Hardhat Examples | Pure Ethers.js |
|---------|------------------|----------------|
| **Installation** | `npm install hardhat` | `npm install ethers` |
| **Run Command** | `npx hardhat run` | `node` |
| **Deployment** | Built-in tasks | Manual contract interaction |
| **Network Config** | hardhat.config.js | .env RPC_URL |
| **Compilation** | Automatic | Not needed (uses ABIs) |
| **Size** | ~50MB | ~5MB |
| **Speed** | Slower (compilation) | Instant |

## 📝 .env Template

Complete `.env` file with all variables:

```bash
# Network Configuration
RPC_URL=http://localhost:8545

# Wallet (use your own for testnets/mainnet!)
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Deployed Contract Addresses
POOL_MANAGER_ADDRESS=0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
PERMIT2_ADDRESS=0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6
STATE_VIEW_ADDRESS=0x8A791620dd6260079BF849Dc5567aDC3F2FdC318
QUOTER_ADDRESS=0x610178dA211FEF7D417bC0e6FeD39F05609AD788
POSITION_DESCRIPTOR_ADDRESS=0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0

# Test Routers (Required for liquidity & swaps)
LIQUIDITY_ROUTER_ADDRESS=0x...
SWAP_ROUTER_ADDRESS=0x...
POSITION_MANAGER_ADDRESS=0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82
WETH9_ADDRESS=0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e

# Your Token Addresses
TOKEN0_ADDRESS=0x...
TOKEN1_ADDRESS=0x...

# Pool Information (optional)
POOL_ID=0x...
```

## 🌐 Using Different Networks

### Local Hardhat Node
```bash
RPC_URL=http://localhost:8545
```

### Sepolia Testnet
```bash
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=0x... # Your testnet private key
```

### Ethereum Mainnet
```bash
RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=0x... # Your mainnet private key (be careful!)
```

## 🔧 Contract ABIs

Each example includes only the ABI functions it needs. This keeps the code simple and focused.

Example:
```javascript
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)"
];
```

Full ABIs are available in the Hardhat artifacts if needed.

## 💡 Tips

### 1. Read-Only Operations (Free)
Use `provider` for reading data (no gas):
```javascript
const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(address, abi, provider);
const data = await contract.someViewFunction();
```

### 2. Write Operations (Requires Gas)
Use `wallet` for transactions:
```javascript
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(address, abi, wallet);
const tx = await contract.someFunction();
await tx.wait();
```

### 3. Error Handling
Always wrap contract calls in try-catch:
```javascript
try {
  const result = await contract.someFunction();
} catch (error) {
  console.error("Error:", error.message);
}
```

### 4. Gas Estimation
Check gas before sending transactions:
```javascript
const gasEstimate = await contract.someFunction.estimateGas();
console.log("Estimated gas:", gasEstimate.toString());
```

## 🐛 Troubleshooting

### "missing provider" Error
**Solution:** Make sure you pass `provider` or `wallet` to Contract constructor:
```javascript
const contract = new ethers.Contract(address, abi, provider); // ✅
const contract = new ethers.Contract(address, abi); // ❌
```

### "insufficient funds" Error
**Solution:** Make sure your wallet has ETH for gas:
```javascript
const balance = await provider.getBalance(wallet.address);
console.log("Balance:", ethers.formatEther(balance));
```

### "nonce too high" Error
**Solution:** Reset your node or wait for pending transactions:
```bash
npx hardhat node --reset
```

### "network changed" Error
**Solution:** Reconnect provider:
```javascript
const provider = new ethers.JsonRpcProvider(RPC_URL);
```

## 📚 Additional Resources

- [Ethers.js Documentation](https://docs.ethers.org/)
- [Hardhat Examples](../examples/)
- [API Documentation](../api/README.md)
- [Contract Analysis](../docs/CONTRACT_ANALYSIS.md)

## 🚀 Integration with Your App

These examples can be integrated into any Node.js application:

```javascript
const { ethers } = require("ethers");

// Import from examples
const initializePool = require("./ethers-examples/01-initialize-pool");
const queryPool = require("./ethers-examples/02-query-pool");

// Use in your app
async function myApp() {
  await initializePool();
  await queryPool();
}
```

Or use as reference for building your own scripts!

---

**Happy Coding! 🦄**
