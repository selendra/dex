// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IPoolManager} from "./core/interfaces/IPoolManager.sol";
import {PoolKey} from "./core/types/PoolKey.sol";
import {Currency} from "./core/types/Currency.sol";
import {BalanceDelta} from "./core/types/BalanceDelta.sol";
import {ModifyLiquidityParams} from "./core/types/PoolOperation.sol";
import {IERC20Minimal} from "./core/interfaces/external/IERC20Minimal.sol";

/// @title SimpleLiquidityManager - Uses CurrencySettler pattern from v4-core tests
contract SimpleLiquidityManager {
    IPoolManager public immutable poolManager;
    
    constructor(IPoolManager _poolManager) {
        poolManager = _poolManager;
    }

    /// @notice Add liquidity to a pool - tokens must be in this contract
    function addLiquidity(
        PoolKey memory key,
        int24 tickLower,
        int24 tickUpper,
        int256 liquidityDelta
    ) external returns (BalanceDelta delta) {
        delta = abi.decode(
            poolManager.unlock(abi.encode(key, tickLower, tickUpper, liquidityDelta)),
            (BalanceDelta)
        );
    }

    /// @notice Unlock callback
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(poolManager), "Only pool manager");
        
        (PoolKey memory key, int24 tickLower, int24 tickUpper, int256 liquidityDelta) =
            abi.decode(data, (PoolKey, int24, int24, int256));
        
        ModifyLiquidityParams memory params = ModifyLiquidityParams({
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidityDelta: liquidityDelta,
            salt: bytes32(0)
        });
        
        // Add liquidity
        (BalanceDelta delta,) = poolManager.modifyLiquidity(key, params, "");
        
        // Settle using CurrencySettler pattern from v4-core tests
        int128 amount0 = delta.amount0();
        int128 amount1 = delta.amount1();
        
        // Negative delta = we owe tokens to pool
        if (amount0 < 0) settleFor(key.currency0, uint128(-amount0));
        if (amount1 < 0) settleFor(key.currency1, uint128(-amount1));
        
        // Positive delta = pool owes us tokens
        if (amount0 > 0) poolManager.take(key.currency0, address(this), uint128(amount0));
        if (amount1 > 0) poolManager.take(key.currency1, address(this), uint128(amount1));
        
        return abi.encode(delta);
    }

    /// @notice Settle currency using the CurrencySettler pattern
    function settleFor(Currency currency, uint256 amount) internal {
        poolManager.sync(currency);
        IERC20Minimal(Currency.unwrap(currency)).transfer(address(poolManager), amount);
        poolManager.settle();
    }
}
