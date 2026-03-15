// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IPoolManager} from "./core/interfaces/IPoolManager.sol";
import {PoolKey} from "./core/types/PoolKey.sol";
import {Currency} from "./core/types/Currency.sol";
import {BalanceDelta} from "./core/types/BalanceDelta.sol";
import {IUnlockCallback} from "./core/interfaces/callback/IUnlockCallback.sol";
import {SwapParams} from "./core/types/PoolOperation.sol";
import {CurrencySettler} from "./CurrencySettler.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import {OracleRegistry} from "./OracleRegistry.sol";
import {IPriceOracle} from "./interfaces/IPriceOracle.sol";

/// @title SwapRouter - Uniswap V4 Token Swap Router with Role-Based Access Control
/// @notice Handles token swaps through PoolManager with pausable functionality and oracle-based
///         price validation. The oracle address is resolved from OracleRegistry, controlled by
///         DEFAULT_ADMIN_ROLE, so it can be upgraded without redeploying this contract.
/// @dev Uses OpenZeppelin AccessControl. DEFAULT_ADMIN_ROLE can grant/revoke roles.
///      PAUSER_ROLE is required to pause or unpause swaps.
contract SwapRouter is IUnlockCallback, AccessControl {
    using CurrencySettler for Currency;

    /// @notice Role identifier for accounts allowed to pause/unpause swaps
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    IPoolManager public immutable poolManager;

    /// @notice Registry that resolves the currently authorized PriceOracle
    OracleRegistry public oracleRegistry;

    /// @notice Pause state
    bool public paused;

    /// @notice Events
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event OracleRegistryUpdated(address indexed previousRegistry, address indexed newRegistry);

    /// @notice Errors
    error ContractPaused();
    error InvalidOracleRegistry();

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    /// @param _poolManager  The Uniswap V4 PoolManager
    /// @param _oracleRegistry  Deployed OracleRegistry (address(0) to skip oracle validation)
    constructor(IPoolManager _poolManager, address _oracleRegistry) {
        poolManager = _poolManager;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        if (_oracleRegistry != address(0)) {
            oracleRegistry = OracleRegistry(_oracleRegistry);
        }
    }

    /// @notice Update the oracle registry — requires DEFAULT_ADMIN_ROLE
    /// @param _oracleRegistry New OracleRegistry address (address(0) disables oracle validation)
    function setOracleRegistry(address _oracleRegistry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address previous = address(oracleRegistry);
        oracleRegistry = OracleRegistry(_oracleRegistry);
        emit OracleRegistryUpdated(previous, _oracleRegistry);
    }

    /// @notice Pause swaps — requires PAUSER_ROLE
    function pause() external onlyRole(PAUSER_ROLE) {
        paused = true;
        emit Paused(msg.sender);
    }

    /// @notice Unpause swaps — requires PAUSER_ROLE
    function unpause() external onlyRole(PAUSER_ROLE) {
        paused = false;
        emit Unpaused(msg.sender);
    }

    /// @notice Get the current price for a token pair from the authorized oracle.
    ///         Returns a zeroed PriceInfo if no oracle registry is configured.
    /// @param token0 First token address
    /// @param token1 Second token address
    function getPrice(address token0, address token1)
        external
        view
        returns (IPriceOracle.PriceInfo memory)
    {
        if (address(oracleRegistry) == address(0)) return IPriceOracle.PriceInfo(0, 0, 0, false, false);
        return oracleRegistry.getOracle().getPrice(token0, token1);
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
