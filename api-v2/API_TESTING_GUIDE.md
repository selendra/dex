# DEX API Testing Guide

Complete guide for testing the DEX REST API using curl and Postman.

---

## Table of Contents
1. [Setup](#setup)
2. [Testing with curl](#testing-with-curl)
3. [Phase 2: Liquidity Management](#phase-2-liquidity-management-critical) ⭐ CRITICAL
4. [Phase 3: Token Swaps](#phase-3-token-swaps-critical) ⭐ CRITICAL
5. [Complete Test Script](#complete-test-script)
6. [Common Test Scenarios](#common-test-scenarios)
7. [Test Results Summary](#test-results-summary)

---

## Setup

### Prerequisites
- API server running: `cd api-v2 && npm start`
- Hardhat node running: `npm run node` (in main directory)
- Contracts deployed: `npm run deploy:local`
- API URL: `http://localhost:3000`

### ⚠️ Important Notes
- **Token addresses**: Use actual addresses from your `api-v2/.env` file
- **HTTP methods**: Token info/balance use GET with path parameters (not POST)
- **Tick ranges**: Full-range liquidity uses `tickLower: -887220, tickUpper: 887220`
- **Amounts**: Specify in wei (e.g., "1000000000000000000" = 1e18)

### Environment
All examples use:
- **Network**: Hardhat localhost (chainId 1337)
- **Default Account**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Test Tokens**: TOKENS, TOKENA, TOKENB, TOKENC

---

## Testing with curl

### 1. Health Check

**Check API Status**
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "network": { "name": "unknown", "chainId": "1337" },
    "blockNumber": 182,
    "contracts": {
      "poolManager": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      "stateView": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      "swapRouter": "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
      "liquidityRouter": "0x0B306BF915C4d645ff596e518fAf3F9669b97016"
    }
  }
}
```

---

## Phase 2: Liquidity Management ⭐ CRITICAL

### Prerequisites
- Tokens must be approved for LiquidityRouter (`0x0B306BF915C4d645ff596e518fAf3F9669b97016`)
- Use full-range liquidity: `tickLower: -887220, tickUpper: 887220`

### 1. Add Liquidity ✅ TESTED & WORKING

```bash
curl -X POST http://localhost:3000/liquidity/add \
  -H "Content-Type: application/json" \
  -d '{
    "token0": "0x2279B7A0f5650aDA7c669238d810A4dF4960a9Fe",
    "token1": "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
    "fee": 3000,
    "tickLower": -887220,
    "tickUpper": 887220,
    "liquidityDelta": "3000000000000000000"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "txHash": "0x8fe5b06cb93f3ac7c22c7847a96d96bb784e36ae9f033e00b95fdbd47ade2b0b",
    "blockNumber": 31,
    "gasUsed": 27160,
    "poolId": "0xa2745a3caa1d5df3e6452631709ed0bbc846d59eaf2a8a7475711331173ca793",
    "liquidityAdded": "3000000000000000000",
    "tickLower": -887220,
    "tickUpper": 887220
  }
}
```

**Gas Usage:** ~27,160 gas

### 2. Remove Liquidity ✅ TESTED & WORKING

```bash
curl -X POST http://localhost:3000/liquidity/remove \
  -H "Content-Type: application/json" \
  -d '{
    "token0": "0x2279B7A0f5650aDA7c669238d810A4dF4960a9Fe",
    "token1": "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
    "fee": 3000,
    "tickLower": -887220,
    "tickUpper": 887220,
    "liquidityDelta": "1500000000000000000"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "txHash": "0x1b13e37c1ac464d2943bad724f8127646b81fcdd15aebfdf0edfa1bd047347fd",
    "blockNumber": 32,
    "gasUsed": 27160,
    "poolId": "0xa2745a3caa1d5df3e6452631709ed0bbc846d59eaf2a8a7475711331173ca793",
    "liquidityRemoved": "1500000000000000000",
    "tickLower": -887220,
    "tickUpper": 887220
  }
}
```

**Gas Usage:** ~27,160 gas

### 3. Get Liquidity Quote

```bash
curl -X POST http://localhost:3000/liquidity/add/quote \
  -H "Content-Type: application/json" \
  -d '{
    "token0": "0x2279B7A0f5650aDA7c669238d810A4dF4960a9Fe",
    "token1": "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
    "fee": 3000,
    "tickLower": -887220,
    "tickUpper": 887220,
    "liquidityDelta": "2000000000000000000"
  }'
