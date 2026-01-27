// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IPoolManager} from "./core/interfaces/IPoolManager.sol";
import {PoolKey} from "./core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "./core/types/PoolId.sol";
import {Currency} from "./core/types/Currency.sol";
import {BalanceDelta} from "./core/types/BalanceDelta.sol";
import {ModifyLiquidityParams} from "./core/types/PoolOperation.sol";
import {IERC20Minimal} from "./core/interfaces/external/IERC20Minimal.sol";

/// @title LiquidityManager - Uniswap V4 Liquidity Management with Admin Control
/// @notice Manages liquidity positions and pool initialization with admin access control
contract LiquidityManager {
    using PoolIdLibrary for PoolKey;

    IPoolManager public immutable poolManager;
    
    /// @notice Admin address - can initialize pools
    address public admin;
    
    /// @notice Mapping of authorized pool initializers
    mapping(address => bool) public authorizedInitializers;
    
    /// @notice Track initialized pools
    mapping(PoolId => bool) public initializedPools;

    /// @notice Events
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event InitializerAuthorized(address indexed account, bool authorized);
    event PoolInitialized(PoolId indexed poolId, address indexed initializer);

    /// @notice Errors
    error NotAdmin();
    error NotAuthorized();
    error PoolAlreadyInitialized();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyAuthorized() {
        if (msg.sender != admin && !authorizedInitializers[msg.sender]) revert NotAuthorized();
        _;
    }
    
    constructor(IPoolManager _poolManager) {
        poolManager = _poolManager;
        admin = msg.sender;
        authorizedInitializers[msg.sender] = true;
    }

    /// @notice Change admin address
    /// @param newAdmin New admin address
    function setAdmin(address newAdmin) external onlyAdmin {
        address oldAdmin = admin;
        admin = newAdmin;
        emit AdminChanged(oldAdmin, newAdmin);
    }

    /// @notice Authorize or revoke an address to initialize pools
    /// @param account Address to authorize/revoke
    /// @param authorized True to authorize, false to revoke
    function setAuthorizedInitializer(address account, bool authorized) external onlyAdmin {
        authorizedInitializers[account] = authorized;
        emit InitializerAuthorized(account, authorized);
    }

    /// @notice Initialize a new pool - only admin or authorized addresses
    /// @param key Pool key containing token pair and fee info
    /// @param sqrtPriceX96 Initial sqrt price
    /// @return tick The initial tick of the pool
    function initializePool(
        PoolKey memory key,
        uint160 sqrtPriceX96
    ) external onlyAuthorized returns (int24 tick) {
        PoolId poolId = key.toId();
        
        if (initializedPools[poolId]) revert PoolAlreadyInitialized();
        
        tick = poolManager.initialize(key, sqrtPriceX96);
        initializedPools[poolId] = true;
        
        emit PoolInitialized(poolId, msg.sender);
    }

    /// @notice Check if a pool is initialized
    /// @param key Pool key
    /// @return True if pool is initialized
    function isPoolInitialized(PoolKey memory key) external view returns (bool) {
        return initializedPools[key.toId()];
    }

    /// @notice Add liquidity to a pool - tokens must be in this contract
    function addLiquidity(
        PoolKey memory key,
        int24 tickLower,
        int24 tickUpper,
        int256 liquidityDelta
    ) external returns (BalanceDelta delta) {
        delta = abi.decode(
            poolManager.unlock(abi.encode(key, tickLower, tickUpper, liquidityDelta)),
            (BalanceDelta)
        );
    }

    /// @notice Unlock callback
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(poolManager), "Only pool manager");
        
        (PoolKey memory key, int24 tickLower, int24 tickUpper, int256 liquidityDelta) =
            abi.decode(data, (PoolKey, int24, int24, int256));
        
        ModifyLiquidityParams memory params = ModifyLiquidityParams({
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidityDelta: liquidityDelta,
            salt: bytes32(0)
        });
        
        // Add liquidity
        (BalanceDelta delta,) = poolManager.modifyLiquidity(key, params, "");
        
        // Settle using CurrencySettler pattern from v4-core tests
        int128 amount0 = delta.amount0();
        int128 amount1 = delta.amount1();
        
        // Negative delta = we owe tokens to pool
        if (amount0 < 0) {
            poolManager.sync(key.currency0);
            IERC20Minimal(Currency.unwrap(key.currency0)).transfer(
                address(poolManager),
                uint128(-amount0)
            );
            poolManager.settle();
        }
        
        if (amount1 < 0) {
            poolManager.sync(key.currency1);
            IERC20Minimal(Currency.unwrap(key.currency1)).transfer(
                address(poolManager),
                uint128(-amount1)
            );
            poolManager.settle();
        }
        
        // Positive delta = pool owes us tokens
        if (amount0 > 0) {
            poolManager.take(key.currency0, address(this), uint128(amount0));
        }
        
        if (amount1 > 0) {
            poolManager.take(key.currency1, address(this), uint128(amount1));
        }
        
        return abi.encode(delta);
    }
}
