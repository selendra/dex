# DEX REST API Plan

## 1. Pool Management Routes

### `POST /pools/initialize`
Initialize a new trading pool
- **Request**: `{ token0, token1, fee, sqrtPriceX96 }`
- **Response**: `{ poolId, poolKey, slot0 }`
- **Function**: Create pool in PoolManager, set initial price

### `GET /pools/:poolId`
Get pool information
- **Request**: `poolId` (path param)
- **Response**: `{ poolId, token0, token1, fee, sqrtPriceX96, tick, liquidity }`
- **Function**: Query pool state from StateView

### `GET /pools/list`
List all pools
- **Request**: Query params: `token0?`, `token1?`, `fee?`
- **Response**: `{ pools: [{ poolId, token0, token1, fee, liquidity }] }`
- **Function**: Filter and return all pools (need to track initialized pools)

### `GET /pools/:poolId/price`
Get current pool price
- **Request**: `poolId` (path param)
- **Response**: `{ price, sqrtPriceX96, tick, token0, token1 }`
- **Function**: Convert sqrtPriceX96 to human-readable price

## 2. Liquidity Management Routes

### `POST /liquidity/add`
Add liquidity to a pool
- **Request**: `{ poolKey, tickLower, tickUpper, liquidityDelta, token0Address, token1Address }`
- **Response**: `{ txHash, liquidityAdded, amount0, amount1 }`
- **Function**: Call addLiquidity on router, return amounts deposited

### `POST /liquidity/add/quote`
Quote amounts needed for adding liquidity
- **Request**: `{ poolKey, tickLower, tickUpper, liquidityDelta }`
- **Response**: `{ amount0Required, amount1Required, liquidityDelta }`
- **Function**: Calculate token amounts before execution (no transaction)

### `POST /liquidity/remove`
Remove liquidity from a pool
- **Request**: `{ poolKey, tickLower, tickUpper, liquidityDelta }`
- **Response**: `{ txHash, liquidityRemoved, amount0, amount1 }`
- **Function**: Call removeLiquidity, return tokens withdrawn

### `GET /liquidity/positions/:address`
Get user's liquidity positions
- **Request**: `address` (path param), query: `poolId?`
- **Response**: `{ positions: [{ poolId, tickLower, tickUpper, liquidity, token0, token1 }] }`
- **Function**: Query user positions (need position tracking)

## 3. Swap/Trading Routes

### `POST /swap/execute`
Execute a token swap
- **Request**: `{ poolKey, zeroForOne, amountSpecified, sqrtPriceLimitX96, recipient? }`
- **Response**: `{ txHash, amountIn, amountOut, priceAfter }`
- **Function**: Execute swap via SwapRouter

### `POST /swap/quote`
Get swap quote (no execution)
- **Request**: `{ poolKey, zeroForOne, amountSpecified }`
- **Response**: `{ amountIn, amountOut, priceImpact, executionPrice }`
- **Function**: Simulate swap to calculate output (use QuoterV2 if available)

### `POST /swap/quote-path`
Get quote for multi-hop swap
- **Request**: `{ path: [token0, token1, token2], amountIn }`
- **Response**: `{ amountOut, route, priceImpact }`
- **Function**: Calculate best route across multiple pools

## 4. Token Management Routes

### `POST /tokens/deploy`
Deploy a new test token
- **Request**: `{ name, symbol, initialSupply }`
- **Response**: `{ address, name, symbol, decimals, totalSupply }`
- **Function**: Deploy ERC20 token contract

### `GET /tokens/:address`
Get token information
- **Request**: `address` (path param)
- **Response**: `{ address, name, symbol, decimals, totalSupply }`
- **Function**: Query token contract

### `POST /tokens/approve`
Approve token spending
- **Request**: `{ tokenAddress, spenderAddress, amount }`
- **Response**: `{ txHash, approved }`
- **Function**: Call token.approve() for router/manager

### `GET /tokens/:address/balance/:owner`
Get token balance
- **Request**: `address` (token), `owner` (holder address)
- **Response**: `{ balance, formatted }`
- **Function**: Query token.balanceOf()

### `GET /tokens/list`
List all deployed tokens
- **Request**: None
- **Response**: `{ tokens: [{ address, name, symbol, decimals }] }`
- **Function**: Return tracked tokens (need token registry)

## 5. Price & Market Data Routes

### `GET /price/:token0/:token1`
Get current exchange rate
- **Request**: `token0`, `token1` (addresses)
- **Response**: `{ price, pools: [{ poolId, fee, liquidity }] }`
- **Function**: Find pools with these tokens, return best price

### `GET /price/:token0/:token1/history`
Get historical prices
- **Request**: Query params: `from`, `to`, `interval?`
- **Response**: `{ prices: [{ timestamp, price, volume }] }`
- **Function**: Return price history (requires event indexing)

