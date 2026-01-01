// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPoolManager} from "./core/interfaces/IPoolManager.sol";
import {PoolKey} from "./core/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "./core/types/Currency.sol";
import {BalanceDelta} from "./core/types/BalanceDelta.sol";
import {SwapParams} from "./core/types/PoolOperation.sol";
import {IERC20Minimal} from "./core/interfaces/external/IERC20Minimal.sol";

/// @notice Swap router that mimics SimpleLiquidityManager's pattern EXACTLY
/// Tokens must be transferred to this contract before calling swap
contract PreFundedSwapRouter {
    using CurrencyLibrary for Currency;

    IPoolManager public immutable poolManager;
    
    error InvalidCaller();
    
    struct CallbackData {
        PoolKey key;
        SwapParams params;
        address recipient;
    }

    constructor(IPoolManager _poolManager) {
        poolManager = _poolManager;
    }

    /// @notice Execute a swap - tokens must already be in this contract
    /// @param key The pool key
    /// @param params Swap parameters
    /// @param recipient Address to send output tokens to
    /// @return delta The balance delta from the swap
    function swap(
        PoolKey memory key,
        SwapParams memory params,
        address recipient
    ) external returns (BalanceDelta delta) {
        delta = abi.decode(
            poolManager.unlock(abi.encode(CallbackData(key, params, recipient))),
            (BalanceDelta)
        );
    }

    /// @notice Unlock callback called by PoolManager
    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        require(msg.sender == address(poolManager), InvalidCaller());

        CallbackData memory data = abi.decode(rawData, (CallbackData));

        // Execute the swap
        BalanceDelta delta = poolManager.swap(data.key, data.params, "");

        // Get the deltas
        int128 amount0 = delta.amount0();
        int128 amount1 = delta.amount1();

        // Settle debts (negative deltas) - same as SimpleLiquidityManager
        if (amount0 < 0) settleFor(data.key.currency0, uint128(-amount0));
        if (amount1 < 0) settleFor(data.key.currency1, uint128(-amount1));

        // Take credits (positive deltas) - send to recipient
        if (amount0 > 0) poolManager.take(data.key.currency0, data.recipient, uint128(amount0));
        if (amount1 > 0) poolManager.take(data.key.currency1, data.recipient, uint128(amount1));

        return abi.encode(delta);
    }

    /// @notice Settle currency - EXACT copy from SimpleLiquidityManager
    function settleFor(Currency currency, uint256 amount) internal {
        poolManager.sync(currency);
        IERC20Minimal(Currency.unwrap(currency)).transfer(address(poolManager), amount);
        poolManager.settle();
    }
}
