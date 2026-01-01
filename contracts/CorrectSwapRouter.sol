// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPoolManager} from "./core/interfaces/IPoolManager.sol";
import {PoolKey} from "./core/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "./core/types/Currency.sol";
import {BalanceDelta} from "./core/types/BalanceDelta.sol";
import {PoolId, PoolIdLibrary} from "./core/types/PoolId.sol";
import {SwapParams} from "./core/types/PoolOperation.sol";
import {IERC20Minimal} from "./core/interfaces/external/IERC20Minimal.sol";

/// @notice Corrected swap router based on official v4-core PoolSwapTest.sol
/// Uses proper settle/take pattern for handling swap deltas
contract CorrectSwapRouter {
    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolKey;

    IPoolManager public immutable poolManager;
    
    error InvalidCaller();
    
    struct CallbackData {
        address sender;
        PoolKey key;
        SwapParams params;
    }

    constructor(IPoolManager _poolManager) {
        poolManager = _poolManager;
    }

    /// @notice Execute a swap
    /// @param key The pool key
    /// @param params Swap parameters
    /// @return delta The balance delta from the swap
    function swap(
        PoolKey memory key,
        SwapParams memory params
    ) external payable returns (BalanceDelta delta) {
        delta = abi.decode(
            poolManager.unlock(abi.encode(CallbackData(msg.sender, key, params))),
            (BalanceDelta)
        );
    }

    /// @notice Unlock callback called by PoolManager
    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        require(msg.sender == address(poolManager), InvalidCaller());

        CallbackData memory data = abi.decode(rawData, (CallbackData));

        // Execute the swap
        BalanceDelta delta = poolManager.swap(data.key, data.params, "");

        // Get the deltas for each currency
        int256 delta0 = delta.amount0();
        int256 delta1 = delta.amount1();

        // Settle debts (negative deltas)
        // When delta is negative, we owe tokens to the pool
        if (delta0 < 0) {
            _settle(data.key.currency0, data.sender, uint256(-delta0));
        }
        if (delta1 < 0) {
            _settle(data.key.currency1, data.sender, uint256(-delta1));
        }

        // Take credits (positive deltas)
        // When delta is positive, the pool owes us tokens
        if (delta0 > 0) {
            _take(data.key.currency0, data.sender, uint256(delta0));
        }
        if (delta1 > 0) {
            _take(data.key.currency1, data.sender, uint256(delta1));
        }

        return abi.encode(delta);
    }

    /// @notice Settle a debt to the pool manager
    /// @param currency The currency to settle
    /// @param payer The address paying the debt
    /// @param amount The amount to settle
    function _settle(Currency currency, address payer, uint256 amount) internal {
        // Sync the currency balance
        poolManager.sync(currency);
        
        // Transfer tokens from payer to pool manager
        IERC20Minimal(Currency.unwrap(currency)).transferFrom(
            payer,
            address(poolManager),
            amount
        );
        
        // Complete the settlement
        poolManager.settle();
    }

    /// @notice Take a credit from the pool manager
    /// @param currency The currency to take
    /// @param recipient The address receiving the tokens
    /// @param amount The amount to take
    function _take(Currency currency, address recipient, uint256 amount) internal {
        poolManager.take(currency, recipient, amount);
    }
}
