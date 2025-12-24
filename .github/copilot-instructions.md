# DEX Project - AI Agent Instructions

## Project Overview
This is a Uniswap V4-based DEX with smart contracts (Solidity) and a REST API (Node.js/Express) for liquidity management and token swaps. The project runs on Hardhat local network (chainId 1337).

## Architecture

### Two-Layer Design
1. **Smart Contracts** (`/contracts`): Uniswap V4 core (PoolManager, PositionManager, SwapRouter)
2. **REST API** (`/api`): Express server that interacts with deployed contracts via ethers.js

### Critical Concepts

**PoolKey Structure**: Every pool operation requires a PoolKey tuple with 5 fields:
```javascript
{
  currency0: "0x...",  // Lower address (auto-sorted)
  currency1: "0x...",  // Higher address  
  fee: 3000,           // 500, 3000, or 10000 (basis points)
  tickSpacing: 60,     // Must match fee tier
  hooks: ethers.ZeroAddress  // No hooks enabled
}
```

**PoolId Calculation**: PoolId = keccak256(abi.encode(PoolKey)). See `api/services/contractService.js:65-70` for implementation.

**Tick Ranges**: Full-range liquidity uses ticks `-887220` to `887220`. Price calculations use `sqrtPriceX96` format.

## Development Workflows

### Start Full Stack (Local Development)
```bash
# Terminal 1: Start Hardhat node
npm run node

# Terminal 2: Deploy contracts
npm run deploy:local

# Terminal 3: Start API server
cd api && npm start
```

### Contract Development
```bash
npm run compile       # Compile with viaIR optimization
npm test             # Run contract tests
npm run clean        # Clean artifacts
```

**Solidity Version**: Multi-compiler setup (0.8.17, 0.8.20, 0.8.24, 0.8.26) with `viaIR: true` and `runs: 1` for minimal deployment size. See [hardhat.config.js](hardhat.config.js#L5-L45).

### API Testing
```bash
cd api
npm test             # Run automated API tests
npm run verify       # Verify contract deployment
curl http://localhost:3000/health  # Quick health check
```

## Key Files & Patterns

### Contract Service (`api/services/contractService.js`)
- **ABIs**: Simplified inline ABIs (lines 4-35) - only essential methods included
- **Provider Setup**: Single signer wallet from `PRIVATE_KEY` env var
- **Token Sorting**: Always sort `currency0 < currency1` before creating PoolKey
- **Error Handling**: Wrap contract calls with try-catch and descriptive messages

### Pool Initialization (`scripts/initialize-pool.js`)
Use `sqrtPriceX96 = "79228162514264337593543950336"` for 1:1 initial price ratio.

### Routes Structure (`api/routes/`)
All endpoints follow standardized response format:
```javascript
{
  success: true,
  data: { /* endpoint-specific data */ },
  meta: { timestamp: new Date().toISOString() }
}
```

## Environment Configuration

**Contract Addresses** (from `api/.env`):
- PoolManager: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- PositionManager: `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707`  
- SwapRouter: `0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB`
- StateView: `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9`

**Default Test Account**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (first Hardhat account)

## Common Patterns

### Adding New API Endpoint
1. Create route handler in `api/routes/`
2. Use ContractService methods for blockchain interaction
3. Validate input parameters (addresses, amounts, deadlines)
4. Return standardized JSON response
5. Add error handling with descriptive messages

### Working with Liquidity
- **Quote first**: Use `/api/liquidity/add/quote` to calculate amounts before executing
- **Deadline**: Unix timestamp, typically `Math.floor(Date.now()/1000) + 300` (5 min)
- **Slippage**: Add 10% buffer (`amount * 1.1`) to max amounts

### Token Approvals
ERC20 tokens must be approved before operations:
```javascript
await token.approve(positionManagerAddress, amount);
```

## Project-Specific Conventions

- **No TypeScript**: Pure JavaScript for simplicity
- **Minimal ABIs**: Only include methods actually used in API
- **Single Network**: Development focused on local Hardhat network
- **No Frontend**: API-only architecture, designed for integration
- **Comprehensive Docs**: All major operations documented in `/docs` and `/api/USAGE_EXAMPLES.md`

## Documentation References

- API endpoints: [api/README.md](api/README.md)
- Quick reference: [API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md)
- Deployment info: [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md)
- Usage examples: [api/USAGE_EXAMPLES.md](api/USAGE_EXAMPLES.md)
