# DEX Backend API Guide

A comprehensive guide for understanding, running, and testing the DEX REST API backend and React frontend.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Backend API Reference](#backend-api-reference)
5. [Authentication](#authentication)
6. [Testing the API](#testing-the-api)
7. [Frontend Setup](#frontend-setup)
8. [Complete Workflow Examples](#complete-workflow-examples)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DEX Architecture                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌─────────────────┐     ┌─────────────────────────┐   │
│  │   React     │     │   Express.js    │     │   Hardhat Local Node    │   │
│  │  Frontend   │────▶│   REST API      │────▶│   (Blockchain)          │   │
│  │  Port 3001  │     │   Port 3000     │     │   Port 8545             │   │
│  └─────────────┘     └─────────────────┘     └─────────────────────────┘   │
│                              │                           │                  │
│                              │                           │                  │
│                      ┌───────┴───────┐         ┌─────────┴─────────┐       │
│                      │   Services    │         │  Smart Contracts  │       │
│                      ├───────────────┤         ├───────────────────┤       │
│                      │ • auth.js     │         │ • PoolManager     │       │
│                      │ • blockchain  │         │ • StateView       │       │
│                      │   .js         │         │ • SwapRouter      │       │
│                      └───────────────┘         │ • LiquidityMgr    │       │
│                                                │ • TestTokens      │       │
│                                                └───────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Port | Description |
|-----------|------|-------------|
| **Hardhat Node** | 8545 | Local Ethereum blockchain with deployed Uniswap V4 contracts |
| **Express API** | 3000 | REST API server handling authentication and blockchain interactions |
| **React Frontend** | 3001 | User interface for swapping tokens and managing liquidity |

### File Structure

```
api/
├── index.js              # Entry point (initializes services)
├── server.js             # Express server setup
├── data/
│   └── users.json        # Persistent user storage
├── middleware/
│   └── auth.js           # JWT authentication middleware
├── routes/
│   ├── auth.js           # Authentication endpoints
│   ├── swap.js           # Swap endpoints
│   ├── pool.js           # Pool management endpoints
│   └── liquidity.js      # Liquidity endpoints
└── services/
    ├── auth.js           # User/wallet management
    └── blockchain.js     # Blockchain interactions
```

---

## Prerequisites

- **Node.js** v18+ 
- **npm** v8+
- **Git**

---

## Quick Start

### 1. Start Hardhat Node

```bash
cd /home/nath/Project/dex
npx hardhat node
```

Keep this terminal running. You should see:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

### 2. Deploy Contracts (New Terminal)

```bash
# Deploy core contracts
npm run deploy:local

# Deploy test tokens
npm run deploy:tokens
```

### 3. Start Backend API

```bash
node api/index.js
```

You should see:
```
🚀 Starting DEX API Server...
📡 Connecting to blockchain...
✅ Blockchain service initialized
   PoolManager: 0x5FbDB2315678afecb367f032d93F642f64180aa3
   StateView: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
   LiquidityManager: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
   SwapRouter: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

🚀 DEX API server running on port 3000
```

### 4. Start Frontend (Optional)

```bash
cd frontend
npm install
PORT=3001 npm start
```

---

## Backend API Reference

### Base URL
```
http://localhost:3000/api
```

### Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{"status":"ok","message":"DEX API is running"}
```

---

### Authentication Endpoints

#### POST /api/auth/register
Register a new user with auto-generated wallet.

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "alice123",
    "adminSecret": "supersecret"  // Optional: for admin role
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "username": "alice",
    "address": "0x3C485e21bAAB81aD076C99e29e0a96Bef958F756",
    "role": "user",
    "mnemonic": "word1 word2 ... word12",
    "token": "eyJhbGc..."
  },
  "warning": "Save your mnemonic phrase securely!"
}
```

#### POST /api/auth/login
Login and receive JWT token.

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "alice123"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "username": "alice",
    "address": "0x3C485e21bAAB81aD076C99e29e0a96Bef958F756",
    "role": "user",
    "token": "eyJhbGc..."
  }
}
```

#### GET /api/auth/me
Get current user info (requires authentication).

**Request:**
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

---

### Swap Endpoints

#### POST /api/swap/quote
Get swap quote without executing.

**Request:**
```bash
curl -X POST http://localhost:3000/api/swap/quote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "tokenIn": "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    "tokenOut": "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    "amountIn": "100"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokenIn": "0xDc64...",
    "tokenOut": "0x5FC8...",
    "amountIn": "100",
    "estimatedAmountOut": "99.70",
    "price": 1,
    "priceImpact": "1.0000%",
    "fee": "0.30%",
    "poolLiquidity": "10000.0"
  }
}
```

#### POST /api/swap
Execute a token swap (requires authentication).

**Request:**
```bash
curl -X POST http://localhost:3000/api/swap \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "tokenIn": "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    "tokenOut": "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    "amountIn": "10",
    "password": "alice123"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Swap executed successfully",
  "data": {
    "txHash": "0x6b40...",
    "amountIn": "10",
    "amountOut": "9.96",
    "balances": {
      "before": { "tokens": { "0xDc64...": "2000.0" } },
      "after": { "tokens": { "0xDc64...": "1990.0" } }
    }
  }
}
```

#### GET /api/swap/balances
Get user's token balances (requires authentication).

**Request:**
```bash
curl "http://localhost:3000/api/swap/balances?tokens=0xDc64...,0x5FC8..." \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "native": "1.0",
    "tokens": {
      "0xDc64...": "2000.0",
      "0x5FC8...": "1000.0"
    }
  }
}
```

---

### Pool Endpoints

#### GET /api/pool/:token0/:token1
Get pool information.

**Request:**
```bash
curl http://localhost:3000/api/pool/0x5FC8.../0xDc64...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "poolKey": {
      "currency0": "0x5FC8...",
      "currency1": "0xDc64...",
      "fee": 3000,
      "tickSpacing": 1
    },
    "poolId": "0x451e...",
    "sqrtPriceX96": "79307152992291059138124713654",
    "tick": "19",
    "liquidity": "10000000000000000000000"
  }
}
```

#### POST /api/pool/initialize
Initialize a new pool (admin only).

**Request:**
```bash
curl -X POST http://localhost:3000/api/pool/initialize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "token0": "0xDc64...",
    "token1": "0x5FC8...",
    "priceRatio": 1
  }'
