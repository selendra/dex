// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Currency} from "./core/types/Currency.sol";
import {IPoolManager} from "./core/interfaces/IPoolManager.sol";
import {IERC20Minimal} from "./core/interfaces/external/IERC20Minimal.sol";

/// @title CurrencySettler
/// @notice Helper library for settling currencies with the PoolManager
library CurrencySettler {
    /// @notice Settle a currency to the PoolManager
    function settle(
        Currency currency,
        IPoolManager manager,
        address payer,
        uint256 amount,
        bool burn
    ) internal {
        // sync the balance
        manager.sync(currency);
        if (burn) {
            // TODO: Implement burn logic if needed
            revert("Burn not implemented");
        } else {
            // Transfer tokens from payer to PoolManager
            IERC20Minimal(Currency.unwrap(currency)).transferFrom(payer, address(manager), amount);
        }
        // settle the balance
        manager.settle();
    }

    /// @notice Take a currency from the PoolManager
    function take(
        Currency currency,
        IPoolManager manager,
        address recipient,
        uint256 amount,
        bool /* claims */
    ) internal {
        // Take from PoolManager's reserves
        manager.take(currency, recipient, amount);
    }
}
