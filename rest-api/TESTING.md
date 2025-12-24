# REST API Test Scripts - Complete Test Suite ✅

Created **8 comprehensive test files** to verify all API functionality!

## 📁 Created Files

```
rest-api/scripts/
├── test-all.js          # Master test runner (runs all tests)
├── test-health.js       # Health check endpoints
├── test-swap.js         # Swap operations & quotes
├── test-pool.js         # Pool queries & searches
├── test-token.js        # Token info & balances
├── test-price.js        # Price queries & calculations
├── test-liquidity.js    # Liquidity operations
├── setup-and-test.sh    # Bash setup script
└── README.md            # Test documentation
```

## 🚀 How to Run Tests

### Option 1: Quick Test (All Routes)

```bash
cd rest-api

# Make sure server is running first
npm start

# In another terminal, run all tests
npm test
```

### Option 2: Individual Route Tests

```bash
# Test specific routes
npm run test:health      # Health check endpoints
npm run test:swap        # Swap routes
npm run test:pool        # Pool routes
npm run test:token       # Token routes
npm run test:price       # Price routes
npm run test:liquidity   # Liquidity routes
```

### Option 3: Using Setup Script (Bash)

```bash
# Automatically starts server and runs tests
chmod +x scripts/setup-and-test.sh
./scripts/setup-and-test.sh
```

## 📊 What Each Test Covers

### test-health.js ✅
- Basic health check (`GET /health`)
- Detailed health status (`GET /health/detailed`)
- Readiness probe (`GET /health/ready`)

### test-swap.js ✅
- Get swap quotes with different amounts
- Test multiple fee tiers (500, 3000, 10000)
- Input validation (invalid addresses)
- Authentication checks (401 errors)
- Route finding

### test-pool.js ✅
- List all pools with pagination
- Search for specific pool by token pair
- Get pool by ID
- Input validation
- Cache performance testing

### test-token.js ✅
- Get token information (name, symbol, decimals)
- Get token balances for addresses
- Get token prices
- Input validation
- Cache performance testing

### test-price.js ✅
- Get price quotes for swaps
- Get pool price information
- Test multiple amounts
- Test different fee tiers
- Reverse direction quotes
- Rate limiting verification
- Cache performance

### test-liquidity.js ✅
- Add liquidity quotes
- Remove liquidity quotes
- Authentication checks
- Input validation
- Rate limiting for liquidity operations

## 🎯 Example Output

```bash
$ npm test

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

2. Testing GET /health/detailed
   ✅ Status: healthy
   ✅ Services: {...}
   ✅ Memory: {...}
   ✅ Network: chainId 1337

3. Testing GET /health/ready
   ✅ Ready: true
   ✅ Message: API is ready

✅ All health route tests passed!

✅ Health Routes - PASSED (156ms)

...

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

## ⚙️ Configuration

### Environment Variables

Create `.env` file or export these:

```bash
# API Configuration
export API_URL=http://localhost:4000

# Token addresses (from your deployment)
export TOKEN_A=0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6
export TOKEN_B=0x8A791620dd6260079BF849Dc5567aDC3F2FdC318

# Test wallet
export TEST_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

### Test Against Different Server

```bash
API_URL=http://production-api.example.com npm test
```

## 🔍 Test Details

### What Gets Tested

**✅ Functionality**
- All endpoints return correct status codes
- Response formats match API specification
- Data calculations are accurate
- Error messages are descriptive

**✅ Security**
- Authentication required for protected routes (401)
- Input validation catches invalid data (400)
- Rate limiting prevents abuse (429)
- CORS headers present

**✅ Performance**
- Cache improves response times
- Requests complete in reasonable time
- No timeout errors

### Expected Behaviors

Some tests **expect** errors - this is correct:
- 🔐 **401 Unauthorized**: Swap/liquidity execution without auth
- ❌ **400 Validation Error**: Invalid addresses or parameters
- 🚫 **429 Rate Limited**: Too many requests (rate limiting works)

## 📝 NPM Scripts Added

```json
{
  "scripts": {
    "test": "node scripts/test-all.js",
    "test:all": "node scripts/test-all.js",
    "test:health": "node scripts/test-health.js",
    "test:swap": "node scripts/test-swap.js",
    "test:pool": "node scripts/test-pool.js",
    "test:token": "node scripts/test-token.js",
    "test:price": "node scripts/test-price.js",
    "test:liquidity": "node scripts/test-liquidity.js"
  }
}
```

## 🐛 Troubleshooting

### "Cannot connect to API server"
```bash
# Start the server first
cd rest-api
npm start
```

### Tests fail with "Network Error"
```bash
# Check server is running
curl http://localhost:4000/health

# Check port is correct
grep PORT .env
```

### Wrong token addresses
```bash
# Get addresses from deployment
cat ../api/test-config.json

# Update environment
export TOKEN_A=0x...
export TOKEN_B=0x...
```

### Rate limiting errors
```bash
# Wait between test runs
sleep 60

# Or restart server to reset limits
```

## ✨ Next Steps

1. **Start the server**:
   ```bash
   npm start
   ```

2. **Run the tests**:
   ```bash
   npm test
   ```

3. **Review results** and fix any failures

4. **Add more tests** as you add features

5. **Run before deployment** to verify everything works

## 📚 More Information

- Full test documentation: [scripts/README.md](scripts/README.md)
- API documentation: [README.md](README.md)
- Quick start guide: [QUICK_START.md](QUICK_START.md)

---

**Ready to test!** Just run `npm test` 🚀
