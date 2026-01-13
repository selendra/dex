# DEX REST API Testing Guide

This guide explains how to run and test the DEX REST API using **cURL** and **Postman**.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Starting the API Server](#starting-the-api-server)
- [API Overview](#api-overview)
- [Testing with cURL](#testing-with-curl)
- [Testing with Postman](#testing-with-postman)
- [Token Addresses Reference](#token-addresses-reference)

---

## Prerequisites

1. **Node.js** (v18+) installed
2. **Environment variables** configured in `.env` file
3. **Deployed contracts** on Selendra network

Ensure your `.env` file contains:
```dotenv
# Selendra Network
SELENDRA_RPC_URL=https://rpc.selendra.org
SELENDRA_CHAIN_ID=1961

# Contract Addresses
SELENDRA_POOL_MANAGER_ADDRESS=0x974cE786bc1359E40a9DeE47F75e7EDF4B9E8900
SELENDRA_STATE_VIEW_ADDRESS=0xe6559413DdC60d5B21d1D39a69F581E29190C6a6
SELENDRA_LIQUIDITY_MANAGER_ADDRESS=0xfE6476257C1B0FBf71C362283E46a73271AB580b
SELENDRA_SWAP_ROUTER_ADDRESS=0x92B4C76AB36D52deD3Da20aE91820D078Ab97C5c

# Token Addresses
SELENDRA_TUSD_ADDRESS=0xA9233751245AFB7420B6AE108dF94E63418aD4d9
SELENDRA_TBROWN_ADDRESS=0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4
SELENDRA_TSMART_ADDRESS=0x3F35Ff1a1C3AbfBc916dECde3DC08b2bFFFe8900
SELENDRA_TZANDO_ADDRESS=0x2c0832A61271eA2E989B90202219ffB630c00901

# Private Key (for blockchain service default signer)
PRIVATE_KEY=your_private_key_here
```

---

## Starting the API Server

```bash
# Install dependencies (if not done)
cd /path/to/dex
npm install

# Start the API server
node api/index.js
```

The server will start on `http://localhost:3000` by default.

You should see output like:
```
🌐 Connecting to SELENDRA network...
✅ Blockchain service initialized (SELENDRA)
🚀 DEX API server running on port 3000
```

---

## API Overview

This API uses **direct private key authentication** - no JWT tokens or user registration required. Simply include your private key in the request body for write operations.

| Endpoint | Method | Requires Private Key | Description |
|----------|--------|---------------------|-------------|
| `/health` | GET | No | Health check |
| `/api/token/:addr/info` | GET | No | Get token metadata |
| `/api/token/:addr/balance/:account` | GET | No | Get token balance |
| `/api/token/:addr/allowance/:owner/:spender` | GET | No | Get token allowance |
| `/api/token/balances` | POST | Yes (optional) | Get multiple token balances |
| `/api/token/transfer` | POST | Yes | Transfer tokens |
| `/api/token/approve` | POST | Yes | Approve spender |
| `/api/token/transferFrom` | POST | Yes | Transfer using allowance |
| `/api/token/burn` | POST | Yes | Burn own tokens |
| `/api/token/burnFrom` | POST | Yes | Burn from address |
| `/api/token/mint` | POST | Yes | Mint new tokens |
| `/api/pool/initialize` | POST | No | Initialize a new pool |
| `/api/pool/:token0/:token1` | GET | No | Get pool information |
| `/api/pool/list` | POST | No | Get multiple pools info |
| `/api/pool/token/:addr/balance` | GET | No | Get token balance (default signer) |
| `/api/pool/token/:addr/balance/:account` | GET | No | Get token balance (specific account) |
| `/api/swap` | POST | Yes | Execute token swap |
| `/api/swap/quote` | POST | No (optional for balances) | Get swap quote |
| `/api/swap/balances` | POST | Yes | Get user balances |
| `/api/liquidity/add` | POST | Yes | Add liquidity |
| `/api/liquidity/remove` | POST | Yes | Remove liquidity |
| `/api/liquidity/:token0/:token1` | GET | No | Get pool liquidity info |

---

## Testing with cURL

### 1. Health Check

**Purpose:** Verify the API is running.

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "DEX API is running"
}
```

---

### 2. Token Operations

#### 2.1 Get Token Info

**Purpose:** Get token metadata (name, symbol, decimals, totalSupply).

```bash
curl "http://localhost:3000/api/token/0xA9233751245AFB7420B6AE108dF94E63418aD4d9/info"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "address": "0xA9233751245AFB7420B6AE108dF94E63418aD4d9",
    "name": "Test USD",
    "symbol": "TUSD",
    "decimals": 18,
    "totalSupply": "2000000.0"
  }
}
```

#### 2.2 Get Token Balance

```bash
curl "http://localhost:3000/api/token/0xA9233751245AFB7420B6AE108dF94E63418aD4d9/balance/0x725f3F18b27A94df1a4901bbfb7561Dc3B248481"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "tokenAddress": "0xA9233751245AFB7420B6AE108dF94E63418aD4d9",
    "accountAddress": "0x725f3F18b27A94df1a4901bbfb7561Dc3B248481",
    "balance": "1633890.0"
  }
}
```

#### 2.3 Get Token Allowance

```bash
curl "http://localhost:3000/api/token/0xA9233751245AFB7420B6AE108dF94E63418aD4d9/allowance/0x725f3F18b27A94df1a4901bbfb7561Dc3B248481/0x92B4C76AB36D52deD3Da20aE91820D078Ab97C5c"
```

#### 2.4 Get Multiple Token Balances

```bash
curl -X POST http://localhost:3000/api/token/balances \
  -H "Content-Type: application/json" \
  -d '{
    "privateKey": "0xYOUR_PRIVATE_KEY",
    "tokens": [
      "0xA9233751245AFB7420B6AE108dF94E63418aD4d9",
      "0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4"
    ]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x725f3F18b27A94df1a4901bbfb7561Dc3B248481",
    "native": "7.7547641419",
    "tokens": {
      "0xA9233751245AFB7420B6AE108dF94E63418aD4d9": "1633890.0",
      "0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4": "1643900.0"
    }
  }
}
```

#### 2.5 Transfer Tokens

```bash
curl -X POST http://localhost:3000/api/token/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "tokenAddress": "0xA9233751245AFB7420B6AE108dF94E63418aD4d9",
    "toAddress": "0xRECIPIENT_ADDRESS",
    "amount": "100",
    "privateKey": "0xYOUR_PRIVATE_KEY"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Transfer successful",
  "data": {
    "txHash": "0x...",
    "from": "0x...",
    "to": "0x...",
    "amount": "100",
    "tokenAddress": "0x...",
    "gasUsed": "51066"
  }
}
```

#### 2.6 Approve Spender

```bash
curl -X POST http://localhost:3000/api/token/approve \
  -H "Content-Type: application/json" \
  -d '{
    "tokenAddress": "0xA9233751245AFB7420B6AE108dF94E63418aD4d9",
    "spenderAddress": "0x92B4C76AB36D52deD3Da20aE91820D078Ab97C5c",
    "amount": "1000",
    "privateKey": "0xYOUR_PRIVATE_KEY"
  }'
