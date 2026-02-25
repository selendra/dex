const hre = require("hardhat");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });

// Pool configuration constants  
const FEE = 3000; // 0.3%
const TICK_SPACING = 1;
const HOOKS_ADDRESS = hre.ethers.ZeroAddress;
const MIN_TICK = -887220;
const MAX_TICK = 887220;

// Sort tokens by address
function sortTokens(tokenA, tokenB) {
  const addrA = tokenA.toLowerCase();
  const addrB = tokenB.toLowerCase();
  return addrA < addrB ? [tokenA, tokenB] : [tokenB, tokenA];
}

// Create pool key
function createPoolKey(token0, token1) {
  const [currency0, currency1] = sortTokens(token0, token1);
  return {
    currency0,
    currency1,
    fee: FEE,
    tickSpacing: TICK_SPACING,
    hooks: HOOKS_ADDRESS
  };
}

// Get full-range tick bounds aligned to tick spacing
function getFullRangeTicks(tickSpacing) {
  const tickLower = Math.ceil(MIN_TICK / tickSpacing) * tickSpacing;
  const tickUpper = Math.floor(MAX_TICK / tickSpacing) * tickSpacing;
  return { tickLower, tickUpper };
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("       DEBUG: POSITION STATE CHECK");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}\n`);

  // Contract addresses from env
  const LIQUIDITY_MANAGER = process.env.SELENDRA_LIQUIDITY_MANAGER_ADDRESS;
  const TUSD = process.env.SELENDRA_TUSD_ADDRESS;
  const TBROWN = process.env.SELENDRA_TBROWN_ADDRESS;

  console.log(`LiquidityManager: ${LIQUIDITY_MANAGER}`);
  console.log(`TUSD: ${TUSD}`);
  console.log(`TBROWN: ${TBROWN}\n`);

  const liquidityManager = await hre.ethers.getContractAt("LiquidityManager", LIQUIDITY_MANAGER);

  const poolKey = createPoolKey(TUSD, TBROWN);
  const { tickLower, tickUpper } = getFullRangeTicks(TICK_SPACING);

  console.log("Pool Key:");
  console.log(`  currency0: ${poolKey.currency0}`);
  console.log(`  currency1: ${poolKey.currency1}`);
  console.log(`  fee: ${poolKey.fee}`);
  console.log(`  tickSpacing: ${poolKey.tickSpacing}`);
  console.log(`  hooks: ${poolKey.hooks}\n`);

  console.log("Tick Range:");
  console.log(`  tickLower: ${tickLower}`);
  console.log(`  tickUpper: ${tickUpper}\n`);

  // Check position
  try {
    const position = await liquidityManager.getPosition(
      deployer.address,
      poolKey,
      tickLower,
      tickUpper
    );
    
    console.log("Position State:");
    console.log(`  liquidity: ${position.liquidity.toString()}`);
    console.log(`  tickLower: ${position.tickLower}`);
    console.log(`  tickUpper: ${position.tickUpper}\n`);

    if (position.liquidity > 0n) {
      console.log("✅ Position exists with liquidity!");
      
      // Try to collect fees
      console.log("\nAttempting to collect fees...");
      try {
        const tx = await liquidityManager.collectFees(poolKey, tickLower, tickUpper);
        const receipt = await tx.wait();
        console.log(`✅ Fees collected successfully (gas: ${receipt.gasUsed})`);
      } catch (error) {
        console.log(`❌ Collect fees failed: ${error.message}`);
        
        // Try with different approach - check if it's a reentry issue
        console.log("\nChecking if contract has tokens...");
        const erc20Abi = ["function balanceOf(address) view returns (uint256)"];
        const tusd = new hre.ethers.Contract(TUSD, erc20Abi, deployer);
        const tbrown = new hre.ethers.Contract(TBROWN, erc20Abi, deployer);
        
        const lmTusd = await tusd.balanceOf(LIQUIDITY_MANAGER);
        const lmTbrown = await tbrown.balanceOf(LIQUIDITY_MANAGER);
        
        console.log(`  LiquidityManager TUSD: ${hre.ethers.formatEther(lmTusd)}`);
        console.log(`  LiquidityManager TBROWN: ${hre.ethers.formatEther(lmTbrown)}`);
      }
      
      // Try to remove small amount of liquidity
      console.log("\nAttempting to remove liquidity (small amount)...");
      const removeAmount = hre.ethers.parseEther("10");
      try {
        const tx = await liquidityManager.removeLiquidity(poolKey, tickLower, tickUpper, removeAmount);
        const receipt = await tx.wait();
        console.log(`✅ Liquidity removed successfully (gas: ${receipt.gasUsed})`);
      } catch (error) {
        console.log(`❌ Remove liquidity failed: ${error.message}`);
      }
      
    } else {
      console.log("❌ Position has no liquidity!");
      console.log("\nThis could mean:");
      console.log("  1. Liquidity was never successfully added");
      console.log("  2. Position key mismatch (different ticks or parameters)");
      console.log("  3. Position already fully removed");
    }
  } catch (error) {
    console.log(`Error checking position: ${error.message}`);
  }

  // Also check pool initialization status
  try {
    const isInit = await liquidityManager.isPoolInitialized(poolKey);
    console.log(`\nPool Initialized: ${isInit}`);
  } catch (error) {
    console.log(`Error checking pool init: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
