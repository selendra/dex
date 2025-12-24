// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IPoolManager} from "./core/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "./core/interfaces/callback/IUnlockCallback.sol";
import {IHooks} from "./core/interfaces/IHooks.sol";
import {PoolKey} from "./core/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "./core/types/Currency.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "./core/types/BalanceDelta.sol";
import {SwapParams, ModifyLiquidityParams} from "./core/types/PoolOperation.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title SimpleSwapRouter
/// @notice A simple router for executing swaps and liquidity operations through PoolManager
contract SimpleSwapRouter is IUnlockCallback {
    using CurrencyLibrary for Currency;
    using BalanceDeltaLibrary for BalanceDelta;

    IPoolManager public immutable poolManager;
    
    struct MintCallbackData {
        PoolKey key;
        int24 tickLower;
        int24 tickUpper;
        uint256 liquidity;
        uint256 amount0Max;
        uint256 amount1Max;
        address recipient;
    }

    struct SwapCallbackData {
        PoolKey key;
        SwapParams params;
        address recipient;
    }

    constructor(IPoolManager _poolManager) {
        poolManager = _poolManager;
    }

    /// @notice Add liquidity to a pool
    function mint(
        PoolKey memory key,
        int24 tickLower,
        int24 tickUpper,
        uint256 liquidity,
        uint256 amount0Max,
        uint256 amount1Max,
        address recipient,
        uint256 deadline
    ) external payable returns (uint256 amount0, uint256 amount1) {
        require(block.timestamp <= deadline, "Transaction too old");
        
        MintCallbackData memory data = MintCallbackData({
            key: key,
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidity: liquidity,
            amount0Max: amount0Max,
            amount1Max: amount1Max,
            recipient: recipient
        });

        bytes memory result = poolManager.unlock(abi.encode(0, data)); // 0 = mint action
        (amount0, amount1) = abi.decode(result, (uint256, uint256));
    }

    /// @notice Execute a swap
    function exactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        address recipient,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint160 sqrtPriceLimitX96
    ) external payable returns (uint256 amountOut) {
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(tokenIn < tokenOut ? tokenIn : tokenOut),
            currency1: Currency.wrap(tokenIn < tokenOut ? tokenOut : tokenIn),
            fee: fee,
            tickSpacing: _getTickSpacing(fee),
            hooks: IHooks(address(0))
        });

        bool zeroForOne = tokenIn < tokenOut;
        SwapParams memory params = SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: int256(amountIn),
            sqrtPriceLimitX96: sqrtPriceLimitX96 == 0 ? (zeroForOne ? 4295128740 : 1461446703485210103287273052203988822378723970341) : sqrtPriceLimitX96
        });

        SwapCallbackData memory data = SwapCallbackData({
            key: key,
            params: params,
            recipient: recipient
        });

        bytes memory result = poolManager.unlock(abi.encode(1, data)); // 1 = swap action
        int256 delta = abi.decode(result, (int256));
        amountOut = uint256(delta > 0 ? delta : -delta);
        require(amountOut >= amountOutMinimum, "Insufficient output amount");
    }

    /// @notice Callback for unlocked pool manager
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(poolManager), "Only pool manager");
        
        (uint8 action, bytes memory actionData) = abi.decode(data, (uint8, bytes));
        
        if (action == 0) {
            // Mint liquidity
            return _mintCallback(actionData);
        } else if (action == 1) {
            // Swap
            return _swapCallback(actionData);
        }
        
        revert("Unknown action");
    }

    function _mintCallback(bytes memory data) internal returns (bytes memory) {
        MintCallbackData memory mintData = abi.decode(data, (MintCallbackData));
        
        // Modify liquidity
        ModifyLiquidityParams memory params = ModifyLiquidityParams({
            tickLower: mintData.tickLower,
            tickUpper: mintData.tickUpper,
            liquidityDelta: int256(mintData.liquidity),
            salt: bytes32(0)
        });

        (BalanceDelta delta, ) = poolManager.modifyLiquidity(mintData.key, params, "");
        
        uint256 amount0 = uint256(uint128(-delta.amount0()));
        uint256 amount1 = uint256(uint128(-delta.amount1()));
        
        require(amount0 <= mintData.amount0Max, "Amount0 exceeds max");
        require(amount1 <= mintData.amount1Max, "Amount1 exceeds max");

        // Transfer tokens to pool manager
        if (amount0 > 0) {
            _pay(mintData.key.currency0, msg.sender, address(poolManager), amount0);
        }
        if (amount1 > 0) {
            _pay(mintData.key.currency1, msg.sender, address(poolManager), amount1);
        }

        return abi.encode(amount0, amount1);
    }

    function _swapCallback(bytes memory data) internal returns (bytes memory) {
        SwapCallbackData memory swapData = abi.decode(data, (SwapCallbackData));
        
        BalanceDelta delta = poolManager.swap(swapData.key, swapData.params, "");
        
        int128 amount0 = delta.amount0();
        int128 amount1 = delta.amount1();
        
        // Pay what we owe
        if (amount0 < 0) {
            _pay(swapData.key.currency0, msg.sender, address(poolManager), uint256(uint128(-amount0)));
        }
        if (amount1 < 0) {
            _pay(swapData.key.currency1, msg.sender, address(poolManager), uint256(uint128(-amount1)));
        }

        // Collect what we're owed
        if (amount0 > 0) {
            poolManager.take(swapData.key.currency0, swapData.recipient, uint256(uint128(amount0)));
        }
        if (amount1 > 0) {
            poolManager.take(swapData.key.currency1, swapData.recipient, uint256(uint128(amount1)));
        }

        int256 deltaOut = swapData.params.zeroForOne ? int256(amount1) : int256(amount0);
        return abi.encode(deltaOut);
    }

    function _pay(Currency currency, address payer, address recipient, uint256 amount) internal {
        if (currency.isAddressZero()) {
            require(msg.value >= amount, "Insufficient ETH");
        } else {
            // In unlock callback context, we need to transfer from the original caller
            // The payer here is actually tx.origin in the unlock context
            IERC20(Currency.unwrap(currency)).transferFrom(tx.origin, recipient, amount);
        }
    }

    function _getTickSpacing(uint24 fee) internal pure returns (int24) {
        if (fee == 500) return 10;
        if (fee == 3000) return 60;
        if (fee == 10000) return 200;
        return 60;
    }
}
