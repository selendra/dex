// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title TestToken - Simple ERC20 for testing
contract TestToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1_000_000 * 10**18); // 1 million tokens
    }

    /// @notice Mint new tokens (for testing purposes)
    /// @param to Address to receive tokens
    /// @param amount Amount to mint
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /// @notice Burn tokens from caller's balance
    /// @param amount Amount to burn
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /// @notice Burn tokens from a specified account (requires allowance)
    /// @param account Address to burn from
    /// @param amount Amount to burn
    function burnFrom(address account, uint256 amount) external {
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
    }
}
