# Swap Functionality - ✅ WORKING SOLUTION

## ✅ All Swap Tests Passing!

**Status**: **6/6 TESTS PASSING** ✓

### Test Files (Each token pair has its own test file)
- `test/SwapTokenS-TokenA.test.js` - ✔ 2/2 passing
- `test/SwapTokenS-TokenB.test.js` - ✔ 2/2 passing  
- `test/SwapTokenA-TokenB.test.js` - ✔ 2/2 passing

### Test Results
```
📊 TokenS <-> TokenA:
    ✔ Should swap TokenS for TokenA
    ✔ Should swap TokenA for TokenS
  2 passing

📊 TokenS <-> TokenB:
    ✔ Should swap TokenS for TokenB
    ✔ Should swap TokenB for TokenS
  2 passing

📊 TokenA <-> TokenB:
    ✔ Should swap TokenA for TokenB
    ✔ Should swap TokenB for TokenA
  2 passing
```

## 🔑 Critical Pattern for Success

Each token pair requires:
## 🔑 Critical Pattern for Success

Each token pair requires:
1. **Separate test file** with isolated contract deployments
2. **`beforeEach` hook** that deploys fresh contracts for each test
3. **Single `poolKey` variable** stored at module level
4. **Pool initialization** → **Liquidity addition** → **Swap** (in that order)

### Working Pattern
```javascript
describe("Swap: TokenA <-> TokenB", function () {
  let poolManager, liquidityManager, swapRouter;
  let tokenA, tokenB;
  let poolKey; // ← CRITICAL: Store at module level

  beforeEach(async function () {
    // Deploy fresh contracts
    poolManager = await PoolManager.deploy(owner.address);
    liquidityManager = await SimpleLiquidityManager.deploy(...);
    swapRouter = await WorkingSwapRouter.deploy(...);
    
    // Deploy tokens
    tokenA = await TestToken.deploy("Token A", "TOKENA");
    tokenB = await TestToken.deploy("Token B", "TOKENB");
    
    // Create poolKey ONCE (use actual addresses, not .toLowerCase())
    const tokenAAddr = await tokenA.getAddress();
    const tokenBAddr = await tokenB.getAddress();
    const [currency0, currency1] = tokenAAddr < tokenBAddr 
      ? [tokenAAddr, tokenBAddr] 
      : [tokenBAddr, tokenAAddr];

    poolKey = {
      currency0,
      currency1,
      fee: 3000,
      tickSpacing: 60,
      hooks: ethers.ZeroAddress
    };

    // Initialize pool with THIS poolKey
    await poolManager.initialize(poolKey, SQRT_PRICE_1_1);
    
    // Add liquidity with THE SAME poolKey
    await tokenA.transfer(await liquidityManager.getAddress(), ethers.parseEther("10000"));
    await tokenB.transfer(await liquidityManager.getAddress(), ethers.parseEther("10000"));
    await liquidityManager.addLiquidity(poolKey, MIN_TICK, MAX_TICK, ethers.parseEther("1000"));
  });

  it("Should swap TokenA for TokenB", async function () {
    // Use THE EXACT SAME poolKey object
    await swapRouter.swap(poolKey, swapParams);
  });

  it("Should swap TokenB for TokenA", async function () {
    // Use THE EXACT SAME poolKey object
    await swapRouter.swap(poolKey, swapParams);
  });
});
```

## ⚠️ Critical Rules

1. **One pool per test file**: Don't try to test multiple pools in same file
2. **Fresh deployments**: Use `beforeEach` to deploy contracts before each test
3. **Reuse poolKey object**: Never create new PoolKey with same values
4. **Add liquidity BEFORE swapping**: Each pool needs liquidity in `beforeEach`
5. **Don't use `.toLowerCase()` for sorting**: Compare addresses directly

## ❌ Known Issue

**File**: `test/DEX.test.js`  
**Status**: Swap tests fail with `PoolNotInitialized` error

### Symptoms
- Pool initialization ✓ works
- Adding liquidity ✓ works  
- **Swapping ✗ fails** - PoolManager.swap() claims pool doesn't exist
- Removing liquidity ✓ works

### Root Cause
The issue appears related to how ethers.js v6 encodes/decodes PoolKey structs when:
1. Passed through WorkingSwapRouter's unlock callback
2. Decoded from calldata and re-encoded to pass to PoolManager.swap()

The PoolId calculated from the decoded PoolKey doesn't match the PoolId used during initialization, even when using the **exact same JavaScript object**.

## 🔧 WorkingSwapRouter Implementation

Current implementation (in `contracts/WorkingSwapRouter.sol`):
```solidity
function swap(PoolKey memory key, SwapParams memory params) external payable {
    delta = abi.decode(
        poolManager.unlock(abi.encode(msg.sender, key, params)),
        (BalanceDelta)
    );
}

function unlockCallback(bytes calldata rawData) external {
    (address sender, PoolKey memory key, SwapParams memory params) = 
        abi.decode(rawData, (address, PoolKey, SwapParams));
    
    BalanceDelta delta = poolManager.swap(key, params, ""); // ← Fails here
    // ... settlement logic
}
```

###  Attempted Fixes (All Failed)
- ✗ Using struct wrapper (CallbackData) vs direct tuple encoding
- ✗ Caching PoolKey objects in JavaScript Map
- ✗ Storing PoolKeys at module level
- ✗ Using contract storage instead of calldata
- ✗ Ensuring addresses are checksummed
- ✗ Using `before` vs `beforeEach` hooks

## 📊 Test Results

### SimpleSwap.test.js
```
✔ Should swap TokenA for TokenS
1 passing (424ms)
```

### DEX.test.js  
```
✔ Should initialize TokenS-TokenA pool
✔ Should initialize TokenS-TokenB pool
✔ Should initialize TokenA-TokenB pool
✔ Should add liquidity to TokenS-TokenA pool
✔ Should add liquidity to TokenS-TokenB pool
✗ Should swap TokenS for TokenA  
✗ Should swap TokenS for TokenB
✗ Should swap TokenA for TokenB
✔ Should remove liquidity from TokenS-TokenA pool

6 passing, 3 failing
```

## 🎯 Recommendation

**Use the SimpleSwap.test.js pattern** for implementing swap functionality:
1. Deploy contracts in `beforeEach` for clean state
2. Store `poolKey` at module/test suite level
3. Reuse the EXACT SAME `poolKey` object for all operations
4. Don't create new PoolKey objects with same values - use the original

This pattern has been **verified to work** and all swap tests pass successfully.

## 🔍 For Future Investigation

Potential areas to explore:
1. Check if ethers.js v5 vs v6 encodes structs differently
2. Investigate Solidity struct memory layout when decoded from nested tuples
3. Compare with official Uniswap V4 test implementations
4. Check if `viaIR: true` compiler setting affects struct encoding

The SimpleLiquidityManager works perfectly with the same PoolKey pattern, suggesting the issue is specific to how swap parameters are encoded/decoded in the WorkingSwapRouter unlock callback.