```

---

### Liquidity Endpoints

#### POST /api/liquidity/add
Add liquidity to a pool (admin only).

**Request:**
```bash
curl -X POST http://localhost:3000/api/liquidity/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "token0": "0xDc64...",
    "token1": "0x5FC8...",
    "amount0": "10000",
    "amount1": "10000"
  }'
```

#### POST /api/liquidity/remove
Remove liquidity from a pool (admin only).

**Request:**
```bash
curl -X POST http://localhost:3000/api/liquidity/remove \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "token0": "0xDc64...",
    "token1": "0x5FC8...",
    "liquidityAmount": "5000"
  }'
```

---

## Authentication

### JWT Token Flow

```
┌────────┐      POST /auth/login       ┌────────┐
│ Client │ ───────────────────────────▶│ Server │
│        │                             │        │
│        │◀─────────────────────────── │        │
│        │    { token: "eyJ..." }      │        │
└────────┘                             └────────┘
     │
     │  Store token in localStorage
     ▼
┌────────┐    Authorization: Bearer    ┌────────┐
│ Client │ ───────────────────────────▶│ Server │
│        │        <token>              │        │
│        │                             │        │
│        │◀─────────────────────────── │        │
│        │    Protected Resource       │        │
└────────┘                             └────────┘
```

### User Roles

| Role | Permissions |
|------|-------------|
| `user` | Login, view balances, execute swaps, get quotes |
| `admin` | All user permissions + initialize pools, add/remove liquidity |

### Getting Admin Role

The first user to register with the correct `adminSecret` (set in `.env`) becomes admin:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -d '{"username":"admin","password":"admin123","adminSecret":"supersecret"}'
```

---

## Testing the API

### Complete Test Script

Create and run this test script:

```bash
#!/bin/bash
# test-api.sh

BASE_URL="http://localhost:3000/api"

echo "=== 1. Health Check ==="
curl -s $BASE_URL/../health | jq .

echo -e "\n=== 2. Register User ==="
curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}' | jq .

echo -e "\n=== 3. Login ==="
TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}' | jq -r '.data.token')
echo "Token: ${TOKEN:0:50}..."

echo -e "\n=== 4. Get Balances ==="
curl -s "$BASE_URL/swap/balances?tokens=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\n=== 5. Get Pool Info ==="
curl -s "$BASE_URL/pool/0x5FC8d32690cc91D4c39d9d3abcBD16989F875707/0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9" | jq .

echo -e "\n=== 6. Get Swap Quote ==="
curl -s -X POST $BASE_URL/swap/quote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "tokenIn": "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    "tokenOut": "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    "amountIn": "100"
  }' | jq .

echo -e "\n=== Tests Complete ==="
```

### Test with Pre-funded User

If you need to test swaps, fund a user first:

```bash
# Fund user wallet with tokens
node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
const adminKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const wallet = new ethers.Wallet(adminKey, provider);
const tokenABI = ['function transfer(address,uint256) returns (bool)'];

async function fund() {
  const userAddress = '0x...'; // User's wallet address from registration
  const token = new ethers.Contract('0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9', tokenABI, wallet);
  await token.transfer(userAddress, ethers.parseEther('1000'));
  console.log('Funded user with 1000 tokens');
}
fund();
"
```

