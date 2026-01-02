const hre = require("hardhat");

async function main() {
  console.log("=".repeat(60));
  console.log("Deploying DEX Core Contracts");
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\nDeploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));

  // Deploy PoolManager
  console.log("\n➤ Deploying PoolManager...");
  const PoolManager = await hre.ethers.getContractFactory("PoolManager");
  const poolManager = await PoolManager.deploy(deployer.address);
  await poolManager.waitForDeployment();
  const poolManagerAddress = await poolManager.getAddress();
  console.log("  ✓ PoolManager deployed:", poolManagerAddress);

  // Deploy StateView
  console.log("\n➤ Deploying StateView...");
  const StateView = await hre.ethers.getContractFactory("StateView");
  const stateView = await StateView.deploy(poolManagerAddress);
  await stateView.waitForDeployment();
  const stateViewAddress = await stateView.getAddress();
  console.log("  ✓ StateView deployed:", stateViewAddress);

  // Deploy SimpleLiquidityManager
  console.log("\n➤ Deploying SimpleLiquidityManager...");
  const SimpleLiquidityManager = await hre.ethers.getContractFactory("SimpleLiquidityManager");
  const liquidityManager = await SimpleLiquidityManager.deploy(poolManagerAddress);
  await liquidityManager.waitForDeployment();
  const liquidityManagerAddress = await liquidityManager.getAddress();
  console.log("  ✓ SimpleLiquidityManager deployed:", liquidityManagerAddress);

  // Deploy WorkingSwapRouter
  console.log("\n➤ Deploying WorkingSwapRouter...");
  const WorkingSwapRouter = await hre.ethers.getContractFactory("WorkingSwapRouter");
  const swapRouter = await WorkingSwapRouter.deploy(poolManagerAddress);
  await swapRouter.waitForDeployment();
  const swapRouterAddress = await swapRouter.getAddress();
  console.log("  ✓ WorkingSwapRouter deployed:", swapRouterAddress);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("\nAdd to your .env file:");
  console.log(`POOL_MANAGER_ADDRESS=${poolManagerAddress}`);
  console.log(`STATE_VIEW_ADDRESS=${stateViewAddress}`);
  console.log(`LIQUIDITY_ROUTER_ADDRESS=${liquidityManagerAddress}`);
  console.log(`SWAP_ROUTER_ADDRESS=${swapRouterAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