```

---

## Phase 3: Token Swaps ⭐ CRITICAL

### Prerequisites
- Pool must have liquidity
- Tokens must be approved for SwapRouter (`0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1`)

### 1. Execute Swap ✅ TESTED & WORKING

**Swap token0 → token1 (forward):**
```bash
curl -X POST http://localhost:3000/swaps/execute \
  -H "Content-Type: application/json" \
  -d '{
    "token0": "0x2279B7A0f5650aDA7c669238d810A4dF4960a9Fe",
    "token1": "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
    "fee": 3000,
    "zeroForOne": true,
    "amountSpecified": "1000000000000000000"
  }'
```

**Swap token1 → token0 (reverse):**
```bash
curl -X POST http://localhost:3000/swaps/execute \
  -H "Content-Type: application/json" \
  -d '{
    "token0": "0x2279B7A0f5650aDA7c669238d810A4dF4960a9Fe",
    "token1": "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
    "fee": 3000,
    "zeroForOne": false,
    "amountSpecified": "500000000000000000"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "txHash": "0xf3d5b8c58415e0584e476686d82026cb5f041db963946398af13814359b7d67a",
    "blockNumber": 33,
    "gasUsed": 26260,
    "poolId": "0xa2745a3caa1d5df3e6452631709ed0bbc846d59eaf2a8a7475711331173ca793",
    "note": "Swap executed successfully"
  }
}
```

**Gas Usage:** ~26,260-26,710 gas

### 2. Get Swap Quote

```bash
curl -X POST http://localhost:3000/swaps/quote \
  -H "Content-Type: application/json" \
  -d '{
    "token0": "0x2279B7A0f5650aDA7c669238d810A4dF4960a9Fe",
    "token1": "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
    "fee": 3000,
    "zeroForOne": true,
    "amountSpecified": "1000000000000000000"
  }'
```

---

## Complete Test Script

Run all critical tests in sequence (update token addresses from your `.env`):

```bash
#!/bin/bash

# Set token addresses from your .env file
TOKENA="0x2279B7A0f5650aDA7c669238d810A4dF4960a9Fe"
TOKENB="0x8A791620dd6260079BF849Dc5567aDC3F2FdC318"
SWAP_ROUTER="0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1"
LIQUIDITY_ROUTER="0x0B306BF915C4d645ff596e518fAf3F9669b97016"
OWNER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

echo "=== 1. Health Check ==="
curl -s http://localhost:3000/health | jq .

echo -e "\n=== 2. Token Info ==="
curl -s http://localhost:3000/tokens/$TOKENA | jq .

echo -e "\n=== 3. Token Balance ==="
curl -s "http://localhost:3000/tokens/$TOKENA/balance/$OWNER" | jq .

echo -e "\n=== 4. Approve Tokens for Swap ==="
curl -s -X POST http://localhost:3000/tokens/approve \
  -H "Content-Type: application/json" \
  -d "{\"tokenAddress\": \"$TOKENA\", \"spenderAddress\": \"$SWAP_ROUTER\", \"amount\": \"max\"}" | jq .

sleep 2

curl -s -X POST http://localhost:3000/tokens/approve \
  -H "Content-Type: application/json" \
  -d "{\"tokenAddress\": \"$TOKENB\", \"spenderAddress\": \"$SWAP_ROUTER\", \"amount\": \"max\"}" | jq .

sleep 2

echo -e "\n=== 5. Approve Tokens for Liquidity ==="
curl -s -X POST http://localhost:3000/tokens/approve \
  -H "Content-Type: application/json" \
  -d "{\"tokenAddress\": \"$TOKENA\", \"spenderAddress\": \"$LIQUIDITY_ROUTER\", \"amount\": \"max\"}" | jq .

sleep 2

curl -s -X POST http://localhost:3000/tokens/approve \
  -H "Content-Type: application/json" \
  -d "{\"tokenAddress\": \"$TOKENB\", \"spenderAddress\": \"$LIQUIDITY_ROUTER\", \"amount\": \"max\"}" | jq .

sleep 2

