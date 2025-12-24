# DEX REST API - Quick Start Guide

## Overview

This REST API provides endpoints for interacting with the DEX smart contracts:
- **Liquidity Management**: Add/remove liquidity
- **Token Swaps**: Execute token swaps with quotes
- **Price Queries**: Check current and historical prices

## Setup

### 1. Install Dependencies

```bash
cd api
npm install
```

### 2. Environment Configuration

The `.env` file contains:
```env
PORT=3000
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
POOL_MANAGER_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
STATE_VIEW_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
POSITION_MANAGER_ADDRESS=0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
SWAP_ROUTER_ADDRESS=0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB
```

### 3. Start the API Server

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Contract Deployment Status

✅ **Contracts are deployed** with the following addresses:
- **PoolManager**: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- **PositionManager**: `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707`
- **SwapRouter**: `0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB`
- **StateView**: `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9`

## API Endpoints

### Health Check
```bash
GET /health
```

### Liquidity Endpoints

#### 1. Add Liquidity Quote
```bash
POST /api/liquidity/add/quote
Content-Type: application/json

{
  "currency0": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "currency1": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  "fee": 3000,
  "tickLower": -887220,
  "tickUpper": 887220,
  "amount0Desired": "1000000000000000000",
  "amount1Desired": "1000000000000000000"
}
```

#### 2. Add Liquidity
```bash
POST /api/liquidity/add
Content-Type: application/json

{
  "currency0": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "currency1": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  "fee": 3000,
  "tickLower": -887220,
  "tickUpper": 887220,
  "liquidity": "1000000000000000000",
  "amount0Max": "1100000000000000000",
  "amount1Max": "1100000000000000000",
  "recipient": "0xYourAddress",
  "deadline": 1735034400
}
```

#### 3. Remove Liquidity Quote
```bash
POST /api/liquidity/remove/quote
Content-Type: application/json

{
  "tokenId": 1,
  "liquidityPercentage": 100
}
```

#### 4. Remove Liquidity
```bash
POST /api/liquidity/remove
Content-Type: application/json

{
  "tokenId": 1,
  "liquidity": "1000000000000000000",
  "amount0Min": "900000000000000000",
  "amount1Min": "900000000000000000",
  "deadline": 1735034400
}
```

#### 5. Get Position Details
```bash
GET /api/liquidity/position/:tokenId
```

### Swap Endpoints

#### 1. Get Swap Quote
```bash
POST /api/swap/quote
Content-Type: application/json

{
  "tokenIn": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "tokenOut": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  "amountIn": "1000000000000000000",
  "fee": 3000
}
```

#### 2. Execute Swap
```bash
POST /api/swap/execute
Content-Type: application/json

{
  "tokenIn": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "tokenOut": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  "amountIn": "1000000000000000000",
  "amountOutMinimum": "990000000000000000",
  "recipient": "0xYourAddress",
  "fee": 3000,
  "slippageTolerance": 0.5
}
```

#### 3. Find Optimal Route
```bash
POST /api/swap/route
Content-Type: application/json

{
  "tokenIn": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "tokenOut": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  "amountIn": "1000000000000000000"
}
```

### Price Endpoints

#### 1. Get Current Pool Price
```bash
GET /api/price/:poolId?currency0=0x5FbDB2315678afecb367f032d93F642f64180aa3&currency1=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512&fee=3000
```

#### 2. Get Price Quote
```bash
POST /api/price/quote
Content-Type: application/json

{
  "tokenIn": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "tokenOut": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  "amountIn": "1000000000000000000",
  "fee": 3000
}
```

#### 3. Get Price History
```bash
GET /api/price/history?currency0=0x5FbDB2315678afecb367f032d93F642f64180aa3&currency1=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512&fee=3000&interval=1h&limit=24
```

### Pool Endpoints

#### 1. List Pools
```bash
GET /api/pools?limit=20&offset=0
```

#### 2. Get Pool Details
```bash
GET /api/pools/:poolId?currency0=0x5FbDB2315678afecb367f032d93F642f64180aa3&currency1=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512&fee=3000
```

#### 3. Initialize Pool
```bash
POST /api/pools/initialize
Content-Type: application/json

{
  "currency0": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "currency1": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  "fee": 3000,
  "initialPrice": 1
}
```

## Testing with cURL

### Example: Get Swap Quote
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

### Example: Check Pool Price
```bash
curl "http://localhost:3000/api/price/test-pool?currency0=0x5FbDB2315678afecb367f032d93F642f64180aa3&currency1=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512&fee=3000"
```

### Example: Health Check
```bash
curl http://localhost:3000/health
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2025-12-23T10:30:00.000Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Error description",
    "details": {}
  },
  "meta": {
    "timestamp": "2025-12-23T10:30:00.000Z"
  }
}
```

## Rate Limiting

- **100 requests per 15 minutes** per IP address
- Applies to all `/api/*` endpoints

## Important Notes

1. **Token Addresses**: Use the actual deployed token addresses from your network
2. **Native ETH**: Use `0x0000000000000000000000000000000000000000` for native ETH
3. **Amounts**: All token amounts should be in wei (smallest unit)
4. **Deadlines**: Unix timestamp in seconds
5. **Fee Tiers**: 
   - 500 = 0.05%
   - 3000 = 0.3%
   - 10000 = 1%

## Next Steps

1. **Deploy Test Tokens**: Create ERC20 tokens for testing
2. **Initialize Pools**: Create pools with initial liquidity
3. **Test Swaps**: Execute test swaps between tokens
4. **Monitor**: Use the health endpoint to verify contract connections

## Development

### Project Structure
```
api/
├── server.js              # Main Express server
├── routes/
│   ├── liquidity.js      # Liquidity endpoints
│   ├── swap.js           # Swap endpoints
│   ├── price.js          # Price endpoints
│   └── pools.js          # Pool endpoints
├── services/
│   └── contractService.js # Blockchain interaction service
├── package.json
└── .env
```

### Adding New Features

1. Add route handlers in `/routes`
2. Add contract interactions in `/services/contractService.js`
3. Update this README with new endpoints

## Troubleshooting

### Connection Issues
- Verify Hardhat node is running: `npm run node` (in main project directory)
- Check RPC_URL in `.env`

### Contract Errors
- Verify contract addresses in `.env`
- Check contract compilation: `npm run compile` (in main project directory)

### Transaction Failures
- Ensure sufficient ETH balance
- Check gas limits
- Verify token approvals for non-ETH tokens

## Support

For issues or questions:
1. Check the API error response for details
2. Review contract deployment addresses
3. Verify network connection and node status
