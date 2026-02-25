const hre = require("hardhat");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("       DEBUG: CONTRACT VERSION CHECK");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}\n`);

  // Contract addresses from env
  const LIQUIDITY_MANAGER = process.env.SELENDRA_LIQUIDITY_MANAGER_ADDRESS;
  const TUSD = process.env.SELENDRA_TUSD_ADDRESS;
  const TBROWN = process.env.SELENDRA_TBROWN_ADDRESS;

  console.log(`LiquidityManager: ${LIQUIDITY_MANAGER}\n`);

  // Try basic function calls to see what works
  const lm = await hre.ethers.getContractAt("LiquidityManager", LIQUIDITY_MANAGER);

  // Test simple functions
  console.log("Testing basic LiquidityManager functions...");
  
  try {
    const poolManager = await lm.poolManager();
    console.log(`  ✓ poolManager(): ${poolManager}`);
  } catch (e) {
    console.log(`  ✗ poolManager() failed: ${e.message}`);
  }

  try {
    const admin = await lm.admin();
    console.log(`  ✓ admin(): ${admin}`);
  } catch (e) {
    console.log(`  ✗ admin() failed: ${e.message}`);
  }

  try {
    const isAuth = await lm.authorizedInitializers(deployer.address);
    console.log(`  ✓ authorizedInitializers(): ${isAuth}`);
  } catch (e) {
    console.log(`  ✗ authorizedInitializers() failed: ${e.message}`);
  }

  // Try to get bytecode size of deployed contract
  const code = await hre.ethers.provider.getCode(LIQUIDITY_MANAGER);
  console.log(`\nDeployed contract code size: ${code.length / 2 - 1} bytes\n`);

  // Let's try to see what functions exist by analyzing the ABI
  console.log("Checking function selectors...");
  
  const iface = lm.interface;
  console.log("Functions in local ABI:");
  
  for (const [name, fragment] of Object.entries(iface.functions || {})) {
    const selector = iface.getFunction(name)?.selector;
    console.log(`  ${name}: ${selector}`);
  }

  // Let me try a direct low-level call to getPosition
  console.log("\nTrying direct low-level call to positions mapping...");
  
  // Build the pool key
  const FEE = 3000;
  const TICK_SPACING = 1;
  const HOOKS = hre.ethers.ZeroAddress;
  
  // Sort tokens
  const [currency0, currency1] = TUSD.toLowerCase() < TBROWN.toLowerCase() 
    ? [TUSD, TBROWN] 
    : [TBROWN, TUSD];
  
  console.log(`  currency0: ${currency0}`);
  console.log(`  currency1: ${currency1}`);
  
  const poolKey = {
    currency0,
    currency1,
    fee: FEE,
    tickSpacing: TICK_SPACING,
    hooks: HOOKS
  };
  
  const tickLower = -887220;
  const tickUpper = 887220;
  
  // Try getPosition with explicit gas limit
  try {
    const position = await lm.getPosition.staticCall(
      deployer.address,
      poolKey,
      tickLower,
      tickUpper,
      { gasLimit: 1000000 }
    );
    console.log("\n✓ getPosition succeeded!");
    console.log(`  liquidity: ${position.liquidity}`);
    console.log(`  tickLower: ${position.tickLower}`);
    console.log(`  tickUpper: ${position.tickUpper}`);
  } catch (e) {
    console.log(`\n✗ getPosition failed: ${e.message}`);
    
    // Let's try reading the positions mapping directly
    console.log("\nTrying to access positions mapping directly...");
    
    // The mapping is: mapping(address => mapping(PoolId => mapping(bytes32 => Position)))
    // We need to compute the PoolId and posKey
    
    // PoolId = keccak256(abi.encode(poolKey))
    const poolIdData = hre.ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint24", "int24", "address"],
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
    );
    const poolId = hre.ethers.keccak256(poolIdData);
    console.log(`  Computed PoolId: ${poolId}`);
    
    // posKey = keccak256(abi.encodePacked(tickLower, tickUpper))
    const posKeyData = hre.ethers.solidityPacked(
      ["int24", "int24"],
      [tickLower, tickUpper]
    );
    const posKey = hre.ethers.keccak256(posKeyData);
    console.log(`  Computed posKey: ${posKey}`);
  }

  // Check the init-selendra-pools defaults
  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("Old Pool Configuration (from init-selendra-pools.js):");
  console.log("  FEE: 3000");
  console.log("  TICK_SPACING: 60 (not 1!)");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  // Try with tick spacing 60 (from the old config)
  const OLD_TICK_SPACING = 60;
  const oldPoolKey = {
    currency0,
    currency1,
    fee: FEE,
    tickSpacing: OLD_TICK_SPACING,
    hooks: HOOKS
  };
  
  // Aligned ticks for tick spacing 60
  const oldTickLower = Math.ceil(-887220 / OLD_TICK_SPACING) * OLD_TICK_SPACING; // -887220
  const oldTickUpper = Math.floor(887220 / OLD_TICK_SPACING) * OLD_TICK_SPACING; // 887220

  console.log("Testing with OLD tick spacing 60:");
  console.log(`  tickLower: ${oldTickLower}`);
  console.log(`  tickUpper: ${oldTickUpper}`);

  try {
    const isInit = await lm.isPoolInitialized(oldPoolKey);
    console.log(`  Pool (TICK_SPACING=60) initialized: ${isInit}`);
  } catch (e) {
    console.log(`  Error: ${e.message}`);
  }

  console.log("\nTesting with NEW tick spacing 1:");
  try {
    const isInit = await lm.isPoolInitialized(poolKey);
    console.log(`  Pool (TICK_SPACING=1) initialized: ${isInit}`);
  } catch (e) {
    console.log(`  Error: ${e.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
