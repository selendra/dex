// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title SELToken - Mintable/Burnable ERC20 Token for Selendra DEX
/// @notice ERC20 token with role-based access control for minting.
/// @dev Uses OpenZeppelin AccessControl. DEFAULT_ADMIN_ROLE can grant/revoke roles.
///      MINTER_ROLE is required to mint new tokens.
contract SELToken is ERC20, AccessControl {
    /// @notice Role identifier for accounts allowed to mint tokens
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _mint(msg.sender, 1_000_000 * 10**18); // 1 million tokens
    }

    /// @notice Mint new tokens — requires MINTER_ROLE
    /// @param to Address to receive tokens
    /// @param amount Amount to mint
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
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