---

## Frontend Setup

### Installation

```bash
cd frontend
npm install
```

### Environment Variables

Create `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_TOKENS_ADDRESS=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
REACT_APP_TOKENA_ADDRESS=0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
REACT_APP_TOKENB_ADDRESS=0x0165878A594ca255338adfa4d48449f69242Eb8F
REACT_APP_TOKENC_ADDRESS=0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
```

### Running Frontend

```bash
PORT=3001 npm start
```

Open http://localhost:3001

### Frontend Pages

| Page | URL | Description |
|------|-----|-------------|
| **Login** | `/login` | User authentication |
| **Register** | `/register` | New user registration |
| **Swap** | `/` | Token swap interface |
| **Balances** | `/balances` | View token balances |
| **Pool Management** | `/pools` | Initialize pools (admin) |
| **Liquidity** | `/liquidity` | Add/remove liquidity (admin) |

---

## Complete Workflow Examples

### Workflow 1: User Swap Flow

```bash
# Terminal 1: Start Hardhat
npx hardhat node

# Terminal 2: Deploy & Start API
npm run deploy:local
npm run deploy:tokens
node api/index.js

# Terminal 3: Test the flow

# 1. Login as admin and initialize pool
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')

curl -X POST http://localhost:3000/api/pool/initialize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"token0":"0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9","token1":"0x5FC8d32690cc91D4c39d9d3abcBD16989F875707","priceRatio":1}'

# 2. Add liquidity
curl -X POST http://localhost:3000/api/liquidity/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"token0":"0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9","token1":"0x5FC8d32690cc91D4c39d9d3abcBD16989F875707","amount0":"10000","amount1":"10000"}'

# 3. Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"alice123"}'

# 4. Fund user wallet (run from project root)
# ... (see funding script above)

# 5. Login as user and swap
USER_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"alice123"}' | jq -r '.data.token')

curl -X POST http://localhost:3000/api/swap \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"tokenIn":"0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9","tokenOut":"0x5FC8d32690cc91D4c39d9d3abcBD16989F875707","amountIn":"100","password":"alice123"}'
```

### Workflow 2: Frontend Testing

1. **Start all services:**
   ```bash
   # Terminal 1
   npx hardhat node
   
   # Terminal 2
   npm run deploy:local && npm run deploy:tokens && node api/index.js
   
   # Terminal 3
   cd frontend && PORT=3001 npm start
   ```

2. **Test in browser:**
   - Open http://localhost:3001
   - Click "Register" → Create account (save mnemonic!)
   - Fund your wallet using the admin script
   - Go to "Swap" page
   - Enter amount, select tokens
   - Enter password and click "Swap"

---

## Troubleshooting

### Common Issues

#### 1. "Cannot connect to network"
```
Error: connect ECONNREFUSED 127.0.0.1:8545
```
**Solution:** Start Hardhat node first: `npx hardhat node`

#### 2. "Pool not initialized"
```
Error: Pool does not exist
```
**Solution:** Initialize the pool as admin before swapping.

#### 3. "Insufficient balance"
```
Error: Insufficient balance
```
**Solution:** Fund the user's wallet with test tokens.

#### 4. "Nonce too low"
```
Error: Nonce too low
```
**Solution:** Restart the API server to reset cached nonces: `pkill -f "node api" && node api/index.js`

#### 5. Frontend shows "Network Error"
**Solution:** 
- Check if backend is running on port 3000
- Check if `proxy` in `frontend/package.json` points to `http://localhost:3000`

### Logs

Enable debug logging:
```bash
DEBUG=* node api/index.js
```

### Reset Everything

```bash
# Stop all processes
pkill -f hardhat
pkill -f "node api"

# Clean and restart
npx hardhat clean
npx hardhat node &
sleep 2
npm run deploy:local
npm run deploy:tokens
node api/index.js
```

---

## Token Addresses Reference

| Token | Symbol | Address |
|-------|--------|---------|
| Token Stable | TOKENS | `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9` |
| Token A | TOKENA | `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707` |
| Token B | TOKENB | `0x0165878A594ca255338adfa4d48449f69242Eb8F` |
| Token C | TOKENC | `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853` |

## Contract Addresses Reference

| Contract | Address |
|----------|---------|
| PoolManager | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| StateView | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| SimpleLiquidityManager | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |
| WorkingSwapRouter | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` |

---

## Test Accounts

| Username | Password | Role | Notes |
|----------|----------|------|-------|
| admin | admin123 | admin | First registered user with adminSecret |
| alice | alice123 | user | Pre-funded test user |

---

*Last updated: January 5, 2026*
