# Admin API Endpoints - Quick Reference

## Overview
These admin endpoints provide functionality for initializing pools, adding liquidity, and testing swaps with balance verification.

## Prerequisites
1. Contracts must be deployed
2. API server must be running
3. Test tokens should be deployed (via deploy.js script)

## Endpoints

### 1. Initialize Pool
**POST** `/api/admin/initialize-pool`

Initialize a new trading pool with specified token pair and initial price.

**Request Body:**
```json
{
  "currency0": "0x36C02dA8a0983159322a80FFE9F24b1acfF8B570",
  "currency1": "0x809d550fca64d94Bd9F66E60752A544199cfAC3D",
  "fee": 3000,
  "sqrtPriceX96": "79228162514264337593543950336"
}
```

**Parameters:**
- `currency0` (required): First token address
- `currency1` (required): Second token address
- `fee` (optional): Fee tier (500, 3000, or 10000). Default: 3000
- `sqrtPriceX96` (optional): Initial price in sqrtPriceX96 format. Default: "79228162514264337593543950336" (1:1)

**Response:**
```json
{
  "success": true,
  "data": {
    "poolKey": {
      "currency0": "0x36C02dA8a0983159322a80FFE9F24b1acfF8B570",
      "currency1": "0x809d550fca64d94Bd9F66E60752A544199cfAC3D",
      "fee": 3000,
      "tickSpacing": 60,
      "hooks": "0x0000000000000000000000000000000000000000"
    },
    "sqrtPriceX96": "79228162514264337593543950336",
    "transactionHash": "0x...",
    "blockNumber": 123,
    "gasUsed": "45678",
    "poolId": "0x..."
  },
  "meta": {
    "timestamp": "2025-12-24T..."
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/admin/initialize-pool \
  -H "Content-Type: application/json" \
  -d '{
    "currency0": "0x36C02dA8a0983159322a80FFE9F24b1acfF8B570",
    "currency1": "0x809d550fca64d94Bd9F66E60752A544199cfAC3D",
    "fee": 3000
  }'
```

---

### 2. Add Liquidity
**POST** `/api/admin/add-liquidity`

Add liquidity to an initialized pool.

**Request Body:**
```json
{
  "currency0": "0x36C02dA8a0983159322a80FFE9F24b1acfF8B570",
  "currency1": "0x809d550fca64d94Bd9F66E60752A544199cfAC3D",
  "fee": 3000,
  "amount0": "10000000000000000000",
  "amount1": "10000000000000000000",
  "tickLower": -887220,
  "tickUpper": 887220,
  "deadline": 1735034400
}
```

**Parameters:**
- `currency0` (required): First token address
- `currency1` (required): Second token address
- `fee` (optional): Fee tier. Default: 3000
- `amount0` (optional): Amount of token0 to add (in wei). Default: 10 tokens
- `amount1` (optional): Amount of token1 to add (in wei). Default: 10 tokens
- `tickLower` (optional): Lower tick bound. Default: -887220 (full range)
- `tickUpper` (optional): Upper tick bound. Default: 887220 (full range)
- `recipient` (optional): Recipient address. Default: deployer address
- `deadline` (optional): Transaction deadline (Unix timestamp). Default: 5 minutes from now

**Response:**
```json
{
  "success": true,
  "data": {
    "poolKey": { ... },
    "quote": {
      "liquidity": "10000000000000000000",
      "amount0": "10000000000000000000",
      "amount1": "10000000000000000000",
      "tickLower": -887220,
      "tickUpper": 887220,
      "currentTick": 0
    },
    "transaction": {
      "transactionHash": "0x...",
      "blockNumber": 124,
      "gasUsed": "234567",
      "status": "success"
    },
    "poolId": "0x..."
  },
  "meta": {
    "timestamp": "2025-12-24T..."
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/admin/add-liquidity \
  -H "Content-Type: application/json" \
  -d '{
    "currency0": "0x36C02dA8a0983159322a80FFE9F24b1acfF8B570",
    "currency1": "0x809d550fca64d94Bd9F66E60752A544199cfAC3D",
    "fee": 3000,
    "amount0": "10000000000000000000",
    "amount1": "10000000000000000000"
  }'
```

---

### 3. Test Swap (with Balance Verification)
**POST** `/api/admin/test-swap`

Execute a token swap and verify that balances changed correctly.

**Request Body:**
```json
{
  "tokenIn": "0x36C02dA8a0983159322a80FFE9F24b1acfF8B570",
  "tokenOut": "0x809d550fca64d94Bd9F66E60752A544199cfAC3D",
  "amountIn": "1000000000000000000",
  "fee": 3000,
  "slippageTolerance": 1.0
}
```

**Parameters:**
- `tokenIn` (required): Input token address
- `tokenOut` (required): Output token address
- `amountIn` (required): Amount to swap (in wei)
- `fee` (optional): Fee tier. Default: 3000
- `recipient` (optional): Recipient address. Default: deployer address
- `slippageTolerance` (optional): Slippage tolerance in percent. Default: 1.0

