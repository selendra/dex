/**
 * ABI definitions for DEX contracts
 */

export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function mint(address to, uint256 amount)',
  'function burn(uint256 amount)',
  'function burnFrom(address account, uint256 amount)',
];

export const POOL_MANAGER_ABI = [
  'function initialize((address,address,uint24,int24,address) key, uint160 sqrtPriceX96) returns (int24)',
  'function protocolFeeController() view returns (address)',
  'function owner() view returns (address)',
  'function protocolFeesAccrued(address token) view returns (uint256)',
  'function setProtocolFeeController(address controller)',
  'function setProtocolFee((address,address,uint24,int24,address) key, uint24 newProtocolFee)',
  'function collectProtocolFees(address recipient, address token, uint256 amount)',
];

export const STATE_VIEW_ABI = [
  'function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)',
  'function getLiquidity(bytes32 poolId) view returns (uint128)',
  'function getPositionInfo(bytes32 poolId, address owner, int24 tickLower, int24 tickUpper, bytes32 salt) view returns (uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128)',
  'function getFeeGrowthInside(bytes32 poolId, int24 tickLower, int24 tickUpper) view returns (uint256 feeGrowthInside0X128, uint256 feeGrowthInside1X128)',
  'function getFeeGrowthGlobals(bytes32 poolId) view returns (uint256 feeGrowthGlobal0, uint256 feeGrowthGlobal1)',
  'function getTickInfo(bytes32 poolId, int24 tick) view returns (uint128 liquidityGross, int128 liquidityNet, uint256 feeGrowthOutside0X128, uint256 feeGrowthOutside1X128)',
];

export const LIQUIDITY_MANAGER_ABI = [
  'function addLiquidity((address,address,uint24,int24,address) key, int24 tickLower, int24 tickUpper, int256 liquidityDelta) returns (int256)',
  'function removeLiquidity((address,address,uint24,int24,address) key, int24 tickLower, int24 tickUpper, uint128 liquidityDelta) returns (int256)',
  'function collectFees((address,address,uint24,int24,address) key, int24 tickLower, int24 tickUpper) returns (uint256, uint256)',
  'function getPosition(address user, (address,address,uint24,int24,address) key, int24 tickLower, int24 tickUpper) view returns (uint128 liquidity, int24 tickLowerRet, int24 tickUpperRet)',
  'function initializePool((address,address,uint24,int24,address) key, uint160 sqrtPriceX96) returns (int24)',
  'function admin() view returns (address)',
  'function setAdmin(address newAdmin)',
  'function authorizedInitializers(address) view returns (bool)',
  'function setAuthorizedInitializer(address account, bool authorized)',
  'event FeesCollected(address indexed user, address token0, address token1, uint256 amount0, uint256 amount1)',
];

export const SWAP_ROUTER_ABI = [
  'function swap((address,address,uint24,int24,address) key, (bool,int256,uint160) params) payable returns (int256)',
  'function admin() view returns (address)',
  'function setAdmin(address newAdmin)',
  'function pause()',
  'function unpause()',
  'function paused() view returns (bool)',
];

export const PRICE_ORACLE_ABI = [
  'function getPrice(address token0, address token1) view returns (uint256 price, uint256 twap, uint256 lastUpdate, bool fromPool, bool isStale)',
  'function getPoolPrice(address token0, address token1) view returns (uint256 price, uint160 sqrtPriceX96)',
  'function getExternalPrice(address token0, address token1) view returns (uint256 price, uint256 timestamp, bool isValid)',
  'function getTWAP(address token0, address token1) view returns (uint256)',
  'function feedPrice(address token0, address token1, uint256 price)',
  'function feedPricesBatch(address[] token0s, address[] token1s, uint256[] prices)',
  'function observePoolPrice(address token0, address token1)',
  'function getObservationCount(address token0, address token1) view returns (uint256)',
  'function admin() view returns (address)',
  'function setAdmin(address newAdmin)',
  'function authorizedFeeders(address) view returns (bool)',
  'function setAuthorizedFeeder(address account, bool authorized)',
  'function defaultFee() view returns (uint24)',
  'function defaultTickSpacing() view returns (int24)',
  'function MAX_PRICE_AGE() view returns (uint256)',
  'function TWAP_WINDOW() view returns (uint256)',
  'function setDefaultFee(uint24 fee)',
  'function setDefaultTickSpacing(int24 tickSpacing)',
  'function invalidatePrice(address token0, address token1)',
];
