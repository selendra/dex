// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title TestToken - Simple ERC20 for testing
contract TestToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1_000_000 * 10**18); // 1 million tokens
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