echo -e "\n=== 6. Add Liquidity ==="
curl -s -X POST http://localhost:3000/liquidity/add \
  -H "Content-Type: application/json" \
  -d "{\"token0\": \"$TOKENA\", \"token1\": \"$TOKENB\", \"fee\": 3000, \"tickLower\": -887220, \"tickUpper\": 887220, \"liquidityDelta\": \"3000000000000000000\"}" | jq .

sleep 2

echo -e "\n=== 7. Execute Swap (Forward) ==="
curl -s -X POST http://localhost:3000/swaps/execute \
  -H "Content-Type: application/json" \
  -d "{\"token0\": \"$TOKENA\", \"token1\": \"$TOKENB\", \"fee\": 3000, \"zeroForOne\": true, \"amountSpecified\": \"1000000000000000000\"}" | jq .

sleep 2

echo -e "\n=== 8. Execute Swap (Reverse) ==="
curl -s -X POST http://localhost:3000/swaps/execute \
  -H "Content-Type: application/json" \
  -d "{\"token0\": \"$TOKENA\", \"token1\": \"$TOKENB\", \"fee\": 3000, \"zeroForOne\": false, \"amountSpecified\": \"500000000000000000\"}" | jq .

sleep 2

echo -e "\n=== 9. Remove Liquidity ==="
curl -s -X POST http://localhost:3000/liquidity/remove \
  -H "Content-Type: application/json" \
  -d "{\"token0\": \"$TOKENA\", \"token1\": \"$TOKENB\", \"fee\": 3000, \"tickLower\": -887220, \"tickUpper\": 887220, \"liquidityDelta\": \"1500000000000000000\"}" | jq .

echo -e "\n=== 10. Final Balance Check ==="
curl -s "http://localhost:3000/tokens/$TOKENA/balance/$OWNER" | jq .
curl -s "http://localhost:3000/tokens/$TOKENB/balance/$OWNER" | jq .

echo -e "\n=== ALL TESTS COMPLETED ==="
```

---

### 2. Token Operations

#### Get Token Information
```bash
curl http://localhost:3000/tokens/0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
```

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
    "name": "Token Stable",
    "symbol": "TOKENS",
    "decimals": 18,
    "totalSupply": "1100000.0",
    "totalSupplyRaw": "1100000000000000000000000"
  }
}
```

#### Get Token Balance
```bash
curl "http://localhost:3000/tokens/0xa513E6E4b8f2a923D98304ec87F64353C4D5C853/balance/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokenAddress": "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
    "ownerAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "balance": "1068010000000000000000000",
    "formatted": "1068010.0"
  }
}
```

#### Approve Tokens
```bash
curl -X POST http://localhost:3000/tokens/approve \
  -H "Content-Type: application/json" \
  -d '{
    "tokenAddress": "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
    "spenderAddress": "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
    "amount": "max"
  }'
```

**With specific amount (in wei):**
```bash
curl -X POST http://localhost:3000/tokens/approve \
  -H "Content-Type: application/json" \
  -d '{
    "tokenAddress": "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
    "spenderAddress": "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
    "amount": "1000000000000000000000"
  }'
```

---

### 3. Pool Operations

#### Initialize Pool (1:1 ratio)
```bash
curl -X POST http://localhost:3000/pools/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "token0": "0x610178da211fef7d417bc0e6fed39f05609ad788",
    "token1": "0xa513e6e4b8f2a923d98304ec87f64353c4d5c853",
    "fee": 3000,
    "sqrtPriceX96": "79228162514264337593543950336"
  }'
```

**Initialize Pool (10:1 ratio - TOKENA)**
```bash
curl -X POST http://localhost:3000/pools/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "token0": "0x2279b7a0f5650ada7c669238d810a4df4960a9fe",
    "token1": "0xa513e6e4b8f2a923d98304ec87f64353c4d5c853",
    "fee": 3000,
    "sqrtPriceX96": "250541448375047937506116894720"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "txHash": "0xa9de3ed012df29a10ce12e40a06d5b8746533614a0e9246e1d8e5a826b5584a9",
    "poolId": "0x585d7c3cb577a2bf959ac4b3550bea722b26c5042139787dd368be8860a151e6",
    "poolKey": {
      "currency0": "0x2279B7a0f5650aDa7C669238d810a4DF4960A9FE",
      "currency1": "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
      "fee": 3000,
      "tickSpacing": 60,
      "hooks": "0x0000000000000000000000000000000000000000"
    },
    "slot0": {
      "sqrtPriceX96": "250541448375047937506116894720",
      "tick": 23027,
      "protocolFee": 0,
      "lpFee": 3000
    }
  }
}
```

