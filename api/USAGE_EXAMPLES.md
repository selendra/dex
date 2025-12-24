# API Usage Examples

## Prerequisites

1. **Contracts must be deployed**. Run verification:
```bash
npm run verify
```

2. **Install dependencies**:
```bash
npm install
```

3. **Ensure Hardhat node is running** (in project root):
```bash
npm run node
```

## Starting the API Server

```bash
npm start
```

The server will start on `http://localhost:3000`

## Testing the API

Run the automated test suite:
```bash
npm test
```

## Manual Testing Examples

### 1. Check API Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-12-23T10:30:00.000Z",
    "contracts": {
      "poolManager": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      "positionManager": "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
      "swapRouter": "0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB",
      "stateView": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
    }
  }
}
```

### 2. Get Swap Quote

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

### 3. Check Price

```bash
curl -X POST http://localhost:3000/api/price/quote \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "tokenOut": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "amountIn": "1000000000000000000",
    "fee": 3000
  }'
```

### 4. Add Liquidity Quote

```bash
curl -X POST http://localhost:3000/api/liquidity/add/quote \
  -H "Content-Type: application/json" \
  -d '{
    "currency0": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "currency1": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "fee": 3000,
    "tickLower": -887220,
    "tickUpper": 887220,
    "amount0Desired": "1000000000000000000",
    "amount1Desired": "1000000000000000000"
  }'
```

### 5. Get Pool Details

```bash
curl "http://localhost:3000/api/pools/test-pool?currency0=0x5FbDB2315678afecb367f032d93F642f64180aa3&currency1=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512&fee=3000"
```

## Using Postman

Import these as a Postman collection:

### Environment Variables
- `BASE_URL`: `http://localhost:3000`
- `TOKEN_A`: Your token A address
- `TOKEN_B`: Your token B address
- `RECIPIENT`: Your wallet address

### Collection Structure

1. **Health Check**
   - Method: GET
   - URL: `{{BASE_URL}}/health`

2. **Swap Quote**
   - Method: POST
   - URL: `{{BASE_URL}}/api/swap/quote`
   - Body:
   ```json
   {
     "tokenIn": "{{TOKEN_A}}",
     "tokenOut": "{{TOKEN_B}}",
     "amountIn": "1000000000000000000",
     "fee": 3000
   }
   ```

3. **Execute Swap**
   - Method: POST
   - URL: `{{BASE_URL}}/api/swap/execute`
   - Body:
   ```json
   {
     "tokenIn": "{{TOKEN_A}}",
     "tokenOut": "{{TOKEN_B}}",
     "amountIn": "1000000000000000000",
     "amountOutMinimum": "990000000000000000",
     "recipient": "{{RECIPIENT}}",
     "fee": 3000
   }
   ```

4. **Add Liquidity Quote**
   - Method: POST
   - URL: `{{BASE_URL}}/api/liquidity/add/quote`
   - Body:
   ```json
   {
     "currency0": "{{TOKEN_A}}",
     "currency1": "{{TOKEN_B}}",
     "fee": 3000,
     "tickLower": -887220,
     "tickUpper": 887220,
     "amount0Desired": "1000000000000000000",
     "amount1Desired": "1000000000000000000"
   }
   ```

## Integration with Frontend

### JavaScript/TypeScript Example

```javascript
const API_BASE_URL = 'http://localhost:3000';

// Get swap quote
async function getSwapQuote(tokenIn, tokenOut, amountIn) {
  const response = await fetch(`${API_BASE_URL}/api/swap/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tokenIn,
      tokenOut,
      amountIn: amountIn.toString(),
      fee: 3000
    })
  });
  
  const data = await response.json();
  return data;
}

// Execute swap
async function executeSwap(tokenIn, tokenOut, amountIn, minAmountOut, recipient) {
  const response = await fetch(`${API_BASE_URL}/api/swap/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tokenIn,
      tokenOut,
      amountIn: amountIn.toString(),
      amountOutMinimum: minAmountOut.toString(),
      recipient,
      fee: 3000,
      slippageTolerance: 0.5
    })
  });
  
  const data = await response.json();
  return data;
}

// Get current price
async function getPrice(tokenIn, tokenOut) {
  const response = await fetch(`${API_BASE_URL}/api/price/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tokenIn,
      tokenOut,
      amountIn: '1000000000000000000', // 1 token
      fee: 3000
    })
  });
  
  const data = await response.json();
  return data.data.price;
}

// Usage
(async () => {
  const tokenA = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  const tokenB = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
  const recipient = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  
  // Get price
  const price = await getPrice(tokenA, tokenB);
  console.log('Current price:', price);
  
  // Get quote
  const quote = await getSwapQuote(tokenA, tokenB, '1000000000000000000');
  console.log('Swap quote:', quote);
  
  // Execute swap (make sure you have approvals and balance)
  // const result = await executeSwap(
  //   tokenA, 
  //   tokenB, 
  //   '1000000000000000000',
  //   quote.data.quote.amountOut * 0.995, // 0.5% slippage
  //   recipient
  // );
  // console.log('Swap result:', result);
})();
```

### React Example

```jsx
import { useState, useEffect } from 'react';

function SwapComponent() {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);

  const getQuote = async (tokenIn, tokenOut, amountIn) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/swap/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenIn, tokenOut, amountIn, fee: 3000 })
      });
      const data = await response.json();
      setQuote(data.data);
    } catch (error) {
      console.error('Error getting quote:', error);
    }
    setLoading(false);
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {quote && (
        <div>
          <p>Amount Out: {quote.quote.amountOut}</p>
          <p>Price Impact: {quote.quote.priceImpact}%</p>
        </div>
      )}
    </div>
  );
}
```

## Error Handling

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

Common error codes:
- `INVALID_INPUT`: Missing or invalid parameters
- `INSUFFICIENT_LIQUIDITY`: Not enough liquidity in pool
- `SLIPPAGE_EXCEEDED`: Price moved beyond tolerance
- `TRANSACTION_FAILED`: Blockchain transaction failed
- `INTERNAL_ERROR`: Server error

## Performance Tips

1. **Cache quotes**: Quotes are valid for ~30 seconds
2. **Batch requests**: Use Promise.all() for multiple independent queries
3. **Rate limiting**: Respect the 100 requests/15 minutes limit
4. **WebSocket**: For real-time updates, consider implementing WebSocket connection

## Troubleshooting

### "Contract not deployed" errors
- Run `npm run verify` to check deployment status
- Ensure Hardhat node is running
- Check contract addresses in `.env`

### "Insufficient funds" errors
- Ensure signer has enough ETH
- Check token balances
- Verify token approvals

### Connection timeout
- Check if API server is running
- Verify `RPC_URL` in `.env`
- Ensure no firewall blocking port 3000

## Next Steps

1. Deploy test ERC20 tokens
2. Initialize pools with liquidity
3. Set up token approvals
4. Test complete swap flow
5. Integrate with frontend application