### `GET /pools/:poolId/volume`
Get pool trading volume
- **Request**: `poolId`, query: `period` (24h, 7d, 30d)
- **Response**: `{ volume0, volume1, volumeUSD, txCount }`
- **Function**: Aggregate swap events (requires event tracking)

## 6. Transaction & Status Routes

### `GET /transactions/:txHash`
Get transaction details
- **Request**: `txHash` (path param)
- **Response**: `{ hash, status, blockNumber, from, to, gasUsed, events }`
- **Function**: Query transaction receipt and decode logs

### `GET /transactions/user/:address`
Get user transaction history
- **Request**: `address`, query: `type?` (swap, addLiquidity, removeLiquidity), `limit?`
- **Response**: `{ transactions: [{ hash, type, timestamp, tokens, amounts }] }`
- **Function**: Filter and return user's DEX transactions

### `GET /health`
API health check
- **Request**: None
- **Response**: `{ status: "ok", network, blockNumber, contracts: { poolManager, swapRouter } }`
- **Function**: Verify API and blockchain connectivity

## 7. Analytics Routes

### `GET /analytics/tvl`
Get Total Value Locked
- **Request**: Query: `poolId?`
- **Response**: `{ tvl, pools: [{ poolId, tvl, token0Amount, token1Amount }] }`
- **Function**: Calculate total liquidity across all/specific pools

### `GET /analytics/volume`
Get trading volume
- **Request**: Query: `period` (24h, 7d, 30d)
- **Response**: `{ totalVolume, poolVolumes: [{ poolId, volume }] }`
- **Function**: Aggregate swap volumes

### `GET /analytics/fees`
Get protocol fees collected
- **Request**: Query: `poolId?`, `period?`
- **Response**: `{ totalFees, pools: [{ poolId, fees0, fees1 }] }`
- **Function**: Calculate fees from swaps

## 8. Utility Routes

### `POST /utils/encode-poolkey`
Encode pool parameters to PoolKey
- **Request**: `{ token0, token1, fee, tickSpacing, hooks }`
- **Response**: `{ poolKey: [currency0, currency1, fee, tickSpacing, hooks], poolId }`
- **Function**: Sort tokens and create PoolKey tuple

### `POST /utils/calculate-poolid`
Calculate poolId from PoolKey
- **Request**: `{ poolKey }`
- **Response**: `{ poolId }`
- **Function**: keccak256(abi.encode(poolKey))

### `POST /utils/price-to-sqrt`
Convert price to sqrtPriceX96
- **Request**: `{ price }` or `{ token0Amount, token1Amount }`
- **Response**: `{ sqrtPriceX96 }`
- **Function**: Calculate sqrt(price) * 2^96

### `POST /utils/sqrt-to-price`
Convert sqrtPriceX96 to price
- **Request**: `{ sqrtPriceX96 }`
- **Response**: `{ price, humanReadable }`
- **Function**: (sqrtPriceX96 / 2^96)^2

### `POST /utils/calculate-ticks`
Calculate tick range for price range
- **Request**: `{ priceLower, priceUpper, tickSpacing }`
- **Response**: `{ tickLower, tickUpper }`
- **Function**: Convert prices to valid ticks

## Implementation Priority

### Phase 1 - Core Functionality
1. Health check
2. Token management (deploy, info, approve, balance)
3. Pool initialization
4. Pool info/price queries
5. Utility routes (encode poolkey, calculate poolid, price conversions)

### Phase 2 - Trading Features
1. Swap execution
2. Swap quotes
3. Liquidity add/remove
4. Liquidity quotes
5. User positions

### Phase 3 - Advanced Features
1. Multi-hop swaps
2. Transaction history
3. Pool listing with filters
4. Price history (requires event indexing)
5. Volume tracking

### Phase 4 - Analytics
1. TVL calculation
2. Volume aggregation
3. Fee tracking
4. Market data endpoints

## Technical Requirements

### Contract Service Layer
```javascript
// contractService.js functions needed:
- initializePool(poolKey, sqrtPriceX96)
- getPoolInfo(poolId)
- addLiquidity(poolKey, tickLower, tickUpper, liquidityDelta)
- removeLiquidity(poolKey, tickLower, tickUpper, liquidityDelta)
- executeSwap(poolKey, swapParams)
- quoteSwap(poolKey, swapParams)
- deployToken(name, symbol, supply)
- getTokenInfo(address)
- approveToken(token, spender, amount)
- getBalance(token, owner)
- calculatePoolId(poolKey)
- encodeSqrtPriceX96(price)
- decodeSqrtPriceX96(sqrtPrice)
```

### Database/Storage (Optional)
- Track deployed tokens
- Track initialized pools
- Index events for history/analytics
- Cache frequently accessed data

### Middleware
- Request validation
- Error handling
- Rate limiting
- CORS configuration
- Request logging

### Response Format
All responses follow:
```json
{
  "success": true/false,
  "data": { ... },
  "error": "message" (if failed),
  "meta": {
    "timestamp": "ISO8601",
    "requestId": "uuid"
  }
}
```
