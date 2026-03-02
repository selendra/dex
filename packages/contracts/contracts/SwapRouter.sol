// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IPoolManager} from "./core/interfaces/IPoolManager.sol";
import {PoolKey} from "./core/types/PoolKey.sol";
import {Currency} from "./core/types/Currency.sol";
import {BalanceDelta} from "./core/types/BalanceDelta.sol";
import {IUnlockCallback} from "./core/interfaces/callback/IUnlockCallback.sol";
import {SwapParams} from "./core/types/PoolOperation.sol";
import {CurrencySettler} from "./CurrencySettler.sol";

/// @title SwapRouter - Uniswap V4 Token Swap Router with Admin Control
/// @notice Handles token swaps through PoolManager with pausable functionality
contract SwapRouter is IUnlockCallback {
    using CurrencySettler for Currency;

    IPoolManager public immutable poolManager;
    
    /// @notice Admin address - can pause/unpause
    address public admin;
    
    /// @notice Pause state
    bool public paused;

    /// @notice Events
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    /// @notice Errors
    error NotAdmin();
    error ContractPaused();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    constructor(IPoolManager _poolManager) {
        poolManager = _poolManager;
        admin = msg.sender;
    }

    /// @notice Change admin address
    /// @param newAdmin New admin address
    function setAdmin(address newAdmin) external onlyAdmin {
        address oldAdmin = admin;
        admin = newAdmin;
        emit AdminChanged(oldAdmin, newAdmin);
    }

    /// @notice Pause swaps
    function pause() external onlyAdmin {
        paused = true;
        emit Paused(msg.sender);
    }

    /// @notice Unpause swaps
    function unpause() external onlyAdmin {
        paused = false;
        emit Unpaused(msg.sender);
    }

    /// @notice Swap tokens
    function swap(
        PoolKey memory key,
        SwapParams memory params
    ) external payable whenNotPaused returns (BalanceDelta delta) {
        delta = abi.decode(
            poolManager.unlock(abi.encode(msg.sender, key, params)),
            (BalanceDelta)
        );
    }

    /// @notice Unlock callback
    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        require(msg.sender == address(poolManager), "Only pool manager");
        
        (address sender, PoolKey memory key, SwapParams memory params) = abi.decode(rawData, (address, PoolKey, SwapParams));
        
        // Execute the swap
        BalanceDelta delta = poolManager.swap(key, params, "");
        
        // Settle using CurrencySettler pattern from v4-core
        int128 deltaAfter0 = delta.amount0();
        int128 deltaAfter1 = delta.amount1();
        
        // Settle debts (negative deltas) - pull tokens from sender
        if (deltaAfter0 < 0) {
            key.currency0.settle(poolManager, sender, uint256(uint128(-deltaAfter0)), false);
        }
        if (deltaAfter1 < 0) {
            key.currency1.settle(poolManager, sender, uint256(uint128(-deltaAfter1)), false);
        }
        
        // Take credits (positive deltas) - send tokens to sender
        if (deltaAfter0 > 0) {
            key.currency0.take(poolManager, sender, uint256(uint128(deltaAfter0)), false);
        }
        if (deltaAfter1 > 0) {
            key.currency1.take(poolManager, sender, uint256(uint128(deltaAfter1)), false);
        }
        
        return abi.encode(delta);
    }
}