```

#### 2.7 Burn Tokens

**Purpose:** Burn tokens from your own balance.

```bash
curl -X POST http://localhost:3000/api/token/burn \
  -H "Content-Type: application/json" \
  -d '{
    "tokenAddress": "0xA9233751245AFB7420B6AE108dF94E63418aD4d9",
    "amount": "100",
    "privateKey": "0xYOUR_PRIVATE_KEY"
  }'
```

#### 2.8 Mint Tokens

**Purpose:** Mint new tokens (TestToken has no access control).

```bash
curl -X POST http://localhost:3000/api/token/mint \
  -H "Content-Type: application/json" \
  -d '{
    "tokenAddress": "0xA9233751245AFB7420B6AE108dF94E63418aD4d9",
    "toAddress": "0xRECIPIENT_ADDRESS",
    "amount": "1000",
    "privateKey": "0xYOUR_PRIVATE_KEY"
  }'
```

---

### 3. Pool Operations

#### 3.1 Initialize a Pool

**Purpose:** Create a new liquidity pool for a token pair.

```bash
curl -X POST http://localhost:3000/api/pool/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "token0": "0xA9233751245AFB7420B6AE108dF94E63418aD4d9",
    "token1": "0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4",
    "priceRatio": 1
  }'
```

**Parameters:**
- `token0`: First token address
- `token1`: Second token address
- `priceRatio` (optional): Initial price ratio (1 = 1:1, 10 = 10:1, 0.5 = 1:2)

**Expected Response:**
```json
{
  "success": true,
  "message": "Pool initialized successfully",
  "data": {
    "poolKey": {
      "currency0": "0x...",
      "currency1": "0x...",
      "fee": 3000,
      "tickSpacing": 1,
      "hooks": "0x0000000000000000000000000000000000000000"
    },
    "txHash": "0x...",
    "priceRatio": 1,
    "sqrtPriceX96": "79228162514264337593543950336"
  }
}
```

#### 3.2 Get Pool Information

**Purpose:** Retrieve pool state (price, liquidity, etc.).

```bash
curl "http://localhost:3000/api/pool/0xA9233751245AFB7420B6AE108dF94E63418aD4d9/0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "poolKey": {...},
    "poolId": "0x...",
    "sqrtPriceX96": "79228162514264337593543950336",
    "tick": "0",
    "protocolFee": "0",
    "lpFee": "3000",
    "liquidity": "10000000000000000000000"
  }
}
```

#### 3.3 List Multiple Pools

```bash
curl -X POST http://localhost:3000/api/pool/list \
  -H "Content-Type: application/json" \
  -d '{
    "tokens": [
      "0xA9233751245AFB7420B6AE108dF94E63418aD4d9",
      "0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4",
      "0x3F35Ff1a1C3AbfBc916dECde3DC08b2bFFFe8900"
    ]
  }'
