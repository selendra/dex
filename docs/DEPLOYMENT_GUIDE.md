# Contract Deployment Guide

This guide covers deploying all Uniswap V4 core and peripheral contracts.

## Overview

The DEX consists of 6 main contracts that must be deployed in a specific order:

1. **PoolManager** - Core contract managing all pools
2. **Permit2** - Token approval and transfer system
3. **StateView** - Lens contract for reading pool state
4. **V4Quoter** - Offchain quote functionality
5. **PositionDescriptor** - NFT metadata generator
6. **PositionManager** - Main peripheral for liquidity management

## Deployment Order

```
PoolManager (independent)
    ↓
Permit2 (independent)
    ↓
StateView → requires PoolManager
    ↓
V4Quoter → requires PoolManager
    ↓
PositionDescriptor → requires PoolManager, WETH9
    ↓
PositionManager → requires PoolManager, Permit2, PositionDescriptor, WETH9
```

## Quick Start

### Deploy All Contracts at Once

```bash
npx hardhat run scripts/deploy-all.js --network localhost
```

This will:
- Deploy all 6 contracts in the correct order
- Handle all dependencies automatically
- Save deployment info to `deployments/` folder
- Generate environment variables template

### Deploy Individual Contracts

```bash
# 1. Deploy PoolManager
npx hardhat run scripts/deploy-pool-manager.js --network localhost

# 2. Deploy Permit2
npx hardhat run scripts/deploy-permit2.js --network localhost

# 3. Deploy StateView
npx hardhat run scripts/deploy-state-view.js --network localhost

# 4. Deploy V4Quoter
npx hardhat run scripts/deploy-quoter.js --network localhost

# 5. Deploy PositionDescriptor
npx hardhat run scripts/deploy-position-descriptor.js --network localhost

# 6. Deploy PositionManager
npx hardhat run scripts/deploy-position-manager.js --network localhost
```

## Contract Details

### 1. PoolManager

**Purpose:** Core contract managing all pools, swaps, and liquidity.

**Constructor Parameters:**
- `initialOwner` (address): Owner who controls protocol fees

**Deployment:**
```bash
npx hardhat run scripts/deploy-pool-manager.js --network localhost
```

**Example:**
```javascript
const PoolManager = await ethers.getContractFactory("PoolManager");
const poolManager = await PoolManager.deploy(ownerAddress);
```

---

### 2. Permit2

**Purpose:** Token approval contract supporting signature-based and allowance-based transfers.

**Constructor Parameters:** None

**Deployment:**
```bash
npx hardhat run scripts/deploy-permit2.js --network localhost
```

**Example:**
```javascript
const Permit2 = await ethers.getContractFactory("Permit2");
const permit2 = await Permit2.deploy();
```

**Note:** Users must approve Permit2 before using signature-based transfers.

---

### 3. StateView

**Purpose:** Lens contract for reading pool state offchain.

**Constructor Parameters:**
- `poolManager` (address): Deployed PoolManager address

**Deployment:**
```bash
export POOL_MANAGER_ADDRESS=0x...
npx hardhat run scripts/deploy-state-view.js --network localhost
```

**Example:**
```javascript
const StateView = await ethers.getContractFactory("StateView");
const stateView = await StateView.deploy(poolManagerAddress);
```

---

### 4. V4Quoter

**Purpose:** Provides swap quotes without executing transactions.

**Constructor Parameters:**
- `poolManager` (address): Deployed PoolManager address

**Deployment:**
```bash
export POOL_MANAGER_ADDRESS=0x...
npx hardhat run scripts/deploy-quoter.js --network localhost
```

**Example:**
```javascript
const V4Quoter = await ethers.getContractFactory("V4Quoter");
const quoter = await V4Quoter.deploy(poolManagerAddress);
```

**Note:** Quoter functions should NOT be called onchain - offchain use only.

---

### 5. PositionDescriptor

**Purpose:** Generates NFT metadata and visual descriptions for positions.

**Constructor Parameters:**
- `poolManager` (address): Deployed PoolManager address
- `wrappedNative` (address): WETH9 or wrapped native token address
- `nativeCurrencyLabelBytes` (bytes32): Native currency label (e.g., "ETH")

**Deployment:**
```bash
export POOL_MANAGER_ADDRESS=0x...
export WETH9_ADDRESS=0x...
export NATIVE_CURRENCY_LABEL=ETH
npx hardhat run scripts/deploy-position-descriptor.js --network localhost
```

**Example:**
```javascript
const nativeCurrencyLabelBytes = ethers.encodeBytes32String("ETH");
const PositionDescriptor = await ethers.getContractFactory("PositionDescriptor");
const descriptor = await PositionDescriptor.deploy(
  poolManagerAddress,
  weth9Address,
  nativeCurrencyLabelBytes
);
```

---

### 6. PositionManager

**Purpose:** Main peripheral for managing NFT-based liquidity positions.

**Constructor Parameters:**
- `poolManager` (address): Deployed PoolManager address
- `permit2` (address): Deployed Permit2 address
- `unsubscribeGasLimit` (uint256): Gas limit for notifications (default: 300000)
- `tokenDescriptor` (address): Deployed PositionDescriptor address
- `weth9` (address): WETH9 or wrapped native token address

