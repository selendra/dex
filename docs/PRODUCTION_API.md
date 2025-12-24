# DEX Production API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
Currently uses a single wallet (configured via `PRIVATE_KEY` in `.env`). For production, implement proper authentication and user wallet management.

---

## Endpoints

### Health Check
```http
GET /health
```
Check API server status and contract addresses.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-12-24T00:00:00.000Z",
    "contracts": {
      "poolManager": "0x...",
      "positionManager": "0x...",
      "swapRouter": "0x...",
      "stateView": "0x..."
    }
  }
}
```

---

## Token Operations

### Get Token Info
```http
GET /api/tokens/:address
```

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "name": "Token Name",
    "symbol": "TKN",
    "decimals": 18,
    "totalSupply": "1000000000000000000000000"
  }
}
```

### Get Token Balance
```http
GET /api/tokens/:address/balance/:account
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "0x...",
    "account": "0x...",
    "balance": "1000000000000000000",
    "balanceFormatted": "1.0",
    "decimals": 18,
    "symbol": "TKN"
  }
}
```

### Get Token Allowance
```http
GET /api/tokens/:address/allowance/:owner/:spender
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "0x...",
    "owner": "0x...",
    "spender": "0x...",
    "allowance": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
    "allowanceFormatted": "115792089237316195423570985008687907853269984665640564039457.584007913129639935",
    "isUnlimited": true,
    "decimals": 18,
    "symbol": "TKN"
  }
}
```

### Approve Token Spending
```http
POST /api/tokens/:address/approve
```

**Request Body:**
```json
{
  "spender": "0x...",
  "amount": "115792089237316195423570985008687907853269984665640564039457584007913129639935"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0x...",
    "blockNumber": 12345,
    "gasUsed": "50000",
    "token": "0x...",
    "spender": "0x...",
    "amount": "115792089237316195423570985008687907853269984665640564039457584007913129639935"
  }
}
```

---

## DEX Operations

### Initialize Pool
```http
POST /api/dex/pool/initialize
```

**Request Body:**
```json
{
  "tokenA": "0x...",
  "tokenB": "0x...",
  "fee": 3000,
  "initialPrice": 1.0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0x...",
    "blockNumber": 12345,
    "gasUsed": "150000",
    "poolId": "0x...",
    "poolKey": {
      "currency0": "0x...",
      "currency1": "0x...",
      "fee": 3000,
      "tickSpacing": 60,
      "hooks": "0x0000000000000000000000000000000000000000"
    },
    "initialPrice": 1.0,
    "sqrtPriceX96": "79228162514264337593543950336"
  }
}
```

### Add Liquidity
```http
POST /api/dex/liquidity/add
```

**Request Body:**
```json
{
  "tokenA": "0x...",
  "tokenB": "0x...",
  "amountA": "1000000000000000000",
  "amountB": "1000000000000000000",
  "fee": 3000,
  "tickLower": -887220,
  "tickUpper": 887220
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0x...",
    "blockNumber": 12346,
    "gasUsed": "180000",
    "poolKey": {
      "currency0": "0x...",
      "currency1": "0x...",
      "fee": 3000,
      "tickSpacing": 60,
      "hooks": "0x0000000000000000000000000000000000000000"
    },
    "amountA": "1000000000000000000",
    "amountB": "1000000000000000000",
    "liquidityDelta": "1000000000000000000",
    "tickRange": {
      "lower": -887220,
      "upper": 887220
    }
  }
}
```

### Execute Swap
```http
POST /api/dex/swap
```

**Request Body:**
```json
{
  "tokenIn": "0x...",
  "tokenOut": "0x...",
  "amountIn": "1000000000000000000",
  "minAmountOut": "900000000000000000",
  "fee": 3000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0x...",
    "blockNumber": 12347,
    "gasUsed": "120000",
    "tokenIn": "0x...",
    "tokenOut": "0x...",
    "amountIn": "1000000000000000000",
    "balanceOut": "950000000000000000",
    "poolKey": {
      "currency0": "0x...",
      "currency1": "0x...",
      "fee": 3000,
      "tickSpacing": 60,
      "hooks": "0x0000000000000000000000000000000000000000"
    }
  }
}
```

### Get Pool Info
```http
GET /api/dex/pool/info?tokenA=0x...&tokenB=0x...&fee=3000
```

**Response (Initialized Pool):**
```json
{
  "success": true,
  "data": {
    "poolId": "0x...",
    "poolKey": {
      "currency0": "0x...",
      "currency1": "0x...",
      "fee": 3000,
      "tickSpacing": 60,
      "hooks": "0x0000000000000000000000000000000000000000"
    },
    "sqrtPriceX96": "79228162514264337593543950336",
    "tick": 0,
    "protocolFee": 0,
    "lpFee": 3000,
    "liquidity": "1000000000000000000",
    "price": "1.000000",
    "isInitialized": true
  }
}
```

**Response (Uninitialized Pool):**
```json
{
  "success": true,
  "data": {
    "poolId": "0x...",
    "poolKey": {
      "currency0": "0x...",
      "currency1": "0x...",
      "fee": 3000,
      "tickSpacing": 60,
      "hooks": "0x0000000000000000000000000000000000000000"
    },
    "isInitialized": false,
    "message": "Pool not initialized"
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  },
  "meta": {
    "timestamp": "2025-12-24T00:00:00.000Z",
    "requestId": "request-id"
  }
}
```

### Common Error Codes

- `INVALID_INPUT` - Missing or invalid request parameters
- `INVALID_ADDRESS` - Invalid Ethereum address format
- `NOT_FOUND` - Resource not found
- `INTERNAL_ERROR` - Server error

---

## Rate Limiting

- **Limit:** 100 requests per 15 minutes per IP
- **Response:** 429 Too Many Requests

---

## Fee Tiers

| Fee (bps) | Percentage | Tick Spacing |
|-----------|-----------|--------------|
| 500       | 0.05%     | 10           |
| 3000      | 0.3%      | 60           |
| 10000     | 1%        | 200          |

---

## Tick Ranges

- **Full Range:** tickLower = `-887220`, tickUpper = `887220`
- **Custom Range:** Specify your own tick bounds (must be multiples of tickSpacing)

---

## Production Considerations

### Security
- Implement proper authentication (JWT, API keys)
- Add user wallet management
- Validate all inputs
- Rate limit per user, not just IP
- Add request signing for sensitive operations

### Scalability
- Add database for indexing events
- Cache pool states
- Queue transactions
- Add websocket support for real-time updates

### Monitoring
- Add metrics (Prometheus/Grafana)
- Log all transactions
- Alert on failures
- Track gas prices

### Multi-chain Support
- Add chainId parameter
- Support multiple networks
- Manage different contract addresses per chain
