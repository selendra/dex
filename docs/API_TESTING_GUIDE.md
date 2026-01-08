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

# Private Key (for blockchain service)
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

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/health` | GET | No | Health check |
| `/api/auth/register` | POST | No | Register new user |
| `/api/auth/login` | POST | No | Login and get JWT token |
| `/api/auth/me` | GET | Yes | Get current user info |
| `/api/auth/wallet` | POST | Yes | Get wallet details |
| `/api/auth/users` | GET | No | List all users |
| `/api/pool/initialize` | POST | Admin | Initialize a new pool |
| `/api/pool/:token0/:token1` | GET | No | Get pool information |
| `/api/pool/list` | POST | No | Get multiple pools info |
| `/api/pool/token/:addr/balance` | GET | No | Get token balance |
| `/api/swap` | POST | Yes | Execute token swap |
| `/api/swap/quote` | POST | Optional | Get swap quote |
| `/api/swap/balances` | GET | Yes | Get user balances |
| `/api/liquidity/add` | POST | Admin | Add liquidity |
| `/api/liquidity/remove` | POST | Admin | Remove liquidity |
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

### 2. Authentication

#### 2.1 Register a New User

**Purpose:** Create a new user account with an auto-generated wallet.

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "securepassword123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "username": "alice",
    "address": "0x...",
    "role": "user",
    "mnemonic": "word1 word2 word3 ... word12",
    "token": "eyJhbGciOiJIUzI1NiIs..."
  },
  "warning": "Save your mnemonic phrase securely! It will not be shown again."
}
```

> ⚠️ **Important:** Save the `mnemonic` and `token` from the response!

#### 2.2 Register Admin User (First User Only)

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "adminpassword123",
    "adminSecret": "your-admin-secret"
  }'
```

#### 2.3 Login

**Purpose:** Authenticate and get a new JWT token.

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "securepassword123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "username": "alice",
    "address": "0x...",
    "role": "user",
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### 2.4 Get Current User Info

**Purpose:** Verify authentication is working.

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 2.5 Get Wallet Details

**Purpose:** Retrieve wallet address and mnemonic (requires password).

```bash
curl -X POST http://localhost:3000/api/auth/wallet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "password": "securepassword123"
  }'
```

#### 2.6 List All Users

```bash
curl http://localhost:3000/api/auth/users
```

---

### 3. Pool Operations

#### 3.1 Initialize a Pool (Admin Only)

**Purpose:** Create a new liquidity pool for a token pair.

```bash
curl -X POST http://localhost:3000/api/pool/initialize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
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
    "liquidity": "1000000000000000000000"
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
curl "http://localhost:3000/api/pool/token/0xA9233751245AFB7420B6AE108dF94E63418aD4d9/balance/0xYourAccountAddress"
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
    "priceImpact": "0.0100%",
    "fee": "0.30%",
    "poolLiquidity": "1000000.0"
  }
}
```

#### 4.2 Execute Swap

**Purpose:** Perform the actual token swap.

```bash
curl -X POST http://localhost:3000/api/swap \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "tokenIn": "0xA9233751245AFB7420B6AE108dF94E63418aD4d9",
    "tokenOut": "0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4",
    "amountIn": "100",
    "minAmountOut": "95",
    "password": "securepassword123"
  }'