**Deployment:**
```bash
export POOL_MANAGER_ADDRESS=0x...
export PERMIT2_ADDRESS=0x...
export POSITION_DESCRIPTOR_ADDRESS=0x...
export WETH9_ADDRESS=0x...
npx hardhat run scripts/deploy-position-manager.js --network localhost
```

**Example:**
```javascript
const PositionManager = await ethers.getContractFactory("PositionManager");
const positionManager = await PositionManager.deploy(
  poolManagerAddress,
  permit2Address,
  300000, // unsubscribeGasLimit
  positionDescriptorAddress,
  weth9Address
);
```

---

## Environment Variables

After deployment, add these to your `.env` file:

```bash
# Core Contracts
POOL_MANAGER_ADDRESS=0x...
PERMIT2_ADDRESS=0x...

# Lens Contracts
STATE_VIEW_ADDRESS=0x...
QUOTER_ADDRESS=0x...

# Peripheral Contracts
POSITION_DESCRIPTOR_ADDRESS=0x...
POSITION_MANAGER_ADDRESS=0x...

# Utility
WETH9_ADDRESS=0x...
```

## Deployment Outputs

Deployment information is saved to `deployments/` folder:

- `deployments/<network>-latest.json` - Latest deployment
- `deployments/<network>-<timestamp>.json` - Historical deployments

**File Structure:**
```json
{
  "network": "localhost",
  "chainId": "1337",
  "deployer": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "timestamp": "2025-12-26T...",
  "contracts": {
    "PoolManager": "0x...",
    "Permit2": "0x...",
    "StateView": "0x...",
    "V4Quoter": "0x...",
    "PositionDescriptor": "0x...",
    "PositionManager": "0x...",
    "WETH9": "0x..."
  }
}
```

## Networks

### Local Development (Hardhat)
```bash
npm run node  # Start local node
npx hardhat run scripts/deploy-all.js --network localhost
```

### Testnets
```bash
# Sepolia
npx hardhat run scripts/deploy-all.js --network sepolia

# Goerli
npx hardhat run scripts/deploy-all.js --network goerli
```

### Mainnet
```bash
npx hardhat run scripts/deploy-all.js --network mainnet
```

## Verification

After deployment, verify contracts on Etherscan:

```bash
npx hardhat verify --network <network> <contract-address> <constructor-args>
```

**Example:**
```bash
# Verify PoolManager
npx hardhat verify --network sepolia 0x... "0xOwnerAddress"

# Verify StateView
npx hardhat verify --network sepolia 0x... "0xPoolManagerAddress"

# Verify PositionManager
npx hardhat verify --network sepolia 0x... \
  "0xPoolManagerAddress" \
  "0xPermit2Address" \
  "300000" \
  "0xPositionDescriptorAddress" \
  "0xWETH9Address"
```

## Troubleshooting

### Missing Dependencies

If you get errors about missing contracts, ensure they're deployed in order:

1. PoolManager first
2. Then Permit2
3. Then dependent contracts (StateView, Quoter, etc.)

The individual scripts will auto-deploy dependencies if not found in environment.

### Contract Size Too Large

If you encounter "contract size exceeds limit" errors:

1. Check `hardhat.config.js` has `viaIR: true` optimization
2. Reduce `runs` in optimizer settings
3. Consider splitting large contracts

Current config in `hardhat.config.js`:
```javascript
solidity: {
  compilers: [
    {
      version: "0.8.26",
      settings: {
        viaIR: true,
        optimizer: {
          enabled: true,
          runs: 1  // Minimal for size optimization
        }
      }
    }
  ]
}
```

### Gas Issues

If transactions fail due to gas:

1. Check account has sufficient ETH
2. Increase gas limit in `hardhat.config.js`
3. For local network, ensure node is running

### WETH9 Not Found

The deployment scripts will automatically deploy a mock WETH if WETH9 is not available:

- First tries to deploy actual WETH9
- Falls back to TestToken as MockWETH

## Post-Deployment Steps

1. **Initialize Pools:**
   ```bash
   npx hardhat run scripts/initialize-pool.js --network localhost
   ```

2. **Deploy Test Tokens:**
   ```bash
   npx hardhat run scripts/deploy-tokens.js --network localhost
   ```

3. **Start API Server:**
   ```bash
   cd api
   npm start
   ```

4. **Update API Configuration:**
   - Copy addresses to `api/.env`
   - Restart API server

## API Integration

After deployment, update `api/.env` with new contract addresses:

```bash
# Update these in api/.env
POOL_MANAGER_ADDRESS=<from deployment>
POSITION_MANAGER_ADDRESS=<from deployment>
STATE_VIEW_ADDRESS=<from deployment>
QUOTER_ADDRESS=<from deployment>
```

Then restart the API:
```bash
cd api
npm start
```

## References

- [Uniswap V4 Documentation](https://docs.uniswap.org/contracts/v4/overview)
- [API Usage Guide](../api/USAGE_EXAMPLES.md)
- [Project README](../README.md)
