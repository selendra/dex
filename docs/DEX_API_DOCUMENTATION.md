# DEX API Documentation

## Overview

This DEX is built on the Uniswap V4 architecture, featuring a singleton contract design with customizable hooks. The system consists of two main layers:

- **Core Layer**: PoolManager contract that manages all pools and their state
- **Periphery Layer**: User-facing contracts (V4Router, PositionManager) that provide convenient interfaces

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Concepts](#core-concepts)
3. [Smart Contract APIs](#smart-contract-apis)
4. [Integration Guide](#integration-guide)
5. [Code Examples](#code-examples)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Periphery Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  V4Router    │  │ Position     │  │ Pool         │      │
│  │              │  │ Manager      │  │ Initializer  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Core Layer                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            PoolManager (Singleton)                   │   │
│  │  • Manages all pools                                 │   │
│  │  • Handles swaps, liquidity, donations              │   │
│  │  • Flash accounting system                          │   │
│  │  • ERC6909 token claims                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Custom Hooks (Optional)                   │
│  • beforeSwap / afterSwap                                   │
│  • beforeModifyLiquidity / afterModifyLiquidity             │
│  • beforeInitialize / afterInitialize                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. PoolKey

Every pool is uniquely identified by a `PoolKey` structure:

```solidity
struct PoolKey {
    Currency currency0;      // Lower currency address
    Currency currency1;      // Higher currency address
    uint24 fee;             // LP fee (or 0x800000 for dynamic fees)
    int24 tickSpacing;      // Tick spacing for the pool
    IHooks hooks;           // Custom hooks contract address
}
```

**Key Points:**
- `currency0 < currency1` (enforced by contract)
- Fee is in hundredths of a bip (100 = 0.01%)
- TickSpacing determines price granularity
- Hooks enable custom pool behavior

### 2. Currency

A type-safe wrapper around token addresses:

```solidity
type Currency is address;

// Native ETH is represented as address(0)
Currency constant NATIVE = Currency.wrap(address(0));
```

### 3. Unlock Pattern

All state-changing operations require the contract to be "unlocked":

```solidity
function unlock(bytes calldata data) external returns (bytes memory);
```

This flash accounting system:
1. Unlocks the contract
2. Executes callback with your operations
3. Settles all debts before locking again

### 4. Balance Delta

Tracks token balance changes:

```solidity
type BalanceDelta is int256;
// Positive = tokens owed to you
// Negative = tokens you owe
```

---

## Smart Contract APIs

### PoolManager (Core)

The main contract managing all pools.

#### Initialize Pool

```solidity
function initialize(
    PoolKey memory key,
    uint160 sqrtPriceX96
) external returns (int24 tick);
```

**Parameters:**
- `key`: Pool identification parameters
- `sqrtPriceX96`: Initial price as Q64.96 sqrt value

**Returns:**
- `tick`: Initial tick of the pool

**Example:**
```solidity
PoolKey memory key = PoolKey({
    currency0: Currency.wrap(address(tokenA)),
    currency1: Currency.wrap(address(tokenB)),
    fee: 3000,  // 0.3%
    tickSpacing: 60,
    hooks: IHooks(address(0))
});

int24 tick = poolManager.initialize(key, sqrtPriceX96);
```

#### Swap

```solidity
function swap(
    PoolKey memory key,
    SwapParams memory params,
    bytes calldata hookData
) external returns (BalanceDelta swapDelta);
```

**SwapParams:**
```solidity
struct SwapParams {
    bool zeroForOne;           // true: token0 → token1
    int256 amountSpecified;    // negative: exact input, positive: exact output
    uint160 sqrtPriceLimitX96; // Price limit to stop swap
}
```

**Returns:**
- `swapDelta`: Balance changes (amount0, amount1)

#### Modify Liquidity

```solidity
function modifyLiquidity(
    PoolKey memory key,
    ModifyLiquidityParams memory params,
    bytes calldata hookData
) external returns (
    BalanceDelta callerDelta,
    BalanceDelta feesAccrued
);
```

**ModifyLiquidityParams:**
```solidity
struct ModifyLiquidityParams {
    int24 tickLower;       // Lower tick of position
    int24 tickUpper;       // Upper tick of position
    int256 liquidityDelta; // Amount to add (positive) or remove (negative)
    bytes32 salt;          // Unique identifier for position
}
```

#### Settlement Functions

**Take (Withdraw):**
```solidity
function take(Currency currency, address to, uint256 amount) external;
```

**Settle (Deposit):**
```solidity
function settle() external payable returns (uint256 paid);
function settleFor(address recipient) external payable returns (uint256 paid);
```

**Sync (For ERC20):**
```solidity
function sync(Currency currency) external;
```

**Mint/Burn (ERC6909 Claims):**
```solidity
function mint(address to, uint256 id, uint256 amount) external;
function burn(address from, uint256 id, uint256 amount) external;
```

---

### V4Router (Periphery)

High-level interface for swapping tokens.

#### Exact Input Single Swap

```solidity
struct ExactInputSingleParams {
    PoolKey poolKey;
    bool zeroForOne;
    uint128 amountIn;
    uint128 amountOutMinimum;
    bytes hookData;
}
```

#### Exact Input Multi-Hop Swap

```solidity
struct ExactInputParams {
    Currency currencyIn;
    PathKey[] path;             // Array of pools to route through
    uint256[] maxHopSlippage;   // Optional slippage control per hop
    uint128 amountIn;
    uint128 amountOutMinimum;
}
```

#### Exact Output Swaps

Similar structures exist for exact output swaps:
- `ExactOutputSingleParams`
- `ExactOutputParams`

#### Action System

V4Router uses an action-based system:

```solidity
// Actions
uint256 constant SWAP_EXACT_IN = 0x00;
uint256 constant SWAP_EXACT_IN_SINGLE = 0x01;
uint256 constant SWAP_EXACT_OUT = 0x02;
uint256 constant SWAP_EXACT_OUT_SINGLE = 0x03;
uint256 constant SETTLE = 0x09;
uint256 constant SETTLE_ALL = 0x10;
uint256 constant TAKE = 0x11;
uint256 constant TAKE_ALL = 0x12;
```

---

### PositionManager (Periphery)

Manages liquidity positions as ERC721 NFTs.

#### Modify Liquidities

Main entry point for position management:

```solidity
function modifyLiquidities(
    bytes calldata unlockData,
    uint256 deadline
) external payable;
```

**unlockData format:**
- Encoded actions and parameters
- Can batch multiple operations

#### Position Actions

Available actions in PositionManager:

```solidity
// Liquidity Actions
uint256 constant INCREASE_LIQUIDITY = 0x00;
uint256 constant DECREASE_LIQUIDITY = 0x02;
uint256 constant MINT_POSITION = 0x04;
uint256 constant BURN_POSITION = 0x05;

// Settlement Actions  
uint256 constant SETTLE = 0x09;
uint256 constant TAKE = 0x11;
uint256 constant SETTLE_PAIR = 0x0a;
uint256 constant TAKE_PAIR = 0x0b;
```

#### Position Information

```solidity
function getPoolAndPositionInfo(uint256 tokenId) 
    external view returns (
        PoolKey memory poolKey,
        PositionInfo positionInfo
    );

function getPositionLiquidity(uint256 tokenId) 
    external view returns (uint128 liquidity);
```

**PositionInfo (packed uint256):**
- Pool ID (25 bytes)
- Tick Lower (3 bytes)
- Tick Upper (3 bytes)
- Has Subscriber flag (1 byte)

---

## Integration Guide

### Pattern 1: Direct PoolManager Integration (Advanced)

For maximum control and gas efficiency:

```solidity
contract MyDEXIntegration is IUnlockCallback {
    IPoolManager public poolManager;
    
    function swapTokens(
        PoolKey memory key,
        int256 amountIn
    ) external {
        // Encode your swap parameters
        bytes memory data = abi.encode(key, amountIn);
        
        // Unlock and execute
        poolManager.unlock(data);
    }
    
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(poolManager));
        
        (PoolKey memory key, int256 amountIn) = abi.decode(
            data,
            (PoolKey, int256)
        );
        
        // Sync balance before swap
        poolManager.sync(key.currency0);
        
        // Execute swap
        SwapParams memory params = SwapParams({
            zeroForOne: true,
            amountSpecified: -amountIn,
            sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
        });
        
        BalanceDelta delta = poolManager.swap(key, params, "");
        
        // Settle input
        poolManager.settle();
        
        // Take output
        uint256 amountOut = uint256(int256(delta.amount1()));
        poolManager.take(key.currency1, msg.sender, amountOut);
        
        return "";
    }
}
```

### Pattern 2: V4Router Integration (Simple)

For standard swaps:

```solidity
contract SimpleSwapper {
    IV4Router public router;
    
    function swapExactInput(
        PoolKey memory poolKey,
        uint128 amountIn,
        uint128 minAmountOut
    ) external {
        // Prepare swap parameters
        IV4Router.ExactInputSingleParams memory params = 
            IV4Router.ExactInputSingleParams({
                poolKey: poolKey,
                zeroForOne: true,
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                hookData: ""
            });
        
        // Encode actions
        bytes memory actions = abi.encodePacked(
            uint8(Actions.SWAP_EXACT_IN_SINGLE),
            uint8(Actions.SETTLE),
            uint8(Actions.TAKE)
        );
        
        // Execute through unlock
        router.unlock(actions, abi.encode(params));
    }
}
```

### Pattern 3: PositionManager Integration

For liquidity provision:

```solidity
contract LiquidityProvider {
    IPositionManager public positionManager;
    
    function addLiquidity(
        PoolKey memory poolKey,
        int24 tickLower,
        int24 tickUpper,
        uint256 liquidity
    ) external returns (uint256 tokenId) {
        // Prepare mint parameters
        bytes memory actions = abi.encodePacked(
            uint8(Actions.MINT_POSITION),
            uint8(Actions.SETTLE_PAIR)
        );
        
        bytes[] memory params = new bytes[](2);
        params[0] = abi.encode(
            poolKey,
            tickLower,
            tickUpper,
            liquidity,
            type(uint128).max,  // max amount0
            type(uint128).max,  // max amount1
            address(this),      // recipient
            ""                  // hookData
        );
        
        positionManager.modifyLiquidities{value: msg.value}(
            abi.encode(actions, params),
            block.timestamp + 60
        );
        
        tokenId = positionManager.nextTokenId() - 1;
    }
}
```

---

## Code Examples

### Example 1: Initialize a Pool

```solidity
function initializePool(
    address tokenA,
    address tokenB,
    uint24 fee,
    uint160 initialPrice
) external returns (PoolKey memory key, int24 tick) {
    // Sort tokens
    (Currency currency0, Currency currency1) = tokenA < tokenB
        ? (Currency.wrap(tokenA), Currency.wrap(tokenB))
        : (Currency.wrap(tokenB), Currency.wrap(tokenA));
    
    // Create pool key
    key = PoolKey({
        currency0: currency0,
        currency1: currency1,
        fee: fee,
        tickSpacing: 60,
        hooks: IHooks(address(0))
    });
    
    // Initialize
    tick = poolManager.initialize(key, initialPrice);
}
```

### Example 2: Single-Hop Swap (Exact Input)

```solidity
function swapExactInput(
    PoolKey memory poolKey,
    uint256 amountIn,
    uint256 minAmountOut,
    bool zeroForOne
) external {
    // Transfer tokens to this contract first
    IERC20(Currency.unwrap(
        zeroForOne ? poolKey.currency0 : poolKey.currency1
    )).transferFrom(msg.sender, address(this), amountIn);
    
    // Approve PoolManager
    IERC20(Currency.unwrap(
        zeroForOne ? poolKey.currency0 : poolKey.currency1
    )).approve(address(poolManager), amountIn);
    
    // Execute swap through unlock
    bytes memory result = poolManager.unlock(
        abi.encode(poolKey, amountIn, minAmountOut, zeroForOne, msg.sender)
    );
}

// Callback implementation
function unlockCallback(bytes calldata data) external returns (bytes memory) {
    (
        PoolKey memory poolKey,
        uint256 amountIn,
        uint256 minAmountOut,
        bool zeroForOne,
        address recipient
    ) = abi.decode(data, (PoolKey, uint256, uint256, bool, address));
    
    // Sync the input currency
    Currency inputCurrency = zeroForOne ? poolKey.currency0 : poolKey.currency1;
    Currency outputCurrency = zeroForOne ? poolKey.currency1 : poolKey.currency0;
    
    poolManager.sync(inputCurrency);
    
    // Execute swap
    SwapParams memory params = SwapParams({
        zeroForOne: zeroForOne,
        amountSpecified: -int256(amountIn),
        sqrtPriceLimitX96: zeroForOne 
            ? TickMath.MIN_SQRT_PRICE + 1 
            : TickMath.MAX_SQRT_PRICE - 1
    });
    
    BalanceDelta delta = poolManager.swap(poolKey, params, "");
    
    // Check slippage
    uint256 amountOut = uint256(uint128(
        zeroForOne ? delta.amount1() : delta.amount0()
    ));
    require(amountOut >= minAmountOut, "Too little received");
    
    // Settle input
    poolManager.settle();
    
    // Take output
    poolManager.take(outputCurrency, recipient, amountOut);
    
    return "";
}
```

### Example 3: Multi-Hop Swap

```solidity
function multiHopSwap(
    Currency inputCurrency,
    Currency outputCurrency,
    address intermediateToken,
    uint24 fee1,
    uint24 fee2,
    uint256 amountIn,
    uint256 minAmountOut
) external {
    // Create path
    PathKey[] memory path = new PathKey[](2);
    
    // First hop
    path[0] = PathKey({
        intermediateCurrency: Currency.wrap(intermediateToken),
        fee: fee1,
        tickSpacing: 60,
        hooks: IHooks(address(0)),
        hookData: ""
    });
    
    // Second hop
    path[1] = PathKey({
        intermediateCurrency: outputCurrency,
        fee: fee2,
        tickSpacing: 60,
        hooks: IHooks(address(0)),
        hookData: ""
    });
    
    // Execute through router
    IV4Router.ExactInputParams memory params = IV4Router.ExactInputParams({
        currencyIn: inputCurrency,
        path: path,
        maxHopSlippage: new uint256[](0), // No per-hop slippage
        amountIn: uint128(amountIn),
        amountOutMinimum: uint128(minAmountOut)
    });
    
    // Encode actions
    bytes memory actions = abi.encodePacked(
        uint8(Actions.SWAP_EXACT_IN)
    );
    
    router.unlock(abi.encode(actions, params));
}
```

### Example 4: Add Liquidity (Mint Position)

```solidity
function mintPosition(
    PoolKey memory poolKey,
    int24 tickLower,
    int24 tickUpper,
    uint256 amount0Desired,
    uint256 amount1Desired,
    uint256 amount0Min,
    uint256 amount1Min
) external returns (uint256 tokenId) {
    // Calculate liquidity from amounts
    uint160 sqrtPriceX96 = poolManager.getSlot0(poolKey.toId()).sqrtPriceX96;
    uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
        sqrtPriceX96,
        TickMath.getSqrtPriceAtTick(tickLower),
        TickMath.getSqrtPriceAtTick(tickUpper),
        amount0Desired,
        amount1Desired
    );
    
    // Transfer tokens
    IERC20(Currency.unwrap(poolKey.currency0))
        .transferFrom(msg.sender, address(this), amount0Desired);
    IERC20(Currency.unwrap(poolKey.currency1))
        .transferFrom(msg.sender, address(this), amount1Desired);
    
    // Approve PositionManager
    IERC20(Currency.unwrap(poolKey.currency0))
        .approve(address(positionManager), amount0Desired);
    IERC20(Currency.unwrap(poolKey.currency1))
        .approve(address(positionManager), amount1Desired);
    
    // Encode mint action
    bytes memory unlockData = abi.encode(
        abi.encodePacked(uint8(Actions.MINT_POSITION)),
        abi.encode(
            poolKey,
            tickLower,
            tickUpper,
            liquidity,
            amount0Desired,
            amount1Desired,
            msg.sender,
            ""
        )
    );
    
    // Execute
    tokenId = positionManager.nextTokenId();
    positionManager.modifyLiquidities(
        unlockData,
        block.timestamp + 300
    );
}
```

### Example 5: Remove Liquidity (Decrease Position)

```solidity
function decreaseLiquidity(
    uint256 tokenId,
    uint128 liquidityToRemove,
    uint128 amount0Min,
    uint128 amount1Min
) external {
    require(
        positionManager.ownerOf(tokenId) == msg.sender,
        "Not owner"
    );
    
    // Encode decrease action
    bytes memory unlockData = abi.encode(
        abi.encodePacked(uint8(Actions.DECREASE_LIQUIDITY)),
        abi.encode(
            tokenId,
            liquidityToRemove,
            amount0Min,
            amount1Min,
            ""
        )
    );
    
    // Execute
    positionManager.modifyLiquidities(
        unlockData,
        block.timestamp + 300
    );
}
```

### Example 6: Flash Loan (Using Unlock)

```solidity
contract FlashLoan is IUnlockCallback {
    IPoolManager public poolManager;
    
    function executeFlashLoan(
        Currency currency,
        uint256 amount,
        bytes calldata userData
    ) external {
        bytes memory data = abi.encode(currency, amount, userData, msg.sender);
        poolManager.unlock(data);
    }
    
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(poolManager));
        
        (
            Currency currency,
            uint256 amount,
            bytes memory userData,
            address initiator
        ) = abi.decode(data, (Currency, uint256, bytes, address));
        
        // Take the flash loan
        poolManager.take(currency, address(this), amount);
        
        // Execute custom logic
        _executeFlashLoanLogic(currency, amount, userData, initiator);
        
        // Repay the flash loan
        IERC20(Currency.unwrap(currency)).approve(
            address(poolManager),
            amount
        );
        poolManager.sync(currency);
        poolManager.settle();
        
        return "";
    }
    
    function _executeFlashLoanLogic(
        Currency currency,
        uint256 amount,
        bytes memory userData,
        address initiator
    ) internal {
        // Your arbitrage/liquidation/other logic here
    }
}
```

---

## API Reference Tables

### PoolManager Key Functions

| Function | Purpose | Gas Cost | Requires Unlock |
|----------|---------|----------|-----------------|
| `initialize` | Create new pool | ~200k | No |
| `swap` | Execute token swap | ~100-150k | Yes |
| `modifyLiquidity` | Add/remove liquidity | ~150-200k | Yes |
| `donate` | Donate to LPs | ~80k | Yes |
| `take` | Withdraw tokens | ~50k | Yes |
| `settle` | Deposit tokens | ~50k | Yes |
| `sync` | Sync ERC20 balance | ~5k | Yes |
| `mint/burn` | ERC6909 claims | ~50k | Yes |

### V4Router Actions

| Action Code | Name | Description |
|-------------|------|-------------|
| 0x00 | SWAP_EXACT_IN | Multi-hop exact input swap |
| 0x01 | SWAP_EXACT_IN_SINGLE | Single-hop exact input |
| 0x02 | SWAP_EXACT_OUT | Multi-hop exact output swap |
| 0x03 | SWAP_EXACT_OUT_SINGLE | Single-hop exact output |
| 0x09 | SETTLE | Deposit specified amount |
| 0x10 | SETTLE_ALL | Deposit all debt |
| 0x11 | TAKE | Withdraw specified amount |
| 0x12 | TAKE_ALL | Withdraw all credit |

### PositionManager Actions

| Action Code | Name | Description |
|-------------|------|-------------|
| 0x00 | INCREASE_LIQUIDITY | Add to existing position |
| 0x02 | DECREASE_LIQUIDITY | Remove from position |
| 0x04 | MINT_POSITION | Create new position NFT |
| 0x05 | BURN_POSITION | Burn empty position NFT |
| 0x09 | SETTLE | Deposit single currency |
| 0x0a | SETTLE_PAIR | Deposit both currencies |
| 0x11 | TAKE | Withdraw single currency |
| 0x0b | TAKE_PAIR | Withdraw both currencies |

### Fee Tiers (Standard)

| Fee | Basis Points | Typical Use Case |
|-----|--------------|------------------|
| 100 | 0.01% | Stablecoin pairs |
| 500 | 0.05% | Correlated assets |
| 3000 | 0.3% | Standard pairs |
| 10000 | 1% | Exotic/volatile pairs |
| 0x800000 | Dynamic | Hook-controlled fees |

### Tick Spacing

| Tick Spacing | Min Price Movement | Use Case |
|--------------|-------------------|----------|
| 1 | 0.01% | Stablecoins |
| 10 | 0.1% | Correlated assets |
| 60 | 0.6% | Standard pairs |
| 200 | 2% | Volatile pairs |

---

## Events

### PoolManager Events

```solidity
event Initialize(
    PoolId indexed id,
    Currency indexed currency0,
    Currency indexed currency1,
    uint24 fee,
    int24 tickSpacing,
    IHooks hooks,
    uint160 sqrtPriceX96,
    int24 tick
);

event Swap(
    PoolId indexed id,
    address indexed sender,
    int128 amount0,
    int128 amount1,
    uint160 sqrtPriceX96,
    uint128 liquidity,
    int24 tick,
    uint24 fee
);

event ModifyLiquidity(
    PoolId indexed id,
    address indexed sender,
    int24 tickLower,
    int24 tickUpper,
    int256 liquidityDelta,
    bytes32 salt
);

event Donate(
    PoolId indexed id,
    address indexed sender,
    uint256 amount0,
    uint256 amount1
);
```

---

## Security Considerations

### 1. Reentrancy Protection

The unlock pattern provides built-in reentrancy protection:
- Contract must be locked before unlocking again
- All debts must be settled before relocking

### 2. Price Manipulation

- Use `sqrtPriceLimitX96` to prevent sandwich attacks
- Implement minimum output amounts
- Consider using TWAP oracles for critical operations

### 3. Slippage Protection

Always specify minimum outputs:
```solidity
// Bad
swap(key, params, "");

// Good
require(amountOut >= minAmountOut, "Slippage exceeded");
```

### 4. Token Approvals

Minimize approval amounts:
```solidity
// Approve exact amount needed
token.approve(address(poolManager), amountNeeded);

// Reset approval after use
token.approve(address(poolManager), 0);
```

### 5. Deadline Checks

Always include deadline parameters:
```solidity
modifier checkDeadline(uint256 deadline) {
    require(block.timestamp <= deadline, "Transaction too old");
    _;
}
```

---

## Gas Optimization Tips

1. **Batch Operations**: Use action arrays to batch multiple operations in one unlock
2. **Use SETTLE_ALL/TAKE_ALL**: More efficient than calculating exact amounts
3. **Minimize Hook Interactions**: Hooks add gas overhead
4. **Pool Reuse**: Singleton design means no deployment costs for new pools
5. **ERC6909 Claims**: Use internal accounting instead of transfers when possible

---

## Testing Guide

### Local Development

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Start local node
npx hardhat node
```

### Test Pool Setup

```javascript
const { ethers } = require("hardhat");

async function setupTestPool() {
    // Deploy PoolManager
    const PoolManager = await ethers.getContractFactory("PoolManager");
    const poolManager = await PoolManager.deploy(owner.address);
    
    // Deploy test tokens
    const Token = await ethers.getContractFactory("TestERC20");
    const token0 = await Token.deploy("Token0", "TK0");
    const token1 = await Token.deploy("Token1", "TK1");
    
    // Initialize pool
    const poolKey = {
        currency0: token0.address,
        currency1: token1.address,
        fee: 3000,
        tickSpacing: 60,
        hooks: ethers.constants.AddressZero
    };
    
    const sqrtPriceX96 = encodeSqrtPrice(1, 1); // 1:1 price
    await poolManager.initialize(poolKey, sqrtPriceX96);
    
    return { poolManager, token0, token1, poolKey };
}
```

---

## Troubleshooting

### Common Errors

#### `CurrencyNotSettled`
**Cause**: Not all debts were settled before unlock finished
**Solution**: Ensure all `settle()` and `take()` calls balance out

#### `ManagerLocked`
**Cause**: Trying to call a function that requires unlock without unlocking
**Solution**: Wrap operations in `unlock()` callback

#### `PoolNotInitialized`
**Cause**: Attempting to interact with an uninitialized pool
**Solution**: Call `initialize()` first

#### `SwapAmountCannotBeZero`
**Cause**: Swap amount is 0
**Solution**: Provide non-zero amount

#### `TickSpacingTooLarge/TooSmall`
**Cause**: Invalid tick spacing
**Solution**: Use tick spacing between 1 and 32767

---

## Advanced Topics

### Custom Hooks

Hooks enable custom pool behavior:

```solidity
contract MyCustomHook is IHooks {
    function beforeSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata hookData
    ) external returns (bytes4, BeforeSwapDelta, uint24) {
        // Custom logic before swap
        // Can modify fees, take tokens, etc.
        return (IHooks.beforeSwap.selector, BeforeSwapDelta.wrap(0), 0);
    }
    
    function afterSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata hookData
    ) external returns (bytes4, int128) {
        // Custom logic after swap
        return (IHooks.afterSwap.selector, 0);
    }
}
```

### Dynamic Fees

Set `fee = 0x800000` and implement dynamic fee updates:

```solidity
function updateDynamicLPFee(
    PoolKey memory key,
    uint24 newDynamicLPFee
) external;
```

### ERC6909 Multi-Token Standard

PoolManager implements ERC6909 for efficient internal accounting:

```solidity
// Convert Currency to token ID
uint256 tokenId = uint256(uint160(Currency.unwrap(currency)));

// Mint claim tokens
poolManager.mint(recipient, tokenId, amount);

// Burn claim tokens
poolManager.burn(owner, tokenId, amount);

// Transfer claim tokens
poolManager.transfer(recipient, tokenId, amount);
```

---

## Resources

- **Uniswap V4 Whitepaper**: [uniswap.org](https://uniswap.org)
- **GitHub Repository**: Check contract source code
- **Community Discord**: Join for support
- **Bug Bounty**: Report security issues

---

## Appendix

### Price Calculations

Convert between price representations:

```solidity
// Price to sqrtPriceX96
function encodeSqrtPrice(uint256 amount0, uint256 amount1) 
    pure returns (uint160) 
{
    uint256 ratioX192 = (amount1 << 192) / amount0;
    return uint160(sqrt(ratioX192));
}

// sqrtPriceX96 to price
function getPrice(uint160 sqrtPriceX96) 
    pure returns (uint256) 
{
    return (uint256(sqrtPriceX96) * uint256(sqrtPriceX96)) >> 192;
}
```

### Tick Math

```solidity
// Price to tick
int24 tick = TickMath.getTickAtSqrtPrice(sqrtPriceX96);

// Tick to price
uint160 sqrtPriceX96 = TickMath.getSqrtPriceAtTick(tick);

// Constants
int24 constant MIN_TICK = -887272;
int24 constant MAX_TICK = 887272;
uint160 constant MIN_SQRT_PRICE = 4295128739;
uint160 constant MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342;
```

### Liquidity Calculations

```solidity
library LiquidityAmounts {
    function getLiquidityForAmounts(
        uint160 sqrtPriceX96,
        uint160 sqrtPriceAX96,
        uint160 sqrtPriceBX96,
        uint256 amount0,
        uint256 amount1
    ) internal pure returns (uint128 liquidity);
    
    function getAmountsForLiquidity(
        uint160 sqrtPriceX96,
        uint160 sqrtPriceAX96,
        uint160 sqrtPriceBX96,
        uint128 liquidity
    ) internal pure returns (uint256 amount0, uint256 amount1);
}
```

---

## Version History

- **v1.0.0** (Current): Initial release based on Uniswap V4 architecture
  - Singleton pool design
  - Flash accounting system
  - Extensible hooks
  - ERC6909 claims
  - Gas-optimized operations

---

## License

This documentation covers smart contracts licensed under:
- BUSL-1.1 (Core contracts)
- MIT (Periphery contracts & interfaces)

Check individual contract files for specific licensing.

---

## Support

For questions and support:
- **GitHub Issues**: Report bugs and request features
- **Documentation**: This file and inline contract comments
- **Community**: Join developer community channels

---

*Last Updated: December 23, 2025*
