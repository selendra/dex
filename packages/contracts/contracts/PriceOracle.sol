// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IPoolManager} from "./core/interfaces/IPoolManager.sol";
import {PoolKey} from "./core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "./core/types/PoolId.sol";
import {Currency} from "./core/types/Currency.sol";
import {IHooks} from "./core/interfaces/IHooks.sol";

/// @title PriceOracle - Price Feed Oracle for DEX Token Pairs
/// @notice Provides price feeds for token pairs from both on-chain pools and admin-fed external prices
/// @dev Supports TWAP calculation and external price feeds for pairs without pools
contract PriceOracle {
    using PoolIdLibrary for PoolKey;

    // ========== Constants ==========
    
    /// @notice Q96 constant for sqrtPriceX96 calculations (2^96)
    uint256 private constant Q96 = 0x1000000000000000000000000;
    
    /// @notice Pools slot in PoolManager storage
    bytes32 private constant POOLS_SLOT = bytes32(uint256(6));
    
    /// @notice 10^36 for price inversion calculations
    uint256 private constant PRICE_PRECISION_SQUARED = 1000000000000000000000000000000000000;
    
    /// @notice 10^18 for price precision
    uint256 private constant PRICE_PRECISION = 1000000000000000000;
    
    /// @notice Maximum age for a price observation to be considered valid (1 hour)
    uint256 public constant MAX_PRICE_AGE = 1 hours;
    
    /// @notice TWAP window duration
    uint256 public constant TWAP_WINDOW = 30 minutes;

    // ========== State Variables ==========
    
    IPoolManager public immutable poolManager;
    
    /// @notice Admin address - can feed prices
    address public admin;
    
    /// @notice Mapping of authorized price feeders
    mapping(address => bool) public authorizedFeeders;
    
    /// @notice External price feed data for token pairs (token0 => token1 => PriceData)
    mapping(address => mapping(address => PriceData)) public externalPrices;
    
    /// @notice Price observations for TWAP calculation
    mapping(bytes32 => PriceObservation[]) public priceObservations;
    
    /// @notice Default fee tier for pool lookups
    uint24 public defaultFee = 3000; // 0.3%
    
    /// @notice Default tick spacing
    int24 public defaultTickSpacing = 1;

    // ========== Structs ==========
    
    struct PriceData {
        uint256 price;          // Price in 18 decimal precision (token1 per token0)
        uint256 timestamp;      // When the price was updated
        bool isValid;           // Whether this price feed is active
    }
    
    struct PriceObservation {
        uint256 price;          // Price at observation time
        uint256 timestamp;      // Observation timestamp
        uint160 sqrtPriceX96;   // Raw sqrtPriceX96 from pool
    }
    
    struct PriceInfo {
        uint256 price;          // Current price (18 decimals)
        uint256 twap;           // Time-weighted average price (18 decimals)
        uint256 lastUpdate;     // Last update timestamp
        bool fromPool;          // True if price is from on-chain pool
        bool isStale;           // True if price is older than MAX_PRICE_AGE
    }

    // ========== Events ==========
    
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event FeederAuthorized(address indexed account, bool authorized);
    event PriceUpdated(address indexed token0, address indexed token1, uint256 price, uint256 timestamp);
    event PriceObserved(bytes32 indexed pairHash, uint256 price, uint256 timestamp);
    event DefaultFeeChanged(uint24 oldFee, uint24 newFee);

    // ========== Errors ==========
    
    error NotAdmin();
    error NotAuthorized();
    error InvalidPrice();
    error InvalidTokenPair();
    error PriceNotAvailable();
    error StalePrice();

    // ========== Modifiers ==========
    
    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyAuthorized() {
        if (msg.sender != admin && !authorizedFeeders[msg.sender]) revert NotAuthorized();
        _;
    }

    // ========== Constructor ==========
    
    constructor(IPoolManager _poolManager) {
        poolManager = _poolManager;
        admin = msg.sender;
        authorizedFeeders[msg.sender] = true;
    }

    // ========== Admin Functions ==========
    
    /// @notice Change admin address
    /// @param newAdmin New admin address
    function setAdmin(address newAdmin) external onlyAdmin {
        address oldAdmin = admin;
        admin = newAdmin;
        emit AdminChanged(oldAdmin, newAdmin);
    }

    /// @notice Authorize or revoke a price feeder
    /// @param account Address to authorize/revoke
    /// @param authorized True to authorize, false to revoke
    function setAuthorizedFeeder(address account, bool authorized) external onlyAdmin {
        authorizedFeeders[account] = authorized;
        emit FeederAuthorized(account, authorized);
    }

    /// @notice Set default fee tier for pool lookups
    /// @param newFee New default fee (in basis points * 100, e.g., 3000 = 0.3%)
    function setDefaultFee(uint24 newFee) external onlyAdmin {
        uint24 oldFee = defaultFee;
        defaultFee = newFee;
        emit DefaultFeeChanged(oldFee, newFee);
    }

    /// @notice Set default tick spacing
    /// @param newTickSpacing New default tick spacing
    function setDefaultTickSpacing(int24 newTickSpacing) external onlyAdmin {
        defaultTickSpacing = newTickSpacing;
    }

    // ========== Price Feed Functions ==========
    
    /// @notice Feed external price for a token pair
    /// @param token0 First token address
    /// @param token1 Second token address  
    /// @param price Price of token0 in terms of token1 (18 decimal precision)
    function feedPrice(address token0, address token1, uint256 price) external onlyAuthorized {
        if (token0 == address(0) || token1 == address(0) || token0 == token1) revert InvalidTokenPair();
        if (price == 0) revert InvalidPrice();
        
        // Sort tokens to ensure consistent storage
        (address sortedToken0, address sortedToken1, uint256 sortedPrice) = _sortTokensWithPrice(token0, token1, price);
        
        externalPrices[sortedToken0][sortedToken1] = PriceData({
            price: sortedPrice,
            timestamp: block.timestamp,
            isValid: true
        });
        
        // Record observation for TWAP
        bytes32 pairHash = _getPairHash(sortedToken0, sortedToken1);
        _recordObservation(pairHash, sortedPrice, 0);
        
        emit PriceUpdated(sortedToken0, sortedToken1, sortedPrice, block.timestamp);
    }

    /// @notice Feed multiple prices at once
    /// @param token0s Array of first token addresses
    /// @param token1s Array of second token addresses
    /// @param prices Array of prices
    function feedPricesBatch(
        address[] calldata token0s,
        address[] calldata token1s,
        uint256[] calldata prices
    ) external onlyAuthorized {
        require(token0s.length == token1s.length && token1s.length == prices.length, "Array length mismatch");
        
        for (uint256 i = 0; i < token0s.length; i++) {
            if (token0s[i] == address(0) || token1s[i] == address(0) || token0s[i] == token1s[i]) continue;
            if (prices[i] == 0) continue;
            
            (address sortedToken0, address sortedToken1, uint256 sortedPrice) = _sortTokensWithPrice(token0s[i], token1s[i], prices[i]);
            
            externalPrices[sortedToken0][sortedToken1] = PriceData({
                price: sortedPrice,
                timestamp: block.timestamp,
                isValid: true
            });
            
            bytes32 pairHash = _getPairHash(sortedToken0, sortedToken1);
            _recordObservation(pairHash, sortedPrice, 0);
            
            emit PriceUpdated(sortedToken0, sortedToken1, sortedPrice, block.timestamp);
        }
    }

    /// @notice Invalidate an external price feed
    /// @param token0 First token address
    /// @param token1 Second token address
    function invalidatePrice(address token0, address token1) external onlyAuthorized {
        (address sortedToken0, address sortedToken1) = _sortTokens(token0, token1);
        externalPrices[sortedToken0][sortedToken1].isValid = false;
    }

    // ========== Price Query Functions ==========
    
    /// @notice Get price for a token pair (tries pool first, then external feed)
    /// @param token0 First token address
    /// @param token1 Second token address
    /// @return info Complete price information
    function getPrice(address token0, address token1) external view returns (PriceInfo memory info) {
        (address sortedToken0, address sortedToken1) = _sortTokens(token0, token1);
        bool needsInvert = token0 != sortedToken0;
        
        // Try to get price from on-chain pool first
        (bool poolExists, uint256 poolPrice, ) = _getPoolPrice(sortedToken0, sortedToken1);
        
        if (poolExists && poolPrice > 0) {
            uint256 finalPrice = needsInvert ? _invertPrice(poolPrice) : poolPrice;
            bytes32 pairHash = _getPairHash(sortedToken0, sortedToken1);
            uint256 twap = _calculateTWAP(pairHash);
            
            info = PriceInfo({
                price: finalPrice,
                twap: needsInvert && twap > 0 ? _invertPrice(twap) : twap,
                lastUpdate: block.timestamp,
                fromPool: true,
                isStale: false
            });
        } else {
            // Fall back to external price feed
            PriceData memory data = externalPrices[sortedToken0][sortedToken1];
            
            if (!data.isValid || data.price == 0) revert PriceNotAvailable();
            
            uint256 finalPrice = needsInvert ? _invertPrice(data.price) : data.price;
            bytes32 pairHash = _getPairHash(sortedToken0, sortedToken1);
            uint256 twap = _calculateTWAP(pairHash);
            bool isStale = block.timestamp - data.timestamp > MAX_PRICE_AGE;
            
            info = PriceInfo({
                price: finalPrice,
                twap: needsInvert && twap > 0 ? _invertPrice(twap) : twap,
                lastUpdate: data.timestamp,
                fromPool: false,
                isStale: isStale
            });
        }
    }

    /// @notice Get price from on-chain pool only
    /// @param token0 First token address
    /// @param token1 Second token address
    /// @return price Price in 18 decimal precision
    /// @return sqrtPriceX96 Raw sqrtPriceX96 from pool
    function getPoolPrice(address token0, address token1) external view returns (uint256 price, uint160 sqrtPriceX96) {
        (address sortedToken0, address sortedToken1) = _sortTokens(token0, token1);
        bool needsInvert = token0 != sortedToken0;
        
        (bool exists, uint256 poolPrice, uint160 sqrtPrice) = _getPoolPrice(sortedToken0, sortedToken1);
        if (!exists) revert PriceNotAvailable();
        
        price = needsInvert ? _invertPrice(poolPrice) : poolPrice;
        sqrtPriceX96 = sqrtPrice;
    }

    /// @notice Get external price feed only
    /// @param token0 First token address
    /// @param token1 Second token address
    /// @return data Price data struct
    function getExternalPrice(address token0, address token1) external view returns (PriceData memory data) {
        (address sortedToken0, address sortedToken1) = _sortTokens(token0, token1);
        bool needsInvert = token0 != sortedToken0;
        
        data = externalPrices[sortedToken0][sortedToken1];
        
        if (needsInvert && data.price > 0) {
            data.price = _invertPrice(data.price);
        }
    }

    /// @notice Get TWAP for a token pair
    /// @param token0 First token address
    /// @param token1 Second token address
    /// @return twap Time-weighted average price (18 decimals)
    function getTWAP(address token0, address token1) external view returns (uint256 twap) {
        (address sortedToken0, address sortedToken1) = _sortTokens(token0, token1);
        bool needsInvert = token0 != sortedToken0;
        
        bytes32 pairHash = _getPairHash(sortedToken0, sortedToken1);
        twap = _calculateTWAP(pairHash);
        
        if (needsInvert && twap > 0) {
            twap = _invertPrice(twap);
        }
    }

    /// @notice Get latest price observation count
    /// @param token0 First token address
    /// @param token1 Second token address
    /// @return count Number of observations
    function getObservationCount(address token0, address token1) external view returns (uint256 count) {
        (address sortedToken0, address sortedToken1) = _sortTokens(token0, token1);
        bytes32 pairHash = _getPairHash(sortedToken0, sortedToken1);
        return priceObservations[pairHash].length;
    }

    // ========== Pool Price Observation ==========
    
    /// @notice Record current pool price (can be called by anyone to update TWAP)
    /// @param token0 First token address
    /// @param token1 Second token address
    function observePoolPrice(address token0, address token1) external {
        (address sortedToken0, address sortedToken1) = _sortTokens(token0, token1);
        
        (bool exists, uint256 price, uint160 sqrtPrice) = _getPoolPrice(sortedToken0, sortedToken1);
        if (!exists) revert PriceNotAvailable();
        
        bytes32 pairHash = _getPairHash(sortedToken0, sortedToken1);
        _recordObservation(pairHash, price, sqrtPrice);
        
        emit PriceObserved(pairHash, price, block.timestamp);
    }

    // ========== Internal Functions ==========
    
    function _getPoolPrice(address token0, address token1) internal view returns (bool exists, uint256 price, uint160 sqrtPriceX96) {
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: defaultFee,
            tickSpacing: defaultTickSpacing,
            hooks: IHooks(address(0))
        });
        
        PoolId poolId = key.toId();
        
        // Read slot0 directly using extsload (sqrtPriceX96 is in the first 160 bits)
        bytes32 stateSlot = _getPoolStateSlot(poolId);
        bytes32 data = poolManager.extsload(stateSlot);
        
        // Extract sqrtPriceX96 from bottom 160 bits
        uint160 sqrtPrice;
        assembly ("memory-safe") {
            sqrtPrice := and(data, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
        }
        
        if (sqrtPrice == 0) {
            return (false, 0, 0);
        }
        
        // Convert sqrtPriceX96 to price with 18 decimals
        price = _sqrtPriceX96ToPrice(sqrtPrice);
        return (true, price, sqrtPrice);
    }

    function _getPoolStateSlot(PoolId poolId) internal pure returns (bytes32) {
        return keccak256(abi.encode(poolId, POOLS_SLOT));
    }

    function _sqrtPriceX96ToPrice(uint160 sqrtPriceX96) internal pure returns (uint256) {
        // Convert sqrtPriceX96 to price
        // sqrtPriceX96 = sqrt(price) * 2^96
        // price = (sqrtPriceX96 / 2^96)^2
        // To get 18 decimals: price * 10^18
        
        uint256 sqrtPrice = uint256(sqrtPriceX96);
        // price = sqrtPrice^2 / 2^192 * 10^18
        // = sqrtPrice^2 * 10^18 / 2^192
        
        // To avoid overflow, we compute in parts
        // sqrtPrice^2 / 2^96 / 2^96 * 10^18
        uint256 priceX192 = sqrtPrice * sqrtPrice;
        uint256 price = (priceX192 * PRICE_PRECISION) / Q96 / Q96;
        
        return price;
    }

    function _invertPrice(uint256 price) internal pure returns (uint256) {
        if (price == 0) return 0;
        return PRICE_PRECISION_SQUARED / price;
    }

    function _sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    }

    function _sortTokensWithPrice(address tokenA, address tokenB, uint256 price) 
        internal pure returns (address token0, address token1, uint256 sortedPrice) 
    {
        if (tokenA < tokenB) {
            return (tokenA, tokenB, price);
        } else {
            return (tokenB, tokenA, _invertPrice(price));
        }
    }

    function _getPairHash(address token0, address token1) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(token0, token1));
    }

    function _recordObservation(bytes32 pairHash, uint256 price, uint160 sqrtPriceX96) internal {
        PriceObservation[] storage observations = priceObservations[pairHash];
        
        // Limit observations to prevent unbounded growth (keep last 100)
        if (observations.length >= 100) {
            // Shift array - remove oldest observations
            for (uint256 i = 0; i < 99; i++) {
                observations[i] = observations[i + 1];
            }
            observations.pop();
        }
        
        observations.push(PriceObservation({
            price: price,
            timestamp: block.timestamp,
            sqrtPriceX96: sqrtPriceX96
        }));
    }

    function _calculateTWAP(bytes32 pairHash) internal view returns (uint256) {
        PriceObservation[] storage observations = priceObservations[pairHash];
        
        if (observations.length == 0) return 0;
        if (observations.length == 1) return observations[0].price;
        
        uint256 twapStart = block.timestamp > TWAP_WINDOW ? block.timestamp - TWAP_WINDOW : 0;
        
        uint256 weightedSum = 0;
        uint256 totalWeight = 0;
        
        for (uint256 i = 0; i < observations.length; i++) {
            if (observations[i].timestamp >= twapStart) {
                // Weight by time since observation (more recent = higher weight)
                uint256 timeSinceObs = block.timestamp - observations[i].timestamp;
                uint256 weight = TWAP_WINDOW > timeSinceObs ? TWAP_WINDOW - timeSinceObs : 1;
                
                weightedSum += observations[i].price * weight;
                totalWeight += weight;
            }
        }
        
        if (totalWeight == 0) {
            // No observations in TWAP window, return latest
            return observations[observations.length - 1].price;
        }
        
        return weightedSum / totalWeight;
    }
}
