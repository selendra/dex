# DEX REST API Documentation

## Overview
REST API for interacting with the Uniswap V4-based DEX. Supports swaps, liquidity management, and pool queries.

## Base URL
```
http://localhost:3000
```

## Quick Start

### 1. Start Hardhat Node
```bash
npm run node
```

### 2. Deploy Contracts (in another terminal)
```bash
npm run deploy:local
npm run deploy:tokens
```

### 3. Start API Server
```bash
npm run api
```

## API Endpoints

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "message": "DEX API is running"
}
```

---

## Pool Endpoints

### Initialize Pool
```http
POST /api/pool/initialize
```

**Request Body:**
```json
{
  "token0": "0x...",
  "token1": "0x...",
  "sqrtPriceX96": "79228162514264337593543950336"  // Optional, defaults to 1:1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Pool initialized successfully",
  "data": {
    "poolKey": { ... },
    "txHash": "0x..."
  }
}
```

### Get Pool Info
```http
GET /api/pool/:token0/:token1
```

**Example:**
```bash
curl http://localhost:3000/api/pool/0xa513E6E4b8f2a923D98304ec87F64353C4D5C853/0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6
```

**Response:**
```json
{
  "success": true,
  "data": {
    "poolKey": {
      "currency0": "0x...",
      "currency1": "0x...",
      "fee": 3000,
      "tickSpacing": 60,
      "hooks": "0x0000000000000000000000000000000000000000"
    },
    "poolId": "0x...",
    "sqrtPriceX96": "79228162514264337593543950336",
    "tick": "0",
    "protocolFee": "0",
    "lpFee": "3000",
    "liquidity": "1000000000000000000000"
  }
}
```

### List All Pools
```http
POST /api/pool/list
```

**Request Body:**
```json
{
  "tokens": [
    "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
    "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
    "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pools": [ ... ],
    "count": 3
  }
}
```

### Get Token Balance
```http
GET /api/pool/token/:tokenAddress/balance/:accountAddress?
```

**Example:**
```bash
# Get balance for default signer
curl http://localhost:3000/api/pool/token/0xa513E6E4b8f2a923D98304ec87F64353C4D5C853/balance

# Get balance for specific account
curl http://localhost:3000/api/pool/token/0xa513E6E4b8f2a923D98304ec87F64353C4D5C853/balance/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokenAddress": "0x...",
    "accountAddress": "0x...",
    "balance": "1000000.0"
  }
}
```

---

## Liquidity Endpoints

### Add Liquidity
```http
POST /api/liquidity/add
```

**Request Body:**
```json
{
  "token0": "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
  "token1": "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
  "amount0": "1000",
  "amount1": "1000",
  "tickLower": -887220,  // Optional, defaults to full range
  "tickUpper": 887220    // Optional, defaults to full range
}
```

**Response:**
```json
{
  "success": true,
  "message": "Liquidity added successfully",
  "data": {
    "poolKey": { ... },
    "txHash": "0x...",
    "liquidityDelta": "1000000000000000000000"
  }
}
```

### Remove Liquidity
```http
POST /api/liquidity/remove
```

**Request Body:**
```json
{
  "token0": "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
  "token1": "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
  "liquidityAmount": "500",
  "tickLower": -887220,  // Optional
  "tickUpper": 887220    // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Liquidity removed successfully",
  "data": {
    "poolKey": { ... },
    "txHash": "0x...",
    "liquidityRemoved": "500"
  }
}
```

### Get Pool Liquidity
```http
GET /api/liquidity/:token0/:token1
```

Same as `GET /api/pool/:token0/:token1`

---

## Swap Endpoints

### Execute Swap
```http
POST /api/swap
```

**Request Body:**
```json
{
  "tokenIn": "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
  "tokenOut": "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
  "amountIn": "100",
  "minAmountOut": "95"  // Optional slippage protection
}
```

**Response:**
```json
{
  "success": true,
  "message": "Swap executed successfully",
  "data": {
    "txHash": "0x...",
    "poolKey": { ... },
    "amountIn": "100",
    "zeroForOne": true,
    "gasUsed": "150000"
  }
}
```

### Get Swap Quote
```http
POST /api/swap/quote
```

**Request Body:**
```json
{
  "tokenIn": "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
  "tokenOut": "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
  "amountIn": "100"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Quote calculated",
  "data": {
    "tokenIn": "0x...",
    "tokenOut": "0x...",
    "amountIn": "100",
    "poolInfo": { ... },
    "estimatedAmountOut": "Use pool price calculation",
    "priceImpact": "calculated based on liquidity"
  }
}
```

---

## Example Usage

### Complete Flow

```bash
# 1. Start Hardhat node
npm run node

# 2. Deploy contracts (in new terminal)
npm run deploy:local
npm run deploy:tokens

# 3. Start API server (in new terminal)
npm run api

# 4. Initialize a pool
curl -X POST http://localhost:3000/api/pool/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "token0": "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
    "token1": "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"
  }'

# 5. Add liquidity
curl -X POST http://localhost:3000/api/liquidity/add \
  -H "Content-Type: application/json" \
  -d '{
    "token0": "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
    "token1": "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
    "amount0": "10000",
    "amount1": "10000"
  }'

# 6. Execute swap
curl -X POST http://localhost:3000/api/swap \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
    "tokenOut": "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
    "amountIn": "100"
  }'

# 7. Get pool info
curl http://localhost:3000/api/pool/0xa513E6E4b8f2a923D98304ec87F64353C4D5C853/0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6
```

---

## Error Handling

All errors return:
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `500` - Internal Server Error (blockchain error, contract revert, etc.)

---

## Configuration

### Environment Variables (.env)

```bash
# Contract addresses (auto-populated or manual)
POOL_MANAGER_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
STATE_VIEW_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
LIQUIDITY_MANAGER_ADDRESS=0x0B306BF915C4d645ff596e518fAf3F9669b97016
SWAP_ROUTER_ADDRESS=0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1

# Test tokens
TOKENS_ADDRESS=0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
TOKENA_ADDRESS=0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6
TOKENB_ADDRESS=0x8A791620dd6260079BF849Dc5567aDC3F2FdC318
TOKENC_ADDRESS=0x610178dA211FEF7D417bC0e6FeD39F05609AD788

# API port
PORT=3000
```

---

## Architecture

```
api/
├── index.js                 # Entry point
├── server.js               # Express server setup
├── routes/
│   ├── swap.js             # Swap endpoints
│   ├── liquidity.js        # Liquidity endpoints
│   └── pool.js             # Pool endpoints
└── services/
    └── blockchain.js       # Blockchain interaction service
```

**Key Features:**
- Automatic contract deployment if not found
- Token address auto-sorting for PoolKey
- Full-range liquidity by default
- Approve-based swap pattern
- Error handling middleware