```

#### 3.4 Get Token Balance

```bash
# Default signer balance
curl "http://localhost:3000/api/pool/token/0xA9233751245AFB7420B6AE108dF94E63418aD4d9/balance"

# Specific account balance
curl "http://localhost:3000/api/pool/token/0xA9233751245AFB7420B6AE108dF94E63418aD4d9/balance/0x725f3F18b27A94df1a4901bbfb7561Dc3B248481"
```

---

### 4. Swap Operations

#### 4.1 Get Swap Quote

**Purpose:** Calculate expected output before executing a swap.

```bash
curl -X POST http://localhost:3000/api/swap/quote \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "0xA9233751245AFB7420B6AE108dF94E63418aD4d9",
    "tokenOut": "0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4",
    "amountIn": "100"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Quote calculated",
  "data": {
    "tokenIn": "0x...",
    "tokenOut": "0x...",
    "amountIn": "100",
    "estimatedAmountOut": "99.700000000000000000",
    "price": 1,
    "priceImpact": "1.0000%",
    "fee": "0.30%",
    "poolLiquidity": "10000.0",
    "userBalances": null
  }
}
```

#### 4.2 Execute Swap

**Purpose:** Perform the actual token swap.

```bash
curl -X POST http://localhost:3000/api/swap \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "0xA9233751245AFB7420B6AE108dF94E63418aD4d9",
    "tokenOut": "0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4",
    "amountIn": "100",
    "minAmountOut": "95",
    "privateKey": "0xYOUR_PRIVATE_KEY"
  }'
```

**Parameters:**
- `tokenIn`: Token to sell
- `tokenOut`: Token to buy
- `amountIn`: Amount to swap
- `minAmountOut` (optional): Minimum acceptable output (slippage protection)
- `privateKey`: Your wallet private key

**Expected Response:**
```json
{
  "success": true,
  "message": "Swap executed successfully",
  "data": {
    "txHash": "0x...",
    "poolKey": {...},
    "amountIn": "100",
    "amountOut": "98.715803439706129885",
    "minAmountOut": "95",
    "zeroForOne": false,
    "gasUsed": "430880",
    "userAddress": "0x...",
    "balances": {
      "before": {...},
      "after": {...}
    }
  }
}
```

#### 4.3 Get User Balances

```bash
curl -X POST http://localhost:3000/api/swap/balances \
  -H "Content-Type: application/json" \
  -d '{
    "privateKey": "0xYOUR_PRIVATE_KEY",
    "tokens": [
      "0xA9233751245AFB7420B6AE108dF94E63418aD4d9",
      "0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4"
    ]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Balances retrieved",
  "data": {
    "address": "0x725f3F18b27A94df1a4901bbfb7561Dc3B248481",
    "native": "7.7546790447",
    "tokens": {
      "0xA9233751245AFB7420B6AE108dF94E63418aD4d9": "1623890.0",
      "0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4": "1633900.0"
    }
  }
}
```

---

### 5. Liquidity Operations

#### 5.1 Add Liquidity

**Purpose:** Provide liquidity to a pool.

```bash
curl -X POST http://localhost:3000/api/liquidity/add \
  -H "Content-Type: application/json" \
  -d '{
    "token0": "0xA9233751245AFB7420B6AE108dF94E63418aD4d9",
    "token1": "0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4",
    "amount0": "1000",
    "amount1": "1000",
    "privateKey": "0xYOUR_PRIVATE_KEY"
  }'
