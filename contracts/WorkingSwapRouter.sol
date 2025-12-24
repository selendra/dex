// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IPoolManager} from "./core/interfaces/IPoolManager.sol";
import {PoolKey} from "./core/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "./core/types/Currency.sol";
import {BalanceDelta, toBalanceDelta} from "./core/types/BalanceDelta.sol";
import {IUnlockCallback} from "./core/interfaces/callback/IUnlockCallback.sol";
import {PoolId, PoolIdLibrary} from "./core/types/PoolId.sol";
import {SwapParams} from "./core/types/PoolOperation.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title WorkingSwapRouter - A functional swap router for testing
/// @notice Actually works without complex action encoding
contract WorkingSwapRouter is IUnlockCallback {
    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolKey;

    IPoolManager public immutable poolManager;
    
    struct SwapCallbackData {
        address sender;
        PoolKey key;
        SwapParams params;
    }

    constructor(IPoolManager _poolManager) {
        poolManager = _poolManager;
    }

    /// @notice Swap tokens
    function swap(
        PoolKey memory key,
        SwapParams memory params
    ) external returns (BalanceDelta) {
        SwapCallbackData memory data = SwapCallbackData({
            sender: msg.sender,
            key: key,
            params: params
        });
        
        bytes memory result = poolManager.unlock(abi.encode(data));
        return abi.decode(result, (BalanceDelta));
    }

    /// @notice Unlock callback - executes the swap
    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        require(msg.sender == address(poolManager), "Only pool manager");
        
        SwapCallbackData memory data = abi.decode(rawData, (SwapCallbackData));
        
        // Execute the swap to get deltas
        BalanceDelta delta = poolManager.swap(data.key, data.params, "");
        
        // Get delta amounts (negative = we owe tokens, positive = we receive tokens)
        int128 amount0Delta = delta.amount0();
        int128 amount1Delta = delta.amount1();
        
        // Settle debts (negative deltas - we owe the pool)
        if (amount0Delta < 0) {
            settleFor(data.key.currency0, data.sender, uint128(-amount0Delta));
        }
        if (amount1Delta < 0) {
            settleFor(data.key.currency1, data.sender, uint128(-amount1Delta));
        }
        
        // Take credits (positive deltas - pool owes us)
        if (amount0Delta > 0) {
            poolManager.take(data.key.currency0, data.sender, uint128(amount0Delta));
        }
        if (amount1Delta > 0) {
            poolManager.take(data.key.currency1, data.sender, uint128(amount1Delta));
        }
        
        return abi.encode(delta);
    }

    /// @notice Settle currency using CurrencySettler pattern
    function settleFor(Currency currency, address payer, uint256 amount) internal {
        poolManager.sync(currency);
        IERC20(Currency.unwrap(currency)).transferFrom(payer, address(poolManager), amount);
        poolManager.settle();
    }
}