#### Get Pool Information
```bash
curl "http://localhost:3000/pools/0x5876d63cc38f3e950bf39292e6d056e391863f638ba3462ac8202fc78538500d"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "poolId": "0x5876d63cc38f3e950bf39292e6d056e391863f638ba3462ac8202fc78538500d",
    "sqrtPriceX96": "78567927826645468113597750749",
    "tick": -168,
    "protocolFee": 0,
    "lpFee": 3000,
    "liquidity": "1500000000000000000000",
    "price": 0.9834027777777778
  }
}
```

#### Get Pool Price
```bash
curl "http://localhost:3000/pools/0x5876d63cc38f3e950bf39292e6d056e391863f638ba3462ac8202fc78538500d/price"
```

---

### 4. Utility Functions

#### Encode PoolKey
```bash
curl -X POST http://localhost:3000/utils/encode-poolkey \
  -H "Content-Type: application/json" \
  -d '{
    "token0": "0x610178da211fef7d417bc0e6fed39f05609ad788",
    "token1": "0xa513e6e4b8f2a923d98304ec87f64353c4d5c853",
    "fee": 3000
  }'
```

**With custom tick spacing:**
```bash
curl -X POST http://localhost:3000/utils/encode-poolkey \
  -H "Content-Type: application/json" \
  -d '{
    "token0": "0x610178da211fef7d417bc0e6fed39f05609ad788",
    "token1": "0xa513e6e4b8f2a923d98304ec87f64353c4d5c853",
    "fee": 500,
    "tickSpacing": 10
  }'
```

#### Calculate PoolId from PoolKey
```bash
curl -X POST http://localhost:3000/utils/calculate-poolid \
  -H "Content-Type: application/json" \
  -d '{
    "poolKey": [
      "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
      "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
      3000,
      60,
      "0x0000000000000000000000000000000000000000"
    ]
  }'
```

#### Convert Price to SqrtPriceX96

**Method 1: Direct price**
```bash
curl -X POST http://localhost:3000/utils/price-to-sqrt \
  -H "Content-Type: application/json" \
  -d '{ "price": 1.0 }'
```

**Method 2: Token amounts (10:1 ratio)**
```bash
curl -X POST http://localhost:3000/utils/price-to-sqrt \
  -H "Content-Type: application/json" \
  -d '{
    "token0Amount": "10",
    "token1Amount": "1"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "price": 0.1,
    "sqrtPriceX96": "25054144837504793750611689472"
  }
}
```

#### Convert SqrtPriceX96 to Price
```bash
curl -X POST http://localhost:3000/utils/sqrt-to-price \
  -H "Content-Type: application/json" \
  -d '{ "sqrtPriceX96": "79228162514264337593543950336" }'
```

---

### 5. Error Handling Examples

#### Invalid Address
```bash
curl "http://localhost:3000/tokens/0xinvalid"
```

**Response (400):**
```json
{
  "success": false,
  "error": "Invalid token address",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

#### Missing Required Fields
```bash
curl -X POST http://localhost:3000/utils/encode-poolkey \
  -H "Content-Type: application/json" \
  -d '{ "token0": "0x610178da211fef7d417bc0e6fed39f05609ad788" }'
