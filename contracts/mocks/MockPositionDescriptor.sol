// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "../periphery/interfaces/IPositionDescriptor.sol";
import "../periphery/interfaces/IPositionManager.sol";
import {IPoolManager} from "../core/interfaces/IPoolManager.sol";

/// @title MockPositionDescriptor - Simple descriptor for testing
/// @notice Returns basic token URI for NFT positions
contract MockPositionDescriptor is IPositionDescriptor {
    IPoolManager public immutable poolManager;
    address public immutable wrappedNative;
    
    constructor(IPoolManager _poolManager, address _wrappedNative) {
        poolManager = _poolManager;
        wrappedNative = _wrappedNative;
    }

    function tokenURI(IPositionManager positionManager, uint256 tokenId)
        external
        view
        override
        returns (string memory)
    {
        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                "eyJuYW1lIjoiVW5pc3dhcCBWNCBQb3NpdGlvbiIsImRlc2NyaXB0aW9uIjoiVGhpcyBORlQgcmVwcmVzZW50cyBhIGxpcXVpZGl0eSBwb3NpdGlvbiBpbiBhIFVuaXN3YXAgVjQgcG9vbC4ifQ=="
            )
        );
    }

    function flipRatio(address currency0, address currency1) external pure override returns (bool) {
        // For testing, never flip
        return false;
    }

    function currencyRatioPriority(address currency) external pure override returns (int256) {
        // All currencies have equal priority for testing
        return 0;
    }

    function nativeCurrencyLabel() external pure override returns (string memory) {
        return "ETH";
    }
}