```

**Parameters:**
- `token0`, `token1`: Token pair addresses
- `amount0`, `amount1`: Token amounts to deposit
- `privateKey`: Your wallet private key
- `tickLower`, `tickUpper` (optional): Custom price range

**Expected Response:**
```json
{
  "success": true,
  "message": "Liquidity added successfully",
  "data": {
    "poolKey": {...},
    "txHash": "0x...",
    "liquidityDelta": "1000000000000000000000",
    "amount0Deposited": "1000",
    "amount1Deposited": "1000",
    "fromWallet": "0x..."
  }
}
```

#### 5.2 Remove Liquidity

```bash
curl -X POST http://localhost:3000/api/liquidity/remove \
  -H "Content-Type: application/json" \
  -d '{
    "token0": "0xA9233751245AFB7420B6AE108dF94E63418aD4d9",
    "token1": "0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4",
    "liquidityAmount": "500",
    "privateKey": "0xYOUR_PRIVATE_KEY"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Liquidity removed successfully",
  "data": {
    "poolKey": {...},
    "txHash": "0x...",
    "liquidityRemoved": "500",
    "caller": "0x..."
  }
}
```

#### 5.3 Get Pool Liquidity Info

```bash
curl "http://localhost:3000/api/liquidity/0xA9233751245AFB7420B6AE108dF94E63418aD4d9/0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4"
```

---

## Testing with Postman

### Setup

1. Download and install [Postman](https://www.postman.com/downloads/)
2. Create a new Collection named "DEX API"
3. Set up environment variables

### Environment Variables

Create a Postman environment with:

| Variable | Initial Value |
|----------|---------------|
| `base_url` | `http://localhost:3000` |
| `private_key` | `0xYOUR_PRIVATE_KEY` |
| `tusd_address` | `0xA9233751245AFB7420B6AE108dF94E63418aD4d9` |
| `tbrown_address` | `0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4` |
| `tsmart_address` | `0x3F35Ff1a1C3AbfBc916dECde3DC08b2bFFFe8900` |
| `tzando_address` | `0x2c0832A61271eA2E989B90202219ffB630c00901` |

### Requests

#### 1. Health Check
- **Method:** GET
- **URL:** `{{base_url}}/health`

#### 2. Get Token Info
- **Method:** GET
- **URL:** `{{base_url}}/api/token/{{tusd_address}}/info`

#### 3. Get Token Balance
- **Method:** GET
- **URL:** `{{base_url}}/api/token/{{tusd_address}}/balance/0x725f3F18b27A94df1a4901bbfb7561Dc3B248481`

#### 4. Get Multiple Balances
- **Method:** POST
- **URL:** `{{base_url}}/api/token/balances`
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "privateKey": "{{private_key}}",
  "tokens": ["{{tusd_address}}", "{{tbrown_address}}"]
}
```

#### 5. Get Pool Info
- **Method:** GET
- **URL:** `{{base_url}}/api/pool/{{tusd_address}}/{{tbrown_address}}`

#### 6. Initialize Pool
- **Method:** POST
- **URL:** `{{base_url}}/api/pool/initialize`
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "token0": "{{tusd_address}}",
  "token1": "{{tbrown_address}}",
  "priceRatio": 1
}
```

