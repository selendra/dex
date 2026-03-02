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
    
    /// @notice Temporary storage for callback recipient
    address private _callbackRecipient;
    
    /// @notice Operation types for callback
    enum OperationType { ADD_LIQUIDITY, REMOVE_LIQUIDITY, COLLECT_FEES }
    
    /// @notice LP position info
    struct Position {
        uint128 liquidity;
        int24 tickLower;
        int24 tickUpper;
    }
    
    /// @notice Track LP positions: user => poolId => positionKey => Position
    /// positionKey = keccak256(tickLower, tickUpper)
    mapping(address => mapping(PoolId => mapping(bytes32 => Position))) public positions;

    /// @notice Events
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event InitializerAuthorized(address indexed account, bool authorized);
    event PoolInitialized(PoolId indexed poolId, address indexed initializer);
    event LiquidityAdded(address indexed provider, PoolId indexed poolId, int24 tickLower, int24 tickUpper, uint128 liquidity);
    event LiquidityRemoved(address indexed provider, PoolId indexed poolId, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 amount0, uint256 amount1);
    event FeesCollected(address indexed provider, PoolId indexed poolId, uint256 amount0, uint256 amount1);

    /// @notice Errors
    error NotAdmin();
    error NotAuthorized();
    error PoolAlreadyInitialized();
    error InsufficientLiquidity();
    error NoPosition();

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

    /// @notice Add liquidity to a pool - tokens must be transferred to this contract first
    /// @param key Pool key
    /// @param tickLower Lower tick bound
    /// @param tickUpper Upper tick bound  
    /// @param liquidityDelta Amount of liquidity to add (must be positive)
    /// @return delta Token amounts used
    function addLiquidity(
        PoolKey memory key,
        int24 tickLower,
        int24 tickUpper,
        int256 liquidityDelta
    ) external returns (BalanceDelta delta) {
        require(liquidityDelta > 0, "Use removeLiquidity for negative delta");
        
        _callbackRecipient = msg.sender;
        
        delta = abi.decode(
            poolManager.unlock(abi.encode(OperationType.ADD_LIQUIDITY, msg.sender, key, tickLower, tickUpper, liquidityDelta)),
            (BalanceDelta)
        );
        
        // Update position tracking
        PoolId poolId = key.toId();
        bytes32 posKey = _getPositionKey(tickLower, tickUpper);
        uint128 liquidityAmount = uint128(uint256(liquidityDelta));
        positions[msg.sender][poolId][posKey].liquidity += liquidityAmount;
        positions[msg.sender][poolId][posKey].tickLower = tickLower;
        positions[msg.sender][poolId][posKey].tickUpper = tickUpper;
        
        emit LiquidityAdded(msg.sender, poolId, tickLower, tickUpper, liquidityAmount);
        
        _callbackRecipient = address(0);
    }
    
    /// @notice Remove liquidity from a pool and receive tokens + fees
    /// @param key Pool key
    /// @param tickLower Lower tick bound
    /// @param tickUpper Upper tick bound
    /// @param liquidityDelta Amount of liquidity to remove (positive value)
    /// @return delta Token amounts received (including fees)
    function removeLiquidity(
        PoolKey memory key,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidityDelta
    ) external returns (BalanceDelta delta) {
        PoolId poolId = key.toId();
        bytes32 posKey = _getPositionKey(tickLower, tickUpper);
        Position storage pos = positions[msg.sender][poolId][posKey];
        
        if (pos.liquidity == 0) revert NoPosition();
        if (pos.liquidity < liquidityDelta) revert InsufficientLiquidity();
        
        _callbackRecipient = msg.sender;
        
        delta = abi.decode(
            poolManager.unlock(abi.encode(OperationType.REMOVE_LIQUIDITY, msg.sender, key, tickLower, tickUpper, -int256(uint256(liquidityDelta)))),
            (BalanceDelta)
        );
        
        // Update position tracking
        pos.liquidity -= liquidityDelta;
        
        // delta amounts are positive when we receive tokens
        uint256 received0 = delta.amount0() > 0 ? uint256(uint128(delta.amount0())) : 0;
        uint256 received1 = delta.amount1() > 0 ? uint256(uint128(delta.amount1())) : 0;
        
        emit LiquidityRemoved(msg.sender, poolId, tickLower, tickUpper, liquidityDelta, received0, received1);
        
        _callbackRecipient = address(0);
    }
    
    /// @notice Collect accumulated fees without removing liquidity
    /// @param key Pool key
    /// @param tickLower Lower tick bound
    /// @param tickUpper Upper tick bound
    /// @return amount0 Fees collected in token0
    /// @return amount1 Fees collected in token1
    function collectFees(
        PoolKey memory key,
        int24 tickLower,
        int24 tickUpper
    ) external returns (uint256 amount0, uint256 amount1) {
        PoolId poolId = key.toId();
        bytes32 posKey = _getPositionKey(tickLower, tickUpper);
        Position storage pos = positions[msg.sender][poolId][posKey];
        
        if (pos.liquidity == 0) revert NoPosition();
        
        _callbackRecipient = msg.sender;
        
        // Call with 0 liquidityDelta to collect fees only
        BalanceDelta delta = abi.decode(
            poolManager.unlock(abi.encode(OperationType.COLLECT_FEES, msg.sender, key, tickLower, tickUpper, int256(0))),
            (BalanceDelta)
        );
        
        // delta amounts are positive when we receive tokens (fees)
        amount0 = delta.amount0() > 0 ? uint256(uint128(delta.amount0())) : 0;
        amount1 = delta.amount1() > 0 ? uint256(uint128(delta.amount1())) : 0;
        
        emit FeesCollected(msg.sender, poolId, amount0, amount1);
        
        _callbackRecipient = address(0);
    }
    
    /// @notice Get position info for a user
    /// @param user User address
    /// @param key Pool key
    /// @param tickLower Lower tick
    /// @param tickUpper Upper tick
    /// @return position Position struct
    function getPosition(
        address user,
        PoolKey memory key,
        int24 tickLower,
        int24 tickUpper
    ) external view returns (Position memory position) {
        bytes32 posKey = _getPositionKey(tickLower, tickUpper);
        return positions[user][key.toId()][posKey];
    }
    
    /// @notice Generate position key from tick bounds
    function _getPositionKey(int24 tickLower, int24 tickUpper) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(tickLower, tickUpper));
    }

    /// @notice Unlock callback - handles all liquidity operations
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(poolManager), "Only pool manager");
        
        (, address recipient, PoolKey memory key, int24 tickLower, int24 tickUpper, int256 liquidityDelta) =
            abi.decode(data, (OperationType, address, PoolKey, int24, int24, int256));
        
        ModifyLiquidityParams memory params = ModifyLiquidityParams({
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidityDelta: liquidityDelta,
            salt: bytes32(uint256(uint160(recipient))) // Use recipient as salt for position tracking
        });
        
        // Modify liquidity (add, remove, or collect fees)
        (BalanceDelta delta,) = poolManager.modifyLiquidity(key, params, "");
        
        // Settle using CurrencySettler pattern
        int128 amount0 = delta.amount0();
        int128 amount1 = delta.amount1();
        
        // Negative delta = we owe tokens to pool (adding liquidity)
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
        
        // Positive delta = pool owes us tokens (removing liquidity or collecting fees)
        // Send directly to the recipient (LP)
        if (amount0 > 0) {
            poolManager.take(key.currency0, recipient, uint128(amount0));
        }
        
        if (amount1 > 0) {
            poolManager.take(key.currency1, recipient, uint128(amount1));
        }
        
        return abi.encode(delta);
    }
}
