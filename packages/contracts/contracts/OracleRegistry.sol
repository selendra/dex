// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IPriceOracle} from "./interfaces/IPriceOracle.sol";

/// @title OracleRegistry - Single source of truth for authorized PriceOracle addresses
/// @notice DEFAULT_ADMIN_ROLE holders register and revoke trusted oracle contracts.
///         Consuming contracts (LiquidityManager, SwapRouter, etc.) call `getOracle()` instead
///         of storing oracle addresses directly, so the registry is the single upgrade point.
/// @dev Before registering, the registry verifies the candidate implements IPriceOracle via ERC-165.
contract OracleRegistry is AccessControl {
    /// @notice The currently active oracle address (zero if none set)
    address public activeOracle;

    /// @notice All previously and currently registered oracles with their authorization status
    mapping(address => bool) public authorizedOracles;

    event OracleRegistered(address indexed oracle);
    event OracleRevoked(address indexed oracle);
    event ActiveOracleChanged(address indexed previousOracle, address indexed newOracle);

    error NotAnOracle(address candidate);
    error OracleNotAuthorized(address oracle);
    error OracleAlreadyAuthorized(address oracle);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Register a new oracle address after verifying it implements IPriceOracle (ERC-165).
    ///         Automatically promotes it to the active oracle.
    /// @param oracle Address of the deployed PriceOracle contract
    function registerOracle(address oracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // Verify the contract actually implements IPriceOracle via ERC-165
        if (!_supportsIPriceOracle(oracle)) revert NotAnOracle(oracle);
        if (authorizedOracles[oracle]) revert OracleAlreadyAuthorized(oracle);

        authorizedOracles[oracle] = true;
        emit OracleRegistered(oracle);

        address previous = activeOracle;
        activeOracle = oracle;
        emit ActiveOracleChanged(previous, oracle);
    }

    /// @notice Revoke a previously registered oracle. If it was the active oracle, activeOracle is cleared.
    /// @param oracle Address to revoke
    function revokeOracle(address oracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!authorizedOracles[oracle]) revert OracleNotAuthorized(oracle);

        authorizedOracles[oracle] = false;
        emit OracleRevoked(oracle);

        if (activeOracle == oracle) {
            emit ActiveOracleChanged(oracle, address(0));
            activeOracle = address(0);
        }
    }

    /// @notice Manually promote a previously registered (and still authorized) oracle to active.
    /// @param oracle Address to set as active
    function setActiveOracle(address oracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!authorizedOracles[oracle]) revert OracleNotAuthorized(oracle);

        address previous = activeOracle;
        activeOracle = oracle;
        emit ActiveOracleChanged(previous, oracle);
    }

    /// @notice Returns the active oracle, reverting if none is set.
    function getOracle() external view returns (IPriceOracle) {
        require(activeOracle != address(0), "OracleRegistry: no active oracle");
        return IPriceOracle(activeOracle);
    }

    /// @notice Check whether a given address is a currently authorized oracle.
    function isAuthorized(address oracle) external view returns (bool) {
        return authorizedOracles[oracle];
    }

    /// @dev Calls supportsInterface on the candidate. Returns false (not reverts) on failure.
    function _supportsIPriceOracle(address candidate) internal view returns (bool) {
        try IERC165(candidate).supportsInterface(type(IPriceOracle).interfaceId) returns (bool supported) {
            return supported;
        } catch {
            return false;
        }
    }
}
