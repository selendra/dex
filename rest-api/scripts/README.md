# REST API Test Scripts

Comprehensive test suite for all API routes.

## 📋 Available Test Scripts

| Script | Description | Routes Tested |
|--------|-------------|---------------|
| `test-all.js` | Master test runner (all tests) | All routes |
| `test-health.js` | Health check endpoints | /health, /health/detailed, /health/ready |
| `test-swap.js` | Swap operations | /api/v1/swap/* |
| `test-pool.js` | Pool queries | /api/v1/pools/* |
| `test-token.js` | Token information | /api/v1/tokens/* |
| `test-price.js` | Price queries | /api/v1/price/* |
| `test-liquidity.js` | Liquidity operations | /api/v1/liquidity/* |

## 🚀 Quick Start

### 1. Start the API Server

```bash
# In rest-api directory
npm start
```

### 2. Run All Tests

```bash
# Run the complete test suite
npm test

# Or directly
node scripts/test-all.js
```

### 3. Run Individual Tests

```bash
# Test specific routes
node scripts/test-health.js
node scripts/test-swap.js
node scripts/test-pool.js
node scripts/test-token.js
node scripts/test-price.js
node scripts/test-liquidity.js
```

## 🔧 Configuration

### Environment Variables

Set these before running tests:

```bash
# API server URL (default: http://localhost:4000)
export API_URL=http://localhost:4000

# Token addresses from deployment
export TOKEN_A=0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6
export TOKEN_B=0x8A791620dd6260079BF849Dc5567aDC3F2FdC318

# Test wallet address
export TEST_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

### Using Custom Configuration

```bash
# Test against different server
API_URL=http://production-api.example.com npm test

# Use different tokens
TOKEN_A=0x... TOKEN_B=0x... node scripts/test-swap.js
```

## 📊 Test Coverage

### Health Routes (test-health.js)
- ✅ Basic health check
- ✅ Detailed health status
- ✅ Readiness probe

### Swap Routes (test-swap.js)
- ✅ Get swap quote
- ✅ Input validation
- ✅ Different fee tiers
- ✅ Route finding
- ✅ Execute swap (auth check)

### Pool Routes (test-pool.js)
- ✅ List all pools
- ✅ Pagination
- ✅ Search specific pool
- ✅ Get pool by ID
- ✅ Input validation
- ✅ Cache performance

### Token Routes (test-token.js)
- ✅ Get token info (name, symbol, decimals)
- ✅ Get token balance
- ✅ Get token price
- ✅ Input validation
- ✅ Cache performance

### Price Routes (test-price.js)
- ✅ Get price quote
- ✅ Get pool price
- ✅ Multiple amounts
- ✅ Different fee tiers
- ✅ Reverse direction
- ✅ Rate limiting
- ✅ Cache performance

### Liquidity Routes (test-liquidity.js)
- ✅ Add liquidity quote
- ✅ Different amounts
- ✅ Add liquidity (auth check)
- ✅ Remove liquidity quote (auth check)
- ✅ Remove liquidity (auth check)
- ✅ Input validation
- ✅ Rate limiting

## 🎯 What Tests Verify

### Functionality Tests
- ✅ All endpoints return correct status codes
- ✅ Response format matches API spec
- ✅ Data calculations are accurate
- ✅ Error handling works correctly

### Security Tests
- ✅ Authentication required for protected routes
- ✅ Input validation catches invalid data
- ✅ Rate limiting prevents abuse
- ✅ Error messages don't leak sensitive info

### Performance Tests
- ✅ Cache improves response times
- ✅ Responses complete in reasonable time
- ✅ No memory leaks during tests

## 📈 Example Output

```
╔════════════════════════════════════════════════╗
║       DEX REST API - Test Suite Runner        ║
╚════════════════════════════════════════════════╝

Testing API at: http://localhost:4000
Started at: 2025-12-24T10:00:00.000Z

Running: Health Routes
============================================================

🏥 Testing Health Routes...

1. Testing GET /health
   ✅ Status: healthy
   ✅ Timestamp: 2025-12-24T10:00:00.123Z
   ✅ Uptime: 42.5 seconds

✅ All health route tests passed!

✅ Health Routes - PASSED (156ms)

============================================================

╔════════════════════════════════════════════════╗
║              TEST SUITE SUMMARY                ║
╚════════════════════════════════════════════════╝

✅ Health Routes                  156ms
✅ Swap Routes                    234ms
✅ Pool Routes                    189ms
✅ Token Routes                   167ms
✅ Price Routes                   298ms
✅ Liquidity Routes               145ms

============================================================
Total Tests:     6
Passed:          6
Failed:          0
Total Duration:  1189ms
============================================================

🎉 All tests passed! API is working correctly.
```

## 🐛 Troubleshooting

### Tests Fail to Connect
```bash
# Check if server is running
curl http://localhost:4000/health

# Start the server
cd rest-api && npm start
```

### Wrong Token Addresses
```bash
# Check deployed addresses
cat api/test-config.json

# Update environment variables
export TOKEN_A=0x...
export TOKEN_B=0x...
```

### Rate Limiting Errors
```bash
# Wait a bit between test runs
sleep 60

# Or restart the server to reset rate limits
```

### Authentication Errors
Tests expecting 401 errors are working correctly - those endpoints require authentication.

## 🔍 Adding New Tests

### 1. Create Test File

```javascript
// scripts/test-mynewroute.js
const axios = require('axios');

async function testMyNewRoute() {
  console.log('🧪 Testing My New Route...\n');
  
  try {
    const response = await axios.get('http://localhost:4000/api/v1/mynewroute');
    console.log('✅ Response:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    return false;
  }
}

module.exports = { testMyNewRoute };
```

### 2. Add to test-all.js

```javascript
const { testMyNewRoute } = require('./test-mynewroute');

const tests = [
  // ... existing tests
  { name: 'My New Route', fn: testMyNewRoute },
];
```

### 3. Run Tests

```bash
node scripts/test-mynewroute.js
npm test
```

## 📚 Resources

- [API Documentation](../README.md)
- [Quick Start Guide](../QUICK_START.md)
- [Deployment Guide](../DEPLOYMENT.md)

## 🎓 Best Practices

1. **Always test against local server first** before production
2. **Check test output carefully** for unexpected behaviors
3. **Update tests** when API changes
4. **Add tests** for new features
5. **Run full suite** before deploying

## 📝 NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "node scripts/test-all.js",
    "test:health": "node scripts/test-health.js",
    "test:swap": "node scripts/test-swap.js",
    "test:pool": "node scripts/test-pool.js",
    "test:token": "node scripts/test-token.js",
    "test:price": "node scripts/test-price.js",
    "test:liquidity": "node scripts/test-liquidity.js"
  }
}
```

Then run:

```bash
npm test              # All tests
npm run test:swap     # Just swap tests
npm run test:pool     # Just pool tests
# etc...
```