**Response:**
```json
{
  "success": true,
  "data": {
    "swap": {
      "tokenIn": {
        "address": "0x36C02dA8a0983159322a80FFE9F24b1acfF8B570",
        "symbol": "TKNA",
        "decimals": 18
      },
      "tokenOut": {
        "address": "0x809d550fca64d94Bd9F66E60752A544199cfAC3D",
        "symbol": "TKNB",
        "decimals": 18
      },
      "amountIn": "1000000000000000000",
      "expectedAmountOut": "995000000000000000",
      "actualAmountOut": "995000000000000000",
      "slippageTolerance": "1.0%"
    },
    "quote": {
      "amountIn": "1000000000000000000",
      "amountOut": "995000000000000000",
      "price": "1.0",
      "priceImpact": "0.1000",
      "fee": "3000",
      "poolId": "0x..."
    },
    "balances": {
      "before": {
        "tokenIn": "1000000000000000000000",
        "tokenOut": "1000000000000000000000"
      },
      "after": {
        "tokenIn": "999000000000000000000",
        "tokenOut": "1000995000000000000000"
      },
      "changes": {
        "tokenIn": "1000000000000000000",
        "tokenOut": "995000000000000000"
      }
    },
    "transaction": {
      "transactionHash": "0x...",
      "blockNumber": 125,
      "gasUsed": "123456",
      "status": "success"
    },
    "verification": {
      "swapExecuted": true,
      "balanceChanged": true,
      "expectedVsActual": {
        "expected": "0.9950",
        "actual": "0.9950",
        "difference": "0.0000"
      }
    }
  },
  "meta": {
    "timestamp": "2025-12-24T..."
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/admin/test-swap \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "0x36C02dA8a0983159322a80FFE9F24b1acfF8B570",
    "tokenOut": "0x809d550fca64d94Bd9F66E60752A544199cfAC3D",
    "amountIn": "1000000000000000000",
    "fee": 3000
  }'
```

---

## Complete Workflow Example

### Step 1: Deploy Contracts
```bash
# Start local Hardhat node (Terminal 1)
npm run node

# Deploy contracts (Terminal 2)
npm run deploy:local
```

### Step 2: Start API Server
```bash
cd api
npm start
```

### Step 3: Initialize Pool
```bash
curl -X POST http://localhost:3000/api/admin/initialize-pool \
  -H "Content-Type: application/json" \
  -d '{
    "currency0": "0x36C02dA8a0983159322a80FFE9F24b1acfF8B570",
    "currency1": "0x809d550fca64d94Bd9F66E60752A544199cfAC3D"
  }'
```

### Step 4: Add Liquidity
```bash
curl -X POST http://localhost:3000/api/admin/add-liquidity \
  -H "Content-Type: application/json" \
  -d '{
    "currency0": "0x36C02dA8a0983159322a80FFE9F24b1acfF8B570",
    "currency1": "0x809d550fca64d94Bd9F66E60752A544199cfAC3D",
    "amount0": "10000000000000000000",
    "amount1": "10000000000000000000"
  }'
```

### Step 5: Test Swap
```bash
curl -X POST http://localhost:3000/api/admin/test-swap \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "0x36C02dA8a0983159322a80FFE9F24b1acfF8B570",
    "tokenOut": "0x809d550fca64d94Bd9F66E60752A544199cfAC3D",
    "amountIn": "1000000000000000000"
  }'
```

### Step 6: Run Automated Tests
```bash
cd api
node test-admin-api.js
```

---

## Important Notes

### Token Addresses
- Tokens are automatically sorted (currency0 < currency1)
- Always use the addresses from `api/test-config.json` after deployment

### Price Format
- `sqrtPriceX96` = sqrt(price) * 2^96
- Default value `79228162514264337593543950336` = 1:1 price ratio
- For different ratios, calculate: sqrt(token1/token0) * 2^96

### Fee Tiers
- `500` = 0.05% (for stable pairs)
- `3000` = 0.3% (standard)
- `10000` = 1% (for exotic pairs)

### Tick Spacing
- Automatically set based on fee tier
- 500 → 10
- 3000 → 60
- 10000 → 200

### Slippage
- Slippage tolerance is in percent (e.g., 1.0 = 1%)
- Minimum amount out = expected * (1 - slippage/100)
- Higher slippage = more tolerance for price movement

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_INPUT` | Missing or invalid parameters |
| `POOL_ALREADY_INITIALIZED` | Pool has already been initialized |
| `INSUFFICIENT_LIQUIDITY` | Not enough liquidity for swap |
| `SLIPPAGE_EXCEEDED` | Price moved beyond slippage tolerance |
| `INTERNAL_ERROR` | Server or contract error |

---

## Testing Script

Run the complete test suite:
```bash
cd api
node test-admin-api.js
```

This will:
1. Check API health
2. Initialize a pool
3. Add liquidity
4. Get pool information
5. Get swap quote
6. Execute and verify a test swap

All tests include balance verification to ensure operations are working correctly.