```

**Response (400):**
```json
{
  "success": false,
  "error": "Missing required fields: token0, token1, fee",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

---

## Testing with Postman

### 1. Setup Postman Collection

#### Import Collection
1. Open Postman
2. Click **Import** → **Raw text**
3. Paste the collection JSON below

#### Create Environment
1. Click **Environments** → **Create Environment**
2. Add variables:
   - `baseUrl`: `http://localhost:3000`
   - `defaultAccount`: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
   - `tokensAddress`: `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853`
   - `tokencAddress`: `0x610178dA211FEF7D417bC0e6FeD39F05609AD788`
   - `swapRouterAddress`: `0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1`

---

### 2. Postman Collection JSON

Save this as `DEX-API-Phase1.postman_collection.json`:

```json
{
  "info": {
    "name": "DEX API - Phase 1",
    "description": "Uniswap V4 based DEX REST API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    }
  ],
  "item": [
    {
      "name": "Health",
      "item": [
        {
          "name": "Health Check",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/health",
              "host": ["{{baseUrl}}"],
              "path": ["health"]
            }
          }
        }
      ]
    },
    {
      "name": "Tokens",
      "item": [
        {
          "name": "Get Token Info",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/tokens/0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
              "host": ["{{baseUrl}}"],
              "path": ["tokens", "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853"]
            }
          }
        },
        {
          "name": "Get Token Balance",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/tokens/0xa513E6E4b8f2a923D98304ec87F64353C4D5C853/balance/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
              "host": ["{{baseUrl}}"],
              "path": ["tokens", "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853", "balance", "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"]
            }
          }
        },
        {
          "name": "Approve Tokens",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"tokenAddress\": \"0xa513E6E4b8f2a923D98304ec87F64353C4D5C853\",\n  \"spenderAddress\": \"0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1\",\n  \"amount\": \"max\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/tokens/approve",
              "host": ["{{baseUrl}}"],
              "path": ["tokens", "approve"]
            }
          }
        }
      ]
    },
    {
      "name": "Pools",
      "item": [
        {
          "name": "Initialize Pool (1:1)",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"token0\": \"0x610178da211fef7d417bc0e6fed39f05609ad788\",\n  \"token1\": \"0xa513e6e4b8f2a923d98304ec87f64353c4d5c853\",\n  \"fee\": 3000,\n  \"sqrtPriceX96\": \"79228162514264337593543950336\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/pools/initialize",
              "host": ["{{baseUrl}}"],
              "path": ["pools", "initialize"]
            }
          }
        },
        {
          "name": "Get Pool Info",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/pools/0x5876d63cc38f3e950bf39292e6d056e391863f638ba3462ac8202fc78538500d",
              "host": ["{{baseUrl}}"],
              "path": ["pools", "0x5876d63cc38f3e950bf39292e6d056e391863f638ba3462ac8202fc78538500d"]
            }
          }
        },
        {
          "name": "Get Pool Price",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/pools/0x5876d63cc38f3e950bf39292e6d056e391863f638ba3462ac8202fc78538500d/price",
              "host": ["{{baseUrl}}"],
              "path": ["pools", "0x5876d63cc38f3e950bf39292e6d056e391863f638ba3462ac8202fc78538500d", "price"]
            }
          }
        }
      ]
    },
    {
      "name": "Utils",
      "item": [
        {
          "name": "Encode PoolKey",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"token0\": \"0x610178da211fef7d417bc0e6fed39f05609ad788\",\n  \"token1\": \"0xa513e6e4b8f2a923d98304ec87f64353c4d5c853\",\n  \"fee\": 3000\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/utils/encode-poolkey",
              "host": ["{{baseUrl}}"],
              "path": ["utils", "encode-poolkey"]
            }
          }
        },
        {
          "name": "Calculate PoolId",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"poolKey\": [\n    \"0x610178dA211FEF7D417bC0e6FeD39F05609AD788\",\n    \"0xa513E6E4b8f2a923D98304ec87F64353C4D5C853\",\n    3000,\n    60,\n    \"0x0000000000000000000000000000000000000000\"\n  ]\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/utils/calculate-poolid",
              "host": ["{{baseUrl}}"],
              "path": ["utils", "calculate-poolid"]
            }
          }
        },
        {
          "name": "Price to SqrtPriceX96",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"price\": 1.0\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/utils/price-to-sqrt",
              "host": ["{{baseUrl}}"],
              "path": ["utils", "price-to-sqrt"]
            }
          }
        },
        {
          "name": "SqrtPriceX96 to Price",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"sqrtPriceX96\": \"79228162514264337593543950336\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/utils/sqrt-to-price",
              "host": ["{{baseUrl}}"],
              "path": ["utils", "sqrt-to-price"]
            }
          }
        }
      ]
    }
  ]
}
```

---

### 3. Using Postman Collection

#### Step-by-Step:
1. **Import Collection**: Import the JSON above
2. **Set Environment**: Select the environment with your variables
3. **Test Endpoints**: 
   - Start with Health Check
   - Test token operations
   - Initialize a pool
   - Query pool information
   - Use utility functions

#### Tips:
- Use **Tests** tab to add assertions
- Use **Pre-request Scripts** to set dynamic variables
- Enable **Console** (View → Show Postman Console) to see request details

---

## Common Test Scenarios

### Scenario 1: Complete Pool Setup

```bash
# 1. Check API health
curl http://localhost:3000/health

# 2. Get token info for both tokens
curl http://localhost:3000/tokens/0x610178da211fef7d417bc0e6fed39f05609ad788
curl http://localhost:3000/tokens/0xa513e6e4b8f2a923d98304ec87f64353c4d5c853

# 3. Encode poolkey to get poolId
curl -X POST http://localhost:3000/utils/encode-poolkey \
  -H "Content-Type: application/json" \
  -d '{
    "token0": "0x610178da211fef7d417bc0e6fed39f05609ad788",
    "token1": "0xa513e6e4b8f2a923d98304ec87f64353c4d5c853",
    "fee": 3000
  }'

# 4. Initialize pool with 1:1 price
curl -X POST http://localhost:3000/pools/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "token0": "0x610178da211fef7d417bc0e6fed39f05609ad788",
    "token1": "0xa513e6e4b8f2a923d98304ec87f64353c4d5c853",
    "fee": 3000,
    "sqrtPriceX96": "79228162514264337593543950336"
  }'

# 5. Verify pool was created
curl "http://localhost:3000/pools/0x5876d63cc38f3e950bf39292e6d056e391863f638ba3462ac8202fc78538500d"
```

### Scenario 2: Token Approval Workflow

```bash
# 1. Check current balance
curl "http://localhost:3000/tokens/0xa513e6e4b8f2a923d98304ec87f64353c4d5c853/balance/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

# 2. Approve tokens for swap router
curl -X POST http://localhost:3000/tokens/approve \
  -H "Content-Type: application/json" \
  -d '{
    "tokenAddress": "0xa513e6e4b8f2a923d98304ec87f64353c4d5c853",
    "spenderAddress": "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
    "amount": "max"
  }'

# 3. Verify transaction succeeded (check response txHash)
```

### Scenario 3: Price Calculations

```bash
# Calculate sqrtPriceX96 for different ratios

# 1:1 ratio
curl -X POST http://localhost:3000/utils/price-to-sqrt \
  -H "Content-Type: application/json" \
  -d '{ "price": 1.0 }'

# 10:1 ratio (TOKENA)
curl -X POST http://localhost:3000/utils/price-to-sqrt \
  -H "Content-Type: application/json" \
  -d '{ "token0Amount": "10", "token1Amount": "1" }'

# 20:1 ratio (TOKENB)
curl -X POST http://localhost:3000/utils/price-to-sqrt \
  -H "Content-Type: application/json" \
  -d '{ "token0Amount": "20", "token1Amount": "1" }'

# Convert back to verify
curl -X POST http://localhost:3000/utils/sqrt-to-price \
  -H "Content-Type: application/json" \
  -d '{ "sqrtPriceX96": "250541448375047937506116894720" }'
```

---

## Quick Reference

### Common SqrtPriceX96 Values

| Ratio | Price | sqrtPriceX96 |
|-------|-------|--------------|
| 1:1   | 1.0   | `79228162514264337593543950336` |
| 1:10  | 0.1   | `25054144837504793750611689472` |
| 1:20  | 0.05  | `17710571124811242106498021376` |
| 10:1  | 10.0  | `250541448375047937506116894720` |

### Fee Tiers

| Fee (bps) | Percentage | Tick Spacing | Use Case |
|-----------|------------|--------------|----------|
| 500       | 0.05%      | 10           | Stablecoins |
| 3000      | 0.3%       | 60           | Standard pairs |
| 10000     | 1.0%       | 200          | Exotic pairs |

### Response Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200  | Success | Request completed successfully |
| 400  | Bad Request | Missing required fields, invalid address |
| 404  | Not Found | Endpoint doesn't exist |
| 500  | Server Error | Contract call failed, pool not found |

---

## Troubleshooting

### Common Issues

**Connection Refused**
```bash
# Check if API server is running
curl http://localhost:3000/health

# If not, start it:
cd api-v2 && npm start
```

**Contract Call Failed**
```bash
# Ensure Hardhat node is running
# In separate terminal:
npm run node
```

**Invalid Address**
- API now accepts addresses in any case (lowercase, uppercase, or checksum)
- Addresses must be valid Ethereum addresses (20 bytes, 42 characters with 0x)

**Pool Not Found**
- Verify pool is initialized first
- Use `/utils/encode-poolkey` to get correct poolId

---

## Additional Resources

- [API README](README.md) - Setup and configuration
- [Phase 1 Complete](PHASE1_COMPLETE.md) - Full test results
- [Main Project Docs](../README.md) - Contract deployment guide

---

## Test Results Summary

### ✅ Verified Working Endpoints

| Category | Endpoint | Method | Status | Gas Cost |
|----------|----------|--------|--------|---------|
| Health | `/health` | GET | ✅ Working | N/A |
| Tokens | `/tokens/:address` | GET | ✅ Working | N/A |
| Tokens | `/tokens/:address/balance/:owner` | GET | ✅ Working | N/A |
| Tokens | `/tokens/approve` | POST | ✅ Working | ~46,000 |
| Utils | `/utils/encode-poolkey` | POST | ✅ Working | N/A |
| Utils | `/utils/calculate-poolid` | POST | ✅ Working | N/A |
| Utils | `/utils/price-to-sqrt` | POST | ✅ Working | N/A |
| Utils | `/utils/sqrt-to-price` | POST | ✅ Working | N/A |
| Pools | `/pools/initialize` | POST | ✅ Working | ~50,000 |
| Pools | `/pools/:poolId` | GET | ✅ Working | N/A |
| **Liquidity** | `/liquidity/add` | POST | ✅ **WORKING** | **~27,160** |
| **Liquidity** | `/liquidity/remove` | POST | ✅ **WORKING** | **~27,160** |
| **Liquidity** | `/liquidity/add/quote` | POST | ✅ Working | N/A |
| **Swaps** | `/swaps/execute` | POST | ✅ **WORKING** | **~26,260-26,710** |
| **Swaps** | `/swaps/quote` | POST | ✅ Working | N/A |

### Gas Usage Metrics

- **Add Liquidity:** ~27,160 gas
- **Remove Liquidity:** ~27,160 gas
- **Token Swap (forward):** ~26,260 gas
- **Token Swap (reverse):** ~26,710 gas
- **Token Approval:** ~46,000 gas
- **Pool Initialization:** ~50,000 gas

### Recent Test Results (December 26, 2025)

**Test Environment:**
- Network: Hardhat localhost (chainId 1337)
- Test Account: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- TOKENA: `0x2279B7A0f5650aDA7c669238d810A4dF4960a9Fe`
- TOKENB: `0x8A791620dd6260079BF849Dc5567aDC3F2FdC318`

**Successful Transactions:**
1. ✅ Add Liquidity: 3e18 units, tx `0x8fe5b06c...`, block 31
2. ✅ Execute Swap (forward): 1e18, tx `0xf3d5b8c5...`, block 33
3. ✅ Execute Swap (reverse): 0.5e18, tx `0x878650c5...`, block 34
4. ✅ Remove Liquidity: 1.5e18 units, tx `0x1b13e37c...`, block 35

---

## Key Takeaways

### ✅ What's Working
1. All Phase 2 critical features operational
2. Liquidity management (add/remove) fully functional
3. Token swaps working in both directions
4. Gas costs consistent and reasonable
5. All contract interactions validated on-chain

### ⚠️ Important Notes
- Token endpoints use **GET** method with path parameters (not POST)
- Always use token addresses from your `.env` file
- Full-range liquidity requires `tickLower: -887220, tickUpper: 887220`
- Tokens must be approved before liquidity/swap operations

### 🔄 Next Steps
1. Phase 3: Multi-hop swap routes
2. Advanced pool analytics
3. Position management (NFT-based)
4. Transaction history indexing
5. WebSocket real-time updates

---

**Last Updated**: December 26, 2025  
**API Version**: Phase 2 (15 endpoints)  
**Status**: ✅ All Critical Features Working
