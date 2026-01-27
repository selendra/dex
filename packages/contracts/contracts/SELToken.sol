// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title SELToken - Mintable/Burnable ERC20 Token for Selendra DEX
/// @notice ERC20 token with admin-controlled minting
contract SELToken is ERC20 {
    /// @notice Admin address - can mint tokens
    address public admin;
    
    /// @notice Mapping of authorized minters
    mapping(address => bool) public authorizedMinters;

    /// @notice Events
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event MinterAuthorized(address indexed account, bool authorized);

    /// @notice Errors
    error NotAdmin();
    error NotAuthorizedMinter();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyMinter() {
        if (msg.sender != admin && !authorizedMinters[msg.sender]) revert NotAuthorizedMinter();
        _;
    }

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        admin = msg.sender;
        authorizedMinters[msg.sender] = true;
        _mint(msg.sender, 1_000_000 * 10**18); // 1 million tokens
    }

    /// @notice Change admin address
    /// @param newAdmin New admin address
    function setAdmin(address newAdmin) external onlyAdmin {
        address oldAdmin = admin;
        admin = newAdmin;
        emit AdminChanged(oldAdmin, newAdmin);
    }

    /// @notice Authorize or revoke an address to mint tokens
    /// @param account Address to authorize/revoke
    /// @param authorized True to authorize, false to revoke
    function setAuthorizedMinter(address account, bool authorized) external onlyAdmin {
        authorizedMinters[account] = authorized;
        emit MinterAuthorized(account, authorized);
    }

    /// @notice Mint new tokens - only admin or authorized minters
    /// @param to Address to receive tokens
    /// @param amount Amount to mint
    function mint(address to, uint256 amount) external onlyMinter {
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