```

**Parameters:**
- `tokenIn`: Token to sell
- `tokenOut`: Token to buy
- `amountIn`: Amount to swap
- `minAmountOut` (optional): Minimum acceptable output (slippage protection)
- `password`: User's password to unlock wallet

**Expected Response:**
```json
{
  "success": true,
  "message": "Swap executed successfully",
  "data": {
    "txHash": "0x...",
    "amountIn": "100",
    "amountOut": "99.5",
    "minAmountOut": "95",
    "zeroForOne": true,
    "gasUsed": "150000",
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
curl "http://localhost:3000/api/swap/balances?tokens=0xA9233751245AFB7420B6AE108dF94E63418aD4d9,0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 5. Liquidity Operations

#### 5.1 Add Liquidity (Admin Only)

**Purpose:** Provide liquidity to a pool.

```bash
curl -X POST http://localhost:3000/api/liquidity/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "token0": "0xA9233751245AFB7420B6AE108dF94E63418aD4d9",
    "token1": "0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4",
    "amount0": "1000",
    "amount1": "1000",
    "password": "adminpassword123"
  }'
```

**Parameters:**
- `token0`, `token1`: Token pair addresses
- `amount0`, `amount1`: Token amounts to deposit
- `password`: Admin's password
- `tickLower`, `tickUpper` (optional): Custom price range

#### 5.2 Remove Liquidity (Admin Only)

```bash
curl -X POST http://localhost:3000/api/liquidity/remove \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "token0": "0xA9233751245AFB7420B6AE108dF94E63418aD4d9",
    "token1": "0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4",
    "liquidityAmount": "500"
  }'
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
3. Set up environment variables:
   - `base_url`: `http://localhost:3000`
   - `jwt_token`: (will be set after login)
   - `admin_token`: (will be set after admin login)

### Environment Variables

Create a Postman environment with:

| Variable | Initial Value |
|----------|---------------|
| `base_url` | `http://localhost:3000` |
| `jwt_token` | (empty) |
| `admin_token` | (empty) |
| `tusd_address` | `0xA9233751245AFB7420B6AE108dF94E63418aD4d9` |
| `tbrown_address` | `0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4` |
| `tsmart_address` | `0x3F35Ff1a1C3AbfBc916dECde3DC08b2bFFFe8900` |
| `tzando_address` | `0x2c0832A61271eA2E989B90202219ffB630c00901` |

### Requests

#### 1. Health Check
- **Method:** GET
- **URL:** `{{base_url}}/health`

#### 2. Register User
- **Method:** POST
- **URL:** `{{base_url}}/api/auth/register`
- **Headers:** `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "username": "alice",
  "password": "securepassword123"
}
```
- **Tests (to auto-save token):**
```javascript
if (pm.response.code === 201) {
    var jsonData = pm.response.json();
    pm.environment.set("jwt_token", jsonData.data.token);
}
```

#### 3. Login
- **Method:** POST
- **URL:** `{{base_url}}/api/auth/login`
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "username": "alice",
  "password": "securepassword123"
}
```
- **Tests:**
```javascript
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    pm.environment.set("jwt_token", jsonData.data.token);
}
```

#### 4. Get Current User
- **Method:** GET
- **URL:** `{{base_url}}/api/auth/me`
- **Headers:** 
  - `Authorization: Bearer {{jwt_token}}`

#### 5. Initialize Pool
- **Method:** POST
- **URL:** `{{base_url}}/api/pool/initialize`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer {{admin_token}}`
- **Body:**
```json
{
  "token0": "{{tusd_address}}",
  "token1": "{{tbrown_address}}",
  "priceRatio": 1
}
```

#### 6. Get Pool Info
- **Method:** GET
- **URL:** `{{base_url}}/api/pool/{{tusd_address}}/{{tbrown_address}}`

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
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer {{jwt_token}}`
- **Body:**
```json
{
  "tokenIn": "{{tusd_address}}",
  "tokenOut": "{{tbrown_address}}",
  "amountIn": "100",
  "minAmountOut": "95",
  "password": "securepassword123"
}
```

#### 9. Add Liquidity
- **Method:** POST
- **URL:** `{{base_url}}/api/liquidity/add`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer {{admin_token}}`
- **Body:**
```json
{
  "token0": "{{tusd_address}}",
  "token1": "{{tbrown_address}}",
  "amount0": "1000",
  "amount1": "1000",
  "password": "adminpassword123"
}
```

### Import Collection

You can import this collection directly into Postman:

1. Click "Import" in Postman
2. Choose "Raw text"
3. Paste the following JSON:

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
      "name": "Register",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/auth/register",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"username\": \"alice\", \"password\": \"securepassword123\"}"
        }
      }
    },
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/auth/login",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"username\": \"alice\", \"password\": \"securepassword123\"}"
        }
      }
    },
    {
      "name": "Get Me",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/auth/me",
        "header": [{"key": "Authorization", "value": "Bearer {{jwt_token}}"}]
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
| `Invalid token` | JWT expired or invalid | Login again to get fresh token |
| `Insufficient balance` | Not enough tokens | Fund your wallet with tokens |
| `Pool has no liquidity` | Empty pool | Admin needs to add liquidity first |
| `Pool has already been initialized` | Pool exists | Use existing pool or different token pair |
| `Admin access required` | Non-admin attempting admin action | Use admin account |

---

## Typical Workflow

1. **Start API server:** `node api/index.js`
2. **Register admin user** (first user with `adminSecret`)
3. **Initialize pools** for token pairs (admin)
4. **Add liquidity** to pools (admin)
5. **Register regular users**
6. **Fund user wallets** with tokens
7. **Users can swap** tokens through the API
