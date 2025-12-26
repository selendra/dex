/**
 * Deploy Test Routers
 * 
 * Deploys PoolModifyLiquidityTest and PoolSwapTest contracts
 * These are needed for the pure ethers.js examples
 * 
 * Run: npx hardhat run scripts/deploy-test-routers.js --network localhost
 */

const hre = require("hardhat");

async function main() {
  console.log("=".repeat(60));
  console.log("Deploying Test Routers");
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\nDeploying with account:", deployer.address);

  // Get PoolManager address
  const poolManagerAddress = process.env.POOL_MANAGER_ADDRESS ||
    "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";

  console.log("PoolManager:", poolManagerAddress);

  // ============================================================================
  // Deploy SimpleLiquidityManager (for adding liquidity)
  // ============================================================================
  console.log("\n" + "-".repeat(60));
  console.log("1. Deploying SimpleLiquidityManager (LiquidityRouter)...");
  console.log("-".repeat(60));

  const SimpleLiquidityManager = await hre.ethers.getContractFactory("SimpleLiquidityManager");
  const liquidityRouter = await SimpleLiquidityManager.deploy(poolManagerAddress);
  await liquidityRouter.waitForDeployment();
  const liquidityRouterAddress = await liquidityRouter.getAddress();

  console.log("✅ SimpleLiquidityManager deployed to:", liquidityRouterAddress);

  // ============================================================================
  // Deploy WorkingSwapRouter (for swapping)
  // ============================================================================
  console.log("\n" + "-".repeat(60));
  console.log("2. Deploying WorkingSwapRouter (SwapRouter)...");
  console.log("-".repeat(60));

  const WorkingSwapRouter = await hre.ethers.getContractFactory("WorkingSwapRouter");
  const swapRouter = await WorkingSwapRouter.deploy(poolManagerAddress);
  await swapRouter.waitForDeployment();
  const swapRouterAddress = await swapRouter.getAddress();

  console.log("✅ WorkingSwapRouter deployed to:", swapRouterAddress);

  // ============================================================================
  // Summary
  // ============================================================================
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));

  console.log("\nDeployed Contracts:");
  console.log("LiquidityRouter (SimpleLiquidityManager):", liquidityRouterAddress);
  console.log("SwapRouter (WorkingSwapRouter):", swapRouterAddress);

  console.log("\n📝 Add to your .env file:");
  console.log(`LIQUIDITY_ROUTER_ADDRESS=${liquidityRouterAddress}`);
  console.log(`SWAP_ROUTER_ADDRESS=${swapRouterAddress}`);

  console.log("\n🚀 Now you can run:");
  console.log("  node ethers-examples/05-add-liquidity.js");
  console.log("  node ethers-examples/06-swap.js");

  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

module.exports = main;
