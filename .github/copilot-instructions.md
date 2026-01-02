# DEX Project - AI Agent Instructions

## Project Overview
Uniswap V4-based DEX implementation with custom smart contracts for liquidity management and token swaps. Pure Solidity/Hardhat project with no backend API layer. Runs on Hardhat local network (chainId 1337).

## Architecture

### Contract Structure
1. **Core Contracts** (`contracts/core/`): Uniswap V4 PoolManager, ERC6909, libraries
2. **Periphery** (`contracts/periphery/`): PositionManager, V4Router, StateView, lenses
3. **Custom Contracts** (root): SimpleLiquidityManager, WorkingSwapRouter, TestToken
4. **V4 Source** (`.local/`): Vendored v4-core and v4-periphery repositories

### Critical Concepts

**PoolKey Structure**: Every pool operation requires a PoolKey struct with 5 fields:
```solidity
struct PoolKey {
  Currency currency0;    // Lower address (auto-sorted)
  Currency currency1;    // Higher address  
  uint24 fee;            // 500, 3000, or 10000 (basis points)
  int24 tickSpacing;     // 1, 60, or 200 (must match fee tier)
  IHooks hooks;          // address(0) for no hooks
}
```

**PoolId Calculation**: `PoolId.toId(poolKey)` = `keccak256(abi.encode(poolKey))`. See [contracts/core/types/PoolId.sol](contracts/core/types/PoolId.sol).

**Tick Ranges**: Full-range liquidity uses ticks `-887220` to `887220`. Prices use `sqrtPriceX96` (Q64.96 fixed-point).

## Development Workflows

### Local Development Setup
```bash
# Terminal 1: Start Hardhat node
npm run node

# Terminal 2: Deploy contracts
npm run deploy:local        # Deploy core contracts
npm run deploy:tokens       # Deploy 4 test tokens
npm run deploy:routers      # Deploy SimpleLiquidityManager + WorkingSwapRouter
```

### Contract Development
```bash
npm run compile       # Compile with viaIR optimization
npm test             # Run Hardhat tests (if present)
npm run clean        # Clean artifacts and cache
```

**Solidity Versions**: Multi-compiler setup (0.8.17, 0.8.20, 0.8.24, 0.8.26) with `viaIR: true` and `runs: 1` for minimal bytecode size. Required for Uniswap V4. See [hardhat.config.js](hardhat.config.js#L5-L45).

### Testing Workflows
```bash
npm run test:workflow    # Run complete end-to-end test
# Note: scripts/ directory may need to be created for custom test scripts
```

## Key Files & Patterns

### Custom Routers Pattern
Both [SimpleLiquidityManager.sol](contracts/SimpleLiquidityManager.sol) and [WorkingSwapRouter.sol](contracts/WorkingSwapRouter.sol) follow the same pattern:

1. Implement `IUnlockCallback` interface
2. Call `poolManager.unlock(data)` with encoded parameters
3. In `unlockCallback`, execute pool operations (`modifyLiquidity` or `swap`)
4. Settle debts using `poolManager.sync()` + `poolManager.settle()` for negative deltas
5. Take claims using `poolManager.take()` for positive deltas

**Critical**: Tokens must be transferred to router contract BEFORE calling operations. Uses "CurrencySettler" pattern from v4-core tests.

### Pool Initialization
Use `sqrtPriceX96 = 79228162514264337593543950336` for 1:1 initial price (2^96).

### Swap Parameters  
```solidity
SwapParams {
  bool zeroForOne;           // true = token0->token1
  int256 amountSpecified;    // negative = exactIn, positive = exactOut
  uint160 sqrtPriceLimitX96; // min/max acceptable price
}
```

Price limits prevent excessive slippage:
- For `zeroForOne=true`: `4295128740` (MIN_PRICE + 1)
- For `zeroForOne=false`: `1461446703485210103287273052203988822378723970342` (MAX_PRICE - 1)

## Environment Configuration

**Deployed Addresses** (from `.env` after running `npm run deploy:local`):
- PoolManager: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- StateView: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`
- SimpleLiquidityManager: `0x0B306BF915C4d645ff596e518fAf3F9669b97016`
- WorkingSwapRouter: `0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1`

**Test Tokens** (from `.env` after `npm run deploy:tokens`):
- TOKENS (stable): `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853`
- TOKENA (10:1): `0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6`
- TOKENB (20:1): `0x8A791620dd6260079BF849Dc5567aDC3F2FdC318`  
- TOKENC (1:1): `0x610178dA211FEF7D417bC0e6FeD39F05609AD788`

**Default Test Account**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (first Hardhat account, private key in `.env`)

## Common Development Patterns

### Adding Liquidity Flow
1. Deploy tokens or use existing test tokens
2. Initialize pool with `poolManager.initialize(poolKey, sqrtPriceX96)`
3. Transfer tokens to SimpleLiquidityManager contract
4. Call `liquidityManager.addLiquidity(poolKey, tickLower, tickUpper, liquidityDelta)`
5. Contract handles unlock callback, settles deltas automatically

### Executing Swaps Flow
1. Transfer input tokens to WorkingSwapRouter contract
2. Call `swapRouter.swap(poolKey, swapParams)`
3. Contract executes swap in unlock callback
4. Output tokens transferred back to sender

### Working with Deployment Scripts
The project uses npm scripts defined in package.json for deployment:
- `npm run deploy:local` - Deploy core contracts (PoolManager, StateView, etc.)
- `npm run deploy:tokens` - Deploy 4 test tokens with specific price ratios
- `npm run deploy:routers` - Deploy SimpleLiquidityManager and WorkingSwapRouter

## Project-Specific Conventions

- **No TypeScript**: Pure JavaScript for deployment scripts, Solidity for contracts
- **No Backend API**: Direct smart contract interaction only, no Express server
- **Single Network**: Development focused on Hardhat local network (chainId 1337)
- **Pre-funding Pattern**: Tokens transferred to router contracts before operations (no approvals needed)
- **Minimal Artifacts**: Compiled contracts exist, but some source files may only be in artifacts/
- **V4 Dependencies**: Uniswap V4 contracts copied to `.local/` directories for compilation compatibility

## Documentation References

- Project plan: [DEX_API_PLAN.md](DEX_API_PLAN.md) (historical - describes future API layer)
- Main README: [README.md](README.md)
- Configuration: [hardhat.config.js](hardhat.config.js), [.env](.env.example)
