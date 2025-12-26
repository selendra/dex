# DEX REST API - Phase 1

REST API for interacting with Uniswap V4-based DEX smart contracts.

## Setup

### 1. Install Dependencies
```bash
cd api-v2
npm install
```

### 2. Configure Environment
Edit `.env` file with your contract addresses from deployment.

### 3. Start API Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

API will be available at `http://localhost:3000`

## API Endpoints

### Health Check
```bash
GET /health
```

### Pool Management

**Initialize Pool**
```bash
POST /pools/initialize
{
  "token0": "0x...",
  "token1": "0x...",
  "fee": 3000,
  "sqrtPriceX96": "79228162514264337593543950336"
}
```

**Get Pool Info**
```bash
GET /pools/:poolId
```

**Get Pool Price**
```bash
GET /pools/:poolId/price
```

### Token Management

**Get Token Info**
```bash
GET /tokens/:address
```

**Approve Token**
```bash
POST /tokens/approve
{
  "tokenAddress": "0x...",
  "spenderAddress": "0x...",
  "amount": "max"  // or specific amount in wei
}
```

**Get Token Balance**
```bash
GET /tokens/:address/balance/:owner
```

### Utilities

**Encode PoolKey**
```bash
POST /utils/encode-poolkey
{
  "token0": "0x...",
  "token1": "0x...",
  "fee": 3000
}
```

**Calculate PoolId**
```bash
POST /utils/calculate-poolid
{
  "poolKey": ["0x...", "0x...", 3000, 60, "0x0...0"]
}
```

**Price to SqrtPriceX96**
```bash
POST /utils/price-to-sqrt
{
  "price": 1.0
}
# OR
{
  "token0Amount": "1000",
  "token1Amount": "1000"
}
```

**SqrtPriceX96 to Price**
```bash
POST /utils/sqrt-to-price
{
  "sqrtPriceX96": "79228162514264337593543950336"
}
```

## Quick Test

### 1. Check Health
```bash
curl http://localhost:3000/health
```

### 2. Get Token Info (TOKENS)
```bash
curl http://localhost:3000/tokens/0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
```

### 3. Initialize Pool
```bash
curl -X POST http://localhost:3000/pools/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "token0": "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
    "token1": "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
    "fee": 3000,
    "sqrtPriceX96": "79228162514264337593543950336"
  }'
```

### 4. Get Pool Info
```bash
curl http://localhost:3000/pools/0x...poolId...
```

## Response Format

All endpoints return standardized JSON:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "uuid"
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "uuid"
  }
}
```

## Project Structure

```
api-v2/
├── server.js              # Main Express app
├── package.json
├── .env                   # Configuration
├── middleware/
│   ├── errorHandler.js    # Error handling
│   └── requestLogger.js   # Request logging
├── routes/
│   ├── health.js          # Health check
│   ├── pools.js           # Pool endpoints
│   ├── tokens.js          # Token endpoints
│   └── utils.js           # Utility endpoints
└── services/
    └── contractService.js # Contract interactions
```

## Next Steps (Phase 2)

- [ ] Swap execution endpoint
- [ ] Swap quote endpoint
- [ ] Add liquidity endpoint
- [ ] Remove liquidity endpoint
- [ ] User positions tracking

## Notes

- API uses the wallet from `PRIVATE_KEY` in `.env` for transactions
- All amounts are in wei (use ethers.parseEther for conversion)
- Pool initialization requires tokens to be sorted (handled automatically)
- Use fee tiers: 500 (0.05%), 3000 (0.3%), or 10000 (1%)
