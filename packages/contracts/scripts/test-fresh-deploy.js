const hre = require("hardhat");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });

// Contract ABIs
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

// Pool configuration constants
const FEE = 3000; // 0.3%
const TICK_SPACING = 1;
const HOOKS_ADDRESS = hre.ethers.ZeroAddress;
const SQRT_PRICE_1_1 = "79228162514264337593543950336"; // 1:1 price
const MIN_TICK = -887220;
const MAX_TICK = 887220;

// Test results tracker
const testResults = {
  passed: [],
  failed: []
};

async function logTest(name, success, message = "") {
  if (success) {
    console.log(`  ✅ ${name}`);
    testResults.passed.push(name);
  } else {
    console.log(`  ❌ ${name}: ${message}`);
    testResults.failed.push({ name, message });
  }
}

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

// Get full-range tick bounds
function getFullRangeTicks(tickSpacing) {
  const tickLower = Math.ceil(MIN_TICK / tickSpacing) * tickSpacing;
  const tickUpper = Math.floor(MAX_TICK / tickSpacing) * tickSpacing;
  return { tickLower, tickUpper };
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("   FRESH DEX DEPLOYMENT & COMPLETE TEST SUITE - SELENDRA TESTNET");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} SEL\n`);

  if (balance === 0n) {
    console.error("ERROR: Account has no balance!");
    process.exit(1);
  }

  const contracts = {};
  const tokens = {};

  // ═══════════════════════════════════════════════════════════════════
  // Deploy or get existing tokens
  // ═══════════════════════════════════════════════════════════════════
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("USING EXISTING TOKENS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  tokens.TUSD = process.env.SELENDRA_TUSD_ADDRESS;
  tokens.TBROWN = process.env.SELENDRA_TBROWN_ADDRESS;
  tokens.TSMART = process.env.SELENDRA_TSMART_ADDRESS;
  tokens.TZANDO = process.env.SELENDRA_TZANDO_ADDRESS;

  for (const [symbol, addr] of Object.entries(tokens)) {
    const token = new hre.ethers.Contract(addr, ERC20_ABI, deployer);
    const bal = await token.balanceOf(deployer.address);
    console.log(`  ${symbol}: ${addr} (balance: ${hre.ethers.formatEther(bal)})`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Deploy FRESH PoolManager
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("DEPLOYING FRESH CONTRACTS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // 1. Deploy PoolManager
  console.log("  Deploying PoolManager...");
  const PoolManager = await hre.ethers.getContractFactory("PoolManager");
  const poolManager = await PoolManager.deploy(deployer.address);
  await poolManager.waitForDeployment();
  contracts.PoolManager = await poolManager.getAddress();
  console.log(`  ✓ PoolManager: ${contracts.PoolManager}`);

  // 2. Deploy StateView
  console.log("  Deploying StateView...");
  const StateView = await hre.ethers.getContractFactory("StateView");
  const stateView = await StateView.deploy(contracts.PoolManager);
  await stateView.waitForDeployment();
  contracts.StateView = await stateView.getAddress();
  console.log(`  ✓ StateView: ${contracts.StateView}`);

  // 3. Deploy LiquidityManager
  console.log("  Deploying LiquidityManager...");
  const LiquidityManager = await hre.ethers.getContractFactory("LiquidityManager");
  const liquidityManager = await LiquidityManager.deploy(contracts.PoolManager);
  await liquidityManager.waitForDeployment();
  contracts.LiquidityManager = await liquidityManager.getAddress();
  console.log(`  ✓ LiquidityManager: ${contracts.LiquidityManager}`);

  // 4. Deploy SwapRouter
  console.log("  Deploying SwapRouter...");
  const SwapRouter = await hre.ethers.getContractFactory("SwapRouter");
  const swapRouter = await SwapRouter.deploy(contracts.PoolManager);
  await swapRouter.waitForDeployment();
  contracts.SwapRouter = await swapRouter.getAddress();
  console.log(`  ✓ SwapRouter: ${contracts.SwapRouter}`);

  // 5. Deploy PriceOracle
  console.log("  Deploying PriceOracle...");
  const PriceOracle = await hre.ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy(contracts.PoolManager);
  await priceOracle.waitForDeployment();
  contracts.PriceOracle = await priceOracle.getAddress();
  console.log(`  ✓ PriceOracle: ${contracts.PriceOracle}`);

  await logTest("Deploy all contracts", true);

  // ═══════════════════════════════════════════════════════════════════
  // Configure Oracle
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("CONFIGURING ORACLE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Set TUSD as stablecoin
  console.log("  Setting TUSD as stablecoin...");
  let tx = await priceOracle.setStablecoin(tokens.TUSD, true);
  await tx.wait();
  await logTest("Set TUSD as stablecoin", await priceOracle.stablecoins(tokens.TUSD));

  // Feed prices for stablecoin pairs
  const priceFeeds = [
    { token0: "TUSD", token1: "TBROWN", price: hre.ethers.parseEther("10") },
    { token0: "TUSD", token1: "TSMART", price: hre.ethers.parseEther("5") },
    { token0: "TUSD", token1: "TZANDO", price: hre.ethers.parseEther("2") },
  ];

  for (const feed of priceFeeds) {
    console.log(`  Feeding price: ${feed.token0}/${feed.token1}...`);
    tx = await priceOracle.feedPrice(tokens[feed.token0], tokens[feed.token1], feed.price);
    await tx.wait();
    await logTest(`Feed price ${feed.token0}/${feed.token1}`, true);
  }

  // Test oracle price query
  console.log("\n  Testing oracle getPrice...");
  const priceInfo = await priceOracle.getPrice(tokens.TUSD, tokens.TBROWN);
  console.log(`    TUSD/TBROWN Price: ${hre.ethers.formatEther(priceInfo.price)}`);
  await logTest("Oracle getPrice", priceInfo.price > 0n);

  // ═══════════════════════════════════════════════════════════════════
  // Initialize Pool
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("INITIALIZING POOL");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const poolKey = createPoolKey(tokens.TUSD, tokens.TBROWN);
  const { tickLower, tickUpper } = getFullRangeTicks(TICK_SPACING);

  console.log("  Pool Key:");
  console.log(`    currency0: ${poolKey.currency0}`);
  console.log(`    currency1: ${poolKey.currency1}`);
  console.log(`    fee: ${poolKey.fee}`);
  console.log(`    tickSpacing: ${poolKey.tickSpacing}`);

  console.log(`  Tick Range: [${tickLower}, ${tickUpper}]`);

  console.log("\n  Initializing TUSD/TBROWN pool...");
  tx = await liquidityManager.initializePool(poolKey, SQRT_PRICE_1_1);
  await tx.wait();
  await logTest("Initialize pool", await liquidityManager.isPoolInitialized(poolKey));

  // ═══════════════════════════════════════════════════════════════════
  // Add Liquidity
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("ADDING LIQUIDITY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const LIQUIDITY_AMOUNT = hre.ethers.parseEther("1000");
  const tusd = new hre.ethers.Contract(tokens.TUSD, ERC20_ABI, deployer);
  const tbrown = new hre.ethers.Contract(tokens.TBROWN, ERC20_ABI, deployer);

  // Transfer tokens to LiquidityManager
  console.log("  Transferring tokens to LiquidityManager...");
  tx = await tusd.transfer(contracts.LiquidityManager, LIQUIDITY_AMOUNT);
  await tx.wait();
  tx = await tbrown.transfer(contracts.LiquidityManager, LIQUIDITY_AMOUNT);
  await tx.wait();

  // Add liquidity
  console.log("  Adding liquidity...");
  tx = await liquidityManager.addLiquidity(poolKey, tickLower, tickUpper, LIQUIDITY_AMOUNT);
  const addLiqReceipt = await tx.wait();
  console.log(`  ✓ Liquidity added (gas: ${addLiqReceipt.gasUsed})`);
  await logTest("Add liquidity", true);

  // Verify position
  console.log("\n  Checking position...");
  const position = await liquidityManager.getPosition(deployer.address, poolKey, tickLower, tickUpper);
  console.log(`    Liquidity in position: ${position.liquidity.toString()}`);
  await logTest("Position tracked", position.liquidity > 0n);

  // ═══════════════════════════════════════════════════════════════════
  // Test Swap
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TESTING SWAP");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const SWAP_AMOUNT = hre.ethers.parseEther("10");
  const MIN_SQRT_RATIO = 4295128740n;
  const MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342n;

  const [sortedToken0] = sortTokens(tokens.TUSD, tokens.TBROWN);
  const zeroForOne = sortedToken0.toLowerCase() === tokens.TUSD.toLowerCase();

  console.log(`  Swap direction: ${zeroForOne ? "TUSD->TBROWN" : "TBROWN->TUSD"}`);

  // Get balances before
  const tusdBefore = await tusd.balanceOf(deployer.address);
  const tbrownBefore = await tbrown.balanceOf(deployer.address);

  // Approve tokens for swap router
  console.log("  Approving tokens...");
  tx = await tusd.approve(contracts.SwapRouter, SWAP_AMOUNT);
  await tx.wait();

  // Execute swap
  console.log("  Executing swap...");
  const swapParams = {
    zeroForOne: zeroForOne,
    amountSpecified: -SWAP_AMOUNT,
    sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_RATIO + 1n : MAX_SQRT_RATIO - 1n
  };

  tx = await swapRouter.swap(poolKey, swapParams);
  const swapReceipt = await tx.wait();

  // Get balances after
  const tusdAfter = await tusd.balanceOf(deployer.address);
  const tbrownAfter = await tbrown.balanceOf(deployer.address);

  console.log(`    TUSD: ${hre.ethers.formatEther(tusdBefore)} -> ${hre.ethers.formatEther(tusdAfter)}`);
  console.log(`    TBROWN: ${hre.ethers.formatEther(tbrownBefore)} -> ${hre.ethers.formatEther(tbrownAfter)}`);
  console.log(`  ✓ Swap completed (gas: ${swapReceipt.gasUsed})`);
  await logTest("Swap TUSD->TBROWN", tusdAfter < tusdBefore || tbrownAfter > tbrownBefore);

  // ═══════════════════════════════════════════════════════════════════
  // Test Oracle Pool Price
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TESTING ORACLE POOL PRICE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    const [poolPrice, sqrtPriceX96] = await priceOracle.getPoolPrice(tokens.TUSD, tokens.TBROWN);
    console.log(`  Pool Price: ${hre.ethers.formatEther(poolPrice)}`);
    console.log(`  sqrtPriceX96: ${sqrtPriceX96.toString()}`);
    await logTest("Oracle getPoolPrice", poolPrice > 0n);
  } catch (e) {
    await logTest("Oracle getPoolPrice", false, e.message);
  }

  // Observe pool price
  console.log("\n  Observing pool price for TWAP...");
  tx = await priceOracle.observePoolPrice(tokens.TUSD, tokens.TBROWN);
  await tx.wait();
  await logTest("Oracle observePoolPrice", true);

  // Get TWAP
  const twap = await priceOracle.getTWAP(tokens.TUSD, tokens.TBROWN);
  console.log(`  TWAP: ${hre.ethers.formatEther(twap)}`);
  await logTest("Oracle getTWAP", true);

  // ═══════════════════════════════════════════════════════════════════
  // Collect Fees
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("COLLECTING FEES");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    const tusdBeforeFee = await tusd.balanceOf(deployer.address);
    const tbrownBeforeFee = await tbrown.balanceOf(deployer.address);

    console.log("  Collecting fees...");
    tx = await liquidityManager.collectFees(poolKey, tickLower, tickUpper);
    const feeReceipt = await tx.wait();

    const tusdAfterFee = await tusd.balanceOf(deployer.address);
    const tbrownAfterFee = await tbrown.balanceOf(deployer.address);

    const feesCollected0 = tusdAfterFee - tusdBeforeFee;
    const feesCollected1 = tbrownAfterFee - tbrownBeforeFee;

    console.log(`  TUSD fees: ${hre.ethers.formatEther(feesCollected0)}`);
    console.log(`  TBROWN fees: ${hre.ethers.formatEther(feesCollected1)}`);
    console.log(`  ✓ Fees collected (gas: ${feeReceipt.gasUsed})`);
    await logTest("Collect fees", true);
  } catch (e) {
    console.log(`  ✗ Collect fees failed: ${e.message}`);
    await logTest("Collect fees", false, e.message);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Remove Liquidity
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("REMOVING LIQUIDITY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    const positionBefore = await liquidityManager.getPosition(deployer.address, poolKey, tickLower, tickUpper);
    const REMOVE_AMOUNT = positionBefore.liquidity / 2n; // Remove half
    
    const tusdBeforeRemove = await tusd.balanceOf(deployer.address);
    const tbrownBeforeRemove = await tbrown.balanceOf(deployer.address);

    console.log(`  Removing ${hre.ethers.formatEther(REMOVE_AMOUNT)} liquidity...`);
    tx = await liquidityManager.removeLiquidity(poolKey, tickLower, tickUpper, REMOVE_AMOUNT);
    const removeReceipt = await tx.wait();

    const tusdAfterRemove = await tusd.balanceOf(deployer.address);
    const tbrownAfterRemove = await tbrown.balanceOf(deployer.address);

    console.log(`  TUSD received: ${hre.ethers.formatEther(tusdAfterRemove - tusdBeforeRemove)}`);
    console.log(`  TBROWN received: ${hre.ethers.formatEther(tbrownAfterRemove - tbrownBeforeRemove)}`);
    console.log(`  ✓ Liquidity removed (gas: ${removeReceipt.gasUsed})`);
    
    const positionAfter = await liquidityManager.getPosition(deployer.address, poolKey, tickLower, tickUpper);
    console.log(`  Remaining liquidity: ${positionAfter.liquidity.toString()}`);
    
    await logTest("Remove liquidity", positionAfter.liquidity < positionBefore.liquidity);
  } catch (e) {
    console.log(`  ✗ Remove liquidity failed: ${e.message}`);
    await logTest("Remove liquidity", false, e.message);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Final Summary
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("                        TEST SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  console.log("DEPLOYED CONTRACTS:");
  Object.entries(contracts).forEach(([name, addr]) => {
    console.log(`  ${name.padEnd(20)}: ${addr}`);
  });

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`TESTS PASSED: ${testResults.passed.length}`);
  testResults.passed.forEach(name => console.log(`  ✅ ${name}`));
  
  console.log(`\nTESTS FAILED: ${testResults.failed.length}`);
  testResults.failed.forEach(({ name, message }) => console.log(`  ❌ ${name}: ${message}`));
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Output for .env update
  console.log("--- Update .env with these addresses ---");
  console.log("# NEW Selendra DEX Contract Addresses");
  console.log(`SELENDRA_POOL_MANAGER_ADDRESS=${contracts.PoolManager}`);
  console.log(`SELENDRA_STATE_VIEW_ADDRESS=${contracts.StateView}`);
  console.log(`SELENDRA_LIQUIDITY_MANAGER_ADDRESS=${contracts.LiquidityManager}`);
  console.log(`SELENDRA_SWAP_ROUTER_ADDRESS=${contracts.SwapRouter}`);
  console.log(`SELENDRA_PRICE_ORACLE_ADDRESS=${contracts.PriceOracle}`);

  return { contracts, testResults };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
