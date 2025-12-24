# Production REST API - Placeholder Services

These service files need to be implemented based on your existing `api/services/contractService.js`.

Copy and adapt the logic from `../api/services/contractService.js` to these files with production enhancements:

## Service Files to Create:

1. **swap.service.js** - Swap operations
2. **liquidity.service.js** - Liquidity management
3. **pool.service.js** - Pool queries
4. **token.service.js** - Token information
5. **price.service.js** - Price calculations
6. **blockchain.service.js** - Core blockchain interactions
7. **cache.service.js** - Redis caching layer

## Quick Implementation:

```bash
# Copy existing contract service as a base
cp ../api/services/contractService.js src/services/blockchain.service.js

# Then split into specialized services
```

Each service should:
- Use the config from `src/config/index.js`
- Use the logger from `src/config/logger.js`
- Throw custom errors from `src/middleware/errorHandler.js`
- Implement caching where appropriate
- Handle gas estimation properly
- Add retry logic for failed transactions