#### 7. Get Swap Quote
- **Method:** POST
- **URL:** `{{base_url}}/api/swap/quote`
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "tokenIn": "{{tusd_address}}",
  "tokenOut": "{{tbrown_address}}",
  "amountIn": "100"
}
```

#### 8. Execute Swap
- **Method:** POST
- **URL:** `{{base_url}}/api/swap`
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "tokenIn": "{{tusd_address}}",
  "tokenOut": "{{tbrown_address}}",
  "amountIn": "100",
  "minAmountOut": "95",
  "privateKey": "{{private_key}}"
}
```

#### 9. Add Liquidity
- **Method:** POST
- **URL:** `{{base_url}}/api/liquidity/add`
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "token0": "{{tusd_address}}",
  "token1": "{{tbrown_address}}",
  "amount0": "1000",
  "amount1": "1000",
  "privateKey": "{{private_key}}"
}
```

#### 10. Transfer Tokens
- **Method:** POST
- **URL:** `{{base_url}}/api/token/transfer`
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "tokenAddress": "{{tusd_address}}",
  "toAddress": "0xRECIPIENT",
  "amount": "100",
  "privateKey": "{{private_key}}"
}
```

### Import Collection

You can import this collection directly into Postman:

```json
{
  "info": {
    "name": "DEX API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/health"
      }
    },
    {
      "name": "Token Info",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/token/{{tusd_address}}/info"
      }
    },
    {
      "name": "Token Balances",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/token/balances",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"privateKey\": \"{{private_key}}\", \"tokens\": [\"{{tusd_address}}\", \"{{tbrown_address}}\"]}"
        }
      }
    },
    {
      "name": "Pool Info",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/pool/{{tusd_address}}/{{tbrown_address}}"
      }
    },
    {
      "name": "Swap Quote",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/swap/quote",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"tokenIn\": \"{{tusd_address}}\", \"tokenOut\": \"{{tbrown_address}}\", \"amountIn\": \"100\"}"
        }
      }
    },
    {
      "name": "Execute Swap",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/swap",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"tokenIn\": \"{{tusd_address}}\", \"tokenOut\": \"{{tbrown_address}}\", \"amountIn\": \"100\", \"minAmountOut\": \"95\", \"privateKey\": \"{{private_key}}\"}"
        }
      }
    },
    {
      "name": "Add Liquidity",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/liquidity/add",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"token0\": \"{{tusd_address}}\", \"token1\": \"{{tbrown_address}}\", \"amount0\": \"1000\", \"amount1\": \"1000\", \"privateKey\": \"{{private_key}}\"}"
        }
      }
    }
  ]
}
```

---

## Token Addresses Reference

| Token | Symbol | Address |
|-------|--------|---------|
| Test USD | TUSD | `0xA9233751245AFB7420B6AE108dF94E63418aD4d9` |
| Test Brown | TBROWN | `0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4` |
| Test Smart | TSMART | `0x3F35Ff1a1C3AbfBc916dECde3DC08b2bFFFe8900` |
| Test Zando | TZANDO | `0x2c0832A61271eA2E989B90202219ffB630c00901` |

---

## Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Missing required fields` | Request body incomplete | Check all required fields are provided |
| `Private key is required` | No private key in request | Include `privateKey` in request body |
| `Insufficient balance` | Not enough tokens | Check balance and fund wallet if needed |
| `Pool has no liquidity` | Empty pool | Add liquidity to pool first |
| `Pool has already been initialized` | Pool exists | Use existing pool or different token pair |
| `execution reverted` | Contract call failed | Check function exists on deployed contract |

---

## Typical Workflow

1. **Start API server:** `node api/index.js`
2. **Check token info:** `GET /api/token/:addr/info`
3. **Check balances:** `POST /api/token/balances` with your private key
4. **Initialize pool** (if needed): `POST /api/pool/initialize`
5. **Add liquidity:** `POST /api/liquidity/add` with your private key
6. **Get swap quote:** `POST /api/swap/quote`
7. **Execute swap:** `POST /api/swap` with your private key

---

## Security Notes

⚠️ **Important:** This API uses raw private keys for simplicity. In production:

1. **Never expose private keys** in logs or error messages
2. **Use HTTPS** in production environments
3. **Consider** implementing proper authentication (JWT, API keys)
4. **Store** private keys securely (hardware wallets, HSM, secure vaults)
5. **Limit** API access to trusted networks/IPs
