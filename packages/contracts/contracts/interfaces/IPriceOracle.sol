// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title IPriceOracle - Interface for the DEX PriceOracle
/// @notice Any contract claiming to be the PriceOracle must implement this interface.
///         Consuming contracts verify authenticity via ERC-165: `supportsInterface(type(IPriceOracle).interfaceId)`.
interface IPriceOracle {
    struct PriceInfo {
        uint256 price;       // Current price (18 decimals)
        uint256 twap;        // Time-weighted average price (18 decimals)
        uint256 lastUpdate;  // Last update timestamp
        bool fromPool;       // True if price is from on-chain pool
        bool isStale;        // True if price is older than MAX_PRICE_AGE
    }

    /// @notice Get price info for a token pair
    function getPrice(address token0, address token1) external view returns (PriceInfo memory info);

    /// @notice Returns whether a token is classified as a stablecoin
    function isStablecoin(address token) external view returns (bool);

    /// @notice Maximum allowed age for a price to be considered valid
    function MAX_PRICE_AGE() external view returns (uint256);
}
