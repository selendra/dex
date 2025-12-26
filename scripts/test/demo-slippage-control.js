const { ethers } = require('ethers');
const config = require('../api/test-config.json');

const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
const signer = new ethers.Wallet(
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  provider
);

const POOL_MANAGER_ABI = [
  "function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
  "function getLiquidity(bytes32 poolId) external view returns (uint128)"
];

const SWAP_ROUTER_ABI = [
  "function swap(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, address payer) external returns (int256, int256)"
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function decimals() view returns (uint8)"
];

function getPoolId(poolKey) {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['address', 'address', 'uint24', 'int24', 'address'],
    [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
  );
  return ethers.keccak256(encoded);
}

async function demonstrateSlippageControl() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     Slippage Control in Uniswap V4 - Demonstration     ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Use example values
  const currentPrice = 1.0; // 1:1 price
  const currentTick = 0;
  const liquidity = ethers.parseEther('10000');

  console.log('📊 Example Pool State:');
  console.log(`   Price: ${currentPrice.toFixed(6)}`);
  console.log(`   Tick: ${currentTick}`);
  console.log(`   Liquidity: ${ethers.formatEther(liquidity)} tokens\n`);

  // Swap parameters
  const swapAmount = ethers.parseEther('10');
  const zeroForOne = true; // Token A -> Token B

  console.log('💱 Swap Configuration:');
  console.log(`   Amount In: ${ethers.formatEther(swapAmount)} Token A`);
  console.log(`   Direction: Token A → Token B\n`);

  // Different slippage tolerances
  const slippageTests = [
    { name: 'NO SLIPPAGE PROTECTION', tolerance: 100 },
    { name: 'HIGH SLIPPAGE (5%)', tolerance: 5 },
    { name: 'MEDIUM SLIPPAGE (1%)', tolerance: 1 },
    { name: 'LOW SLIPPAGE (0.5%)', tolerance: 0.5 }
  ];

  console.log('═══════════════════════════════════════════════════════\n');

  for (const test of slippageTests) {
    console.log(`\n🔍 Test: ${test.name}`);
    console.log(`   Slippage Tolerance: ${test.tolerance}%`);

    // Calculate expected output (simplified - assumes current price)
    const expectedOut = BigInt(Math.floor(Number(swapAmount) * currentPrice));
    const minAmountOut = expectedOut * BigInt(Math.floor((100 - test.tolerance) * 100)) / 10000n;

    console.log(`   Expected Output: ~${ethers.formatEther(expectedOut)} Token B`);
    console.log(`   Minimum Output: ${ethers.formatEther(minAmountOut)} Token B`);

    // Calculate sqrtPriceLimitX96 based on slippage
    // For stable swaps, use tight price limits
    const priceLimit = currentPrice * (1 - test.tolerance / 100);
    const sqrtPriceLimit = BigInt(Math.floor(Math.sqrt(priceLimit) * 2**96));

    console.log(`   Price Limit: ${priceLimit.toFixed(6)}`);
    console.log(`   sqrtPriceLimitX96: ${sqrtPriceLimit.toString()}\n`);

    // Note: This is for demonstration only
    // Actual execution would require proper setup
    console.log('   ⚠️  This is a demonstration - not executing actual swap\n');
  }

  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📌 KEY TAKEAWAYS:');
  console.log('   ✓ tickLower/tickUpper are for LIQUIDITY PROVISION');
  console.log('   ✓ Slippage in swaps controlled by:');
  console.log('     - minAmountOut (minimum tokens received)');
  console.log('     - sqrtPriceLimitX96 (price limit)');
  console.log('   ✓ For stable swaps:');
  console.log('     - Add concentrated liquidity (tight tick ranges)');
  console.log('     - Use tight price limits (low sqrtPriceLimitX96)');
  console.log('     - Set strict minAmountOut\n');

  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📚 TICK RANGES FOR LIQUIDITY (Examples):');
  console.log('   Full Range: tickLower=-887220, tickUpper=887220');
  console.log('   Tight Range (stable): tickLower=-600, tickUpper=600');
  console.log('   Current Tick Range: tickLower=-1200, tickUpper=1200');
  console.log('   ⚠️  Ticks must be multiples of tickSpacing (60 for 0.3% fee)\n');

  console.log('❌ INVALID EXAMPLES:');
  console.log('   ✗ tickLower=0, tickUpper=0 (equal ticks not allowed)');
  console.log('   ✗ tickLower=5, tickUpper=10 (not multiples of 60)');
  console.log('   ✗ tickLower=120, tickUpper=-120 (tickLower >= tickUpper)\n');
}

demonstrateSlippageControl()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
