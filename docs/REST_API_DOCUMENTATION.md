# DEX REST API Documentation

## Overview

This REST API provides a convenient HTTP interface to interact with the DEX smart contracts. It abstracts the complexity of blockchain interactions and provides developer-friendly endpoints for swapping, liquidity provision, and market data queries.

**Base URL**: `https://api.yourdex.com/v1`

**API Version**: 1.0.0

## Table of Contents

1. [Authentication](#authentication)
2. [Response Format](#response-format)
3. [Error Codes](#error-codes)
4. [Rate Limiting](#rate-limiting)
5. [Pools API](#pools-api)
6. [Swap API](#swap-api)
7. [Liquidity API](#liquidity-api)
8. [Positions API](#positions-api)
9. [Market Data API](#market-data-api)
10. [Transaction API](#transaction-api)
11. [WebSocket API](#websocket-api)
12. [Code Examples](#code-examples)

---

## Authentication

### API Keys

Most read endpoints are public. Write operations require authentication using API keys.

**Request Header:**
```http
Authorization: Bearer YOUR_API_KEY
```

**Get API Key:**
```http
POST /v1/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "apiKey": "dex_live_abc123...",
    "userId": "usr_123456",
    "rateLimit": {
      "requestsPerMinute": 60,
      "requestsPerDay": 10000
    }
  }
}
```

---

## Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2025-12-23T10:30:00.000Z",
    "requestId": "req_abc123"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_LIQUIDITY",
    "message": "Not enough liquidity in pool",
    "details": {
      "poolId": "0x123...",
      "requested": "1000000",
      "available": "500000"
    }
  },
  "meta": {
    "timestamp": "2025-12-23T10:30:00.000Z",
    "requestId": "req_abc123"
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_PARAMETERS` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INSUFFICIENT_LIQUIDITY` | 400 | Not enough liquidity |
| `SLIPPAGE_EXCEEDED` | 400 | Price moved beyond tolerance |
| `INSUFFICIENT_BALANCE` | 400 | Insufficient token balance |
| `POOL_NOT_INITIALIZED` | 404 | Pool doesn't exist |
| `TRANSACTION_FAILED` | 500 | Blockchain transaction failed |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

**Default Limits:**
- Public endpoints: 60 requests/minute
- Authenticated endpoints: 120 requests/minute
- WebSocket connections: 10 concurrent connections

**Headers:**
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1703334600
```

---

## Pools API

### List Pools

Get all available pools with filtering and pagination.

**Endpoint:** `GET /pools`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token0` | string | No | Filter by token0 address |
| `token1` | string | No | Filter by token1 address |
| `fee` | number | No | Filter by fee tier |
| `minLiquidity` | string | No | Minimum liquidity (USD) |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Results per page (default: 20, max: 100) |
| `sortBy` | string | No | Sort field: `liquidity`, `volume`, `apy` |
| `order` | string | No | Sort order: `asc`, `desc` |

**Example Request:**
```http
GET /v1/pools?token0=0x6B175474E89094C44Da98b954EedeAC495271d0F&sortBy=liquidity&order=desc&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pools": [
      {
        "poolId": "0x1234567890abcdef...",
        "token0": {
          "address": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
          "symbol": "DAI",
          "name": "Dai Stablecoin",
          "decimals": 18
        },
        "token1": {
          "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          "symbol": "USDC",
          "name": "USD Coin",
          "decimals": 6
        },
        "fee": 500,
        "tickSpacing": 10,
        "liquidity": "15432100.50",
        "sqrtPriceX96": "79228162514264337593543950336",
        "tick": 0,
        "token0Price": "1.0001",
        "token1Price": "0.9999",
        "volume24h": "8234567.89",
        "volumeChange24h": 5.2,
        "fees24h": "4117.28",
        "tvl": "15432100.50",
        "tvlChange24h": -2.3,
        "apy": "12.5",
        "hooks": "0x0000000000000000000000000000000000000000"
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 10,
      "totalPages": 15
    }
  }
}
```

### Get Pool Details

**Endpoint:** `GET /pools/:poolId`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `poolId` | string | Pool identifier (hash) |

**Example Request:**
```http
GET /v1/pools/0x1234567890abcdef...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "poolId": "0x1234567890abcdef...",
    "token0": {
      "address": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      "symbol": "DAI",
      "name": "Dai Stablecoin",
      "decimals": 18,
      "logoUrl": "https://cdn.yourdex.com/tokens/dai.png"
    },
    "token1": {
      "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "symbol": "USDC",
      "name": "USD Coin",
      "decimals": 6,
      "logoUrl": "https://cdn.yourdex.com/tokens/usdc.png"
    },
    "fee": 500,
    "tickSpacing": 10,
    "sqrtPriceX96": "79228162514264337593543950336",
    "tick": 0,
    "liquidity": "15432100.50",
    "token0Price": "1.0001",
    "token1Price": "0.9999",
    "volume24h": "8234567.89",
    "volume7d": "52341234.56",
    "fees24h": "4117.28",
    "fees7d": "26170.62",
    "tvl": "15432100.50",
    "apy": "12.5",
    "hooks": "0x0000000000000000000000000000000000000000",
    "priceHistory": {
      "1h": "1.0002",
      "24h": "0.9998",
      "7d": "1.0005"
    }
  }
}
```

### Initialize Pool

**Endpoint:** `POST /pools`

**Authentication:** Required

**Request Body:**
```json
{
  "token0": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  "token1": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "fee": 500,
  "tickSpacing": 10,
  "initialPrice": "1.0",
  "hooks": "0x0000000000000000000000000000000000000000"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "poolId": "0x1234567890abcdef...",
    "transactionHash": "0xabc123...",
    "status": "pending",
    "estimatedConfirmation": "2025-12-23T10:32:00.000Z"
  }
}
```

### Get Pool Chart Data

**Endpoint:** `GET /pools/:poolId/chart`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `interval` | string | No | `1m`, `5m`, `15m`, `1h`, `4h`, `1d` (default: `1h`) |
| `from` | number | No | Unix timestamp |
| `to` | number | No | Unix timestamp |

**Response:**
```json
{
  "success": true,
  "data": {
    "candles": [
      {
        "timestamp": 1703334600,
        "open": "1.0001",
        "high": "1.0005",
        "low": "0.9998",
        "close": "1.0002",
        "volume": "123456.78",
        "liquidity": "15432100.50"
      }
    ]
  }
}
```

---

## Swap API

### Get Swap Quote

Get a quote for a token swap without executing.

**Endpoint:** `POST /swap/quote`

**Request Body:**
```json
{
  "tokenIn": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  "tokenOut": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "amountIn": "1000000000000000000",
  "slippage": 0.5,
  "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokenIn": {
      "address": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      "symbol": "DAI",
      "decimals": 18
    },
    "tokenOut": {
      "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "symbol": "USDC",
      "decimals": 6
    },
    "amountIn": "1000000000000000000",
    "amountOut": "999450",
    "amountOutMin": "994455",
    "executionPrice": "0.99945",
    "priceImpact": "0.05",
    "route": [
      {
        "poolId": "0x1234567890abcdef...",
        "tokenIn": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        "tokenOut": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "fee": 500,
        "amountIn": "1000000000000000000",
        "amountOut": "999450"
      }
    ],
    "gasEstimate": {
      "gasLimit": "180000",
      "gasPrice": "25000000000",
      "gasCost": "0.0045",
      "gasCostUsd": "13.50"
    },
    "quoteId": "quote_abc123",
    "validUntil": "2025-12-23T10:35:00.000Z"
  }
}
```

### Execute Swap

Execute a token swap.

**Endpoint:** `POST /swap/execute`

**Authentication:** Required

**Request Body:**
```json
{
  "quoteId": "quote_abc123",
  "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "signature": "0xabc123...",
  "deadline": 1703334900
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0xdef456...",
    "status": "pending",
    "amountIn": "1000000000000000000",
    "amountOut": "999450",
    "estimatedConfirmation": "2025-12-23T10:32:00.000Z"
  }
}
```

### Get Best Route

Find the best route for a swap across multiple pools.

**Endpoint:** `POST /swap/route`

**Request Body:**
```json
{
  "tokenIn": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  "tokenOut": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  "amountIn": "1000000000000000000",
  "maxHops": 3
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "routes": [
      {
        "path": [
          {
            "poolId": "0x1234...",
            "tokenIn": "0x6B17...",
            "tokenOut": "0xA0b8...",
            "fee": 500,
            "amountIn": "1000000000000000000",
            "amountOut": "999450"
          },
          {
            "poolId": "0x5678...",
            "tokenIn": "0xA0b8...",
            "tokenOut": "0xC02a...",
            "fee": 3000,
            "amountIn": "999450",
            "amountOut": "650320000000000000"
          }
        ],
        "totalAmountOut": "650320000000000000",
        "executionPrice": "0.65032",
        "priceImpact": "0.15",
        "estimatedGas": "280000"
      }
    ]
  }
}
```

---

## Liquidity API

### Add Liquidity Quote

Get a quote for adding liquidity to a pool.

**Endpoint:** `POST /liquidity/add/quote`

**Request Body:**
```json
{
  "poolId": "0x1234567890abcdef...",
  "amount0Desired": "1000000000000000000",
  "amount1Desired": "1000000",
  "tickLower": -120,
  "tickUpper": 120
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "poolId": "0x1234567890abcdef...",
    "amount0": "1000000000000000000",
    "amount1": "999450",
    "amount0Min": "950000000000000000",
    "amount1Min": "949477",
    "liquidity": "999724868932862140",
    "tickLower": -120,
    "tickUpper": 120,
    "priceRange": {
      "lower": "0.9880",
      "upper": "1.0121",
      "current": "1.0001"
    },
    "estimatedFees24h": "2.50",
    "estimatedApr": "15.2",
    "quoteId": "liq_quote_abc123",
    "validUntil": "2025-12-23T10:35:00.000Z"
  }
}
```

### Add Liquidity

Add liquidity to a pool and mint position NFT.

**Endpoint:** `POST /liquidity/add`

**Authentication:** Required

**Request Body:**
```json
{
  "quoteId": "liq_quote_abc123",
  "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "signature": "0xabc123...",
  "deadline": 1703334900
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0xdef456...",
    "tokenId": "12345",
    "status": "pending",
    "estimatedConfirmation": "2025-12-23T10:32:00.000Z"
  }
}
```

### Remove Liquidity Quote

**Endpoint:** `POST /liquidity/remove/quote`

**Request Body:**
```json
{
  "tokenId": "12345",
  "liquidityPercent": 50
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokenId": "12345",
    "liquidityToRemove": "499862434466431070",
    "amount0": "500000000000000000",
    "amount1": "499725",
    "amount0Min": "475000000000000000",
    "amount1Min": "474738",
    "feesCollected": {
      "amount0": "5000000000000000",
      "amount1": "4997"
    },
    "quoteId": "liq_remove_abc123",
    "validUntil": "2025-12-23T10:35:00.000Z"
  }
}
```

### Remove Liquidity

**Endpoint:** `POST /liquidity/remove`

**Authentication:** Required

**Request Body:**
```json
{
  "quoteId": "liq_remove_abc123",
  "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "signature": "0xabc123...",
  "deadline": 1703334900
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0xdef456...",
    "status": "pending",
    "estimatedConfirmation": "2025-12-23T10:32:00.000Z"
  }
}
```

---

## Positions API

### Get User Positions

**Endpoint:** `GET /positions/:address`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | string | User wallet address |

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | `active`, `closed`, `all` (default: `active`) |
| `page` | number | Page number |
| `limit` | number | Results per page |

**Response:**
```json
{
  "success": true,
  "data": {
    "positions": [
      {
        "tokenId": "12345",
        "poolId": "0x1234567890abcdef...",
        "token0": {
          "address": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
          "symbol": "DAI"
        },
        "token1": {
          "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          "symbol": "USDC"
        },
        "tickLower": -120,
        "tickUpper": 120,
        "liquidity": "999724868932862140",
        "amount0": "1000000000000000000",
        "amount1": "999450",
        "unclaimedFees0": "5000000000000000",
        "unclaimedFees1": "4997",
        "valueUsd": "2010.50",
        "priceRange": {
          "lower": "0.9880",
          "upper": "1.0121",
          "current": "1.0001"
        },
        "inRange": true,
        "apr": "15.2",
        "createdAt": "2025-12-20T10:30:00.000Z"
      }
    ],
    "summary": {
      "totalPositions": 5,
      "totalValueUsd": "10050.25",
      "totalUnclaimedFeesUsd": "125.50"
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5
    }
  }
}
```

### Get Position Details

**Endpoint:** `GET /positions/:address/:tokenId`

**Response:**
```json
{
  "success": true,
  "data": {
    "tokenId": "12345",
    "owner": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "poolId": "0x1234567890abcdef...",
    "pool": {
      "token0": {
        "address": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        "symbol": "DAI",
        "decimals": 18
      },
      "token1": {
        "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "symbol": "USDC",
        "decimals": 6
      },
      "fee": 500
    },
    "tickLower": -120,
    "tickUpper": 120,
    "liquidity": "999724868932862140",
    "amount0": "1000000000000000000",
    "amount1": "999450",
    "unclaimedFees0": "5000000000000000",
    "unclaimedFees1": "4997",
    "unclaimedFeesUsd": "10.01",
    "valueUsd": "2010.50",
    "priceRange": {
      "lower": "0.9880",
      "upper": "1.0121",
      "current": "1.0001"
    },
    "inRange": true,
    "apr": "15.2",
    "performance": {
      "depositValueUsd": "2000.00",
      "currentValueUsd": "2010.50",
      "feesEarnedUsd": "25.50",
      "totalReturnUsd": "36.00",
      "totalReturnPercent": "1.8",
      "impermanentLoss": "-0.02"
    },
    "history": [
      {
        "type": "mint",
        "timestamp": "2025-12-20T10:30:00.000Z",
        "amount0": "1000000000000000000",
        "amount1": "999450",
        "transactionHash": "0xabc123..."
      }
    ],
    "createdAt": "2025-12-20T10:30:00.000Z",
    "updatedAt": "2025-12-23T10:30:00.000Z"
  }
}
```

### Collect Fees

**Endpoint:** `POST /positions/:tokenId/collect-fees`

**Authentication:** Required

**Request Body:**
```json
{
  "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "signature": "0xabc123..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0xdef456...",
    "amount0": "5000000000000000",
    "amount1": "4997",
    "status": "pending"
  }
}
```

---

## Market Data API

### Get Token Price

**Endpoint:** `GET /market/price/:tokenAddress`

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    "symbol": "DAI",
    "name": "Dai Stablecoin",
    "priceUsd": "1.0001",
    "priceChange24h": "0.05",
    "volume24h": "15234567.89",
    "marketCap": "5432100000.00",
    "lastUpdated": "2025-12-23T10:30:00.000Z"
  }
}
```

### Get Multiple Token Prices

**Endpoint:** `POST /market/prices`

**Request Body:**
```json
{
  "addresses": [
    "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "prices": [
      {
        "address": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        "symbol": "DAI",
        "priceUsd": "1.0001"
      },
      {
        "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "symbol": "USDC",
        "priceUsd": "0.9999"
      },
      {
        "address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        "symbol": "WETH",
        "priceUsd": "3456.78"
      }
    ]
  }
}
```

### Get Market Overview

**Endpoint:** `GET /market/overview`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalValueLocked": "1234567890.50",
    "volume24h": "123456789.00",
    "volume7d": "567890123.45",
    "volumeChange24h": 5.2,
    "fees24h": "61728.39",
    "fees7d": "283945.12",
    "totalPools": 450,
    "totalTransactions24h": 15234,
    "topPools": [
      {
        "poolId": "0x1234...",
        "token0Symbol": "DAI",
        "token1Symbol": "USDC",
        "tvl": "15432100.50",
        "volume24h": "8234567.89"
      }
    ],
    "topTokens": [
      {
        "address": "0x6B17...",
        "symbol": "DAI",
        "volume24h": "15234567.89",
        "priceChange24h": "0.05"
      }
    ]
  }
}
```

### Get Token Stats

**Endpoint:** `GET /market/tokens/:address/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    "symbol": "DAI",
    "name": "Dai Stablecoin",
    "decimals": 18,
    "priceUsd": "1.0001",
    "priceChange24h": "0.05",
    "priceChange7d": "-0.02",
    "volume24h": "15234567.89",
    "volume7d": "95678901.23",
    "txCount24h": 5234,
    "holders": 123456,
    "poolCount": 25,
    "totalLiquidity": "45678901.23"
  }
}
```

---

## Transaction API

### Get Transaction Status

**Endpoint:** `GET /transactions/:txHash`

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0xdef456...",
    "status": "confirmed",
    "type": "swap",
    "from": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "blockNumber": 18765432,
    "timestamp": "2025-12-23T10:30:00.000Z",
    "gasUsed": "175234",
    "gasPrice": "25000000000",
    "gasCost": "0.00438085",
    "details": {
      "tokenIn": {
        "address": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        "symbol": "DAI",
        "amount": "1000000000000000000"
      },
      "tokenOut": {
        "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "symbol": "USDC",
        "amount": "999450"
      }
    }
  }
}
```

### Get User Transactions

**Endpoint:** `GET /transactions/user/:address`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | `swap`, `add_liquidity`, `remove_liquidity`, `all` |
| `page` | number | Page number |
| `limit` | number | Results per page |

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "transactionHash": "0xdef456...",
        "status": "confirmed",
        "type": "swap",
        "timestamp": "2025-12-23T10:30:00.000Z",
        "tokenIn": {
          "symbol": "DAI",
          "amount": "1000.00"
        },
        "tokenOut": {
          "symbol": "USDC",
          "amount": "999.45"
        },
        "valueUsd": "1000.00"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 125
    }
  }
}
```

### Cancel Pending Transaction

**Endpoint:** `POST /transactions/:txHash/cancel`

**Authentication:** Required

**Request Body:**
```json
{
  "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "gasPrice": "30000000000"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cancellationTxHash": "0xghi789...",
    "status": "pending"
  }
}
```

---

## WebSocket API

### Connection

**Endpoint:** `wss://ws.yourdex.com/v1`

**Connection Example:**
```javascript
const ws = new WebSocket('wss://ws.yourdex.com/v1');

ws.onopen = () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    apiKey: 'YOUR_API_KEY'
  }));
};
```

### Subscribe to Pool Updates

**Subscribe Message:**
```json
{
  "type": "subscribe",
  "channel": "pool",
  "poolId": "0x1234567890abcdef..."
}
```

**Update Message:**
```json
{
  "type": "pool_update",
  "channel": "pool",
  "data": {
    "poolId": "0x1234567890abcdef...",
    "sqrtPriceX96": "79228162514264337593543950336",
    "tick": 0,
    "liquidity": "15432100.50",
    "token0Price": "1.0001",
    "token1Price": "0.9999",
    "timestamp": "2025-12-23T10:30:00.000Z"
  }
}
```

### Subscribe to Swap Events

**Subscribe Message:**
```json
{
  "type": "subscribe",
  "channel": "swaps",
  "poolId": "0x1234567890abcdef..."
}
```

**Swap Event:**
```json
{
  "type": "swap_event",
  "channel": "swaps",
  "data": {
    "poolId": "0x1234567890abcdef...",
    "transactionHash": "0xabc123...",
    "sender": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "amount0": "-1000000000000000000",
    "amount1": "999450",
    "sqrtPriceX96": "79228162514264337593543950336",
    "tick": 0,
    "timestamp": "2025-12-23T10:30:00.000Z"
  }
}
```

### Subscribe to User Positions

**Subscribe Message:**
```json
{
  "type": "subscribe",
  "channel": "positions",
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Position Update:**
```json
{
  "type": "position_update",
  "channel": "positions",
  "data": {
    "tokenId": "12345",
    "type": "fees_earned",
    "unclaimedFees0": "5500000000000000",
    "unclaimedFees1": "5497",
    "timestamp": "2025-12-23T10:30:00.000Z"
  }
}
```

### Available Channels

| Channel | Description | Requires Auth |
|---------|-------------|---------------|
| `pool` | Pool state updates | No |
| `swaps` | Real-time swap events | No |
| `liquidity` | Liquidity changes | No |
| `positions` | User position updates | Yes |
| `transactions` | User transaction updates | Yes |
| `prices` | Token price updates | No |

---

## Code Examples

### JavaScript/TypeScript (Node.js)

#### Fetch Pool Data

```javascript
const axios = require('axios');

const BASE_URL = 'https://api.yourdex.com/v1';

async function getPoolData(poolId) {
  try {
    const response = await axios.get(`${BASE_URL}/pools/${poolId}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching pool:', error.response?.data);
    throw error;
  }
}

// Usage
getPoolData('0x1234567890abcdef...')
  .then(pool => console.log('Pool:', pool));
```

#### Execute Swap

```javascript
const axios = require('axios');
const ethers = require('ethers');

const BASE_URL = 'https://api.yourdex.com/v1';
const API_KEY = 'your_api_key';

async function executeSwap(tokenIn, tokenOut, amountIn, slippage) {
  try {
    // 1. Get quote
    const quoteResponse = await axios.post(`${BASE_URL}/swap/quote`, {
      tokenIn,
      tokenOut,
      amountIn,
      slippage
    });
    
    const quote = quoteResponse.data.data;
    console.log('Quote:', quote);
    
    // 2. Sign transaction
    const provider = new ethers.providers.JsonRpcProvider('YOUR_RPC_URL');
    const wallet = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);
    
    const message = ethers.utils.solidityKeccak256(
      ['string', 'address', 'string', 'uint256'],
      ['SWAP', wallet.address, quote.quoteId, quote.validUntil]
    );
    const signature = await wallet.signMessage(ethers.utils.arrayify(message));
    
    // 3. Execute swap
    const swapResponse = await axios.post(
      `${BASE_URL}/swap/execute`,
      {
        quoteId: quote.quoteId,
        userAddress: wallet.address,
        signature,
        deadline: Math.floor(Date.now() / 1000) + 300
      },
      {
        headers: { Authorization: `Bearer ${API_KEY}` }
      }
    );
    
    return swapResponse.data.data;
  } catch (error) {
    console.error('Error executing swap:', error.response?.data);
    throw error;
  }
}

// Usage
executeSwap(
  '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
  '1000000000000000000', // 1 DAI
  0.5 // 0.5% slippage
).then(result => console.log('Swap executed:', result));
```
### cURL Examples

#### Get Pool Data

```bash
curl -X GET "https://api.yourdex.com/v1/pools/0x1234567890abcdef..." \
  -H "Content-Type: application/json"
```

#### Get Swap Quote

```bash
curl -X POST "https://api.yourdex.com/v1/swap/quote" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    "tokenOut": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "amountIn": "1000000000000000000",
    "slippage": 0.5
  }'
```

#### Execute Swap

```bash
curl -X POST "https://api.yourdex.com/v1/swap/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "quoteId": "quote_abc123",
    "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "signature": "0xabc123...",
    "deadline": 1703334900
  }'
```
