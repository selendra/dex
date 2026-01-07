const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("============================================================");
  console.log("Deploying DEX Core Contracts to SELENDRA NETWORK");
  console.log("============================================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`\nDeploying with account: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${hre.ethers.formatEther(balance)} SEL\n`);

  if (balance === 0n) {
    console.error("ERROR: Account has no balance!");
    process.exit(1);
  }

  const deployedContracts = {};

  // 1. Deploy PoolManager
  console.log("➤ Deploying PoolManager...");
  try {
    const PoolManager = await hre.ethers.getContractFactory("PoolManager");
    const poolManager = await PoolManager.deploy(deployer.address); // Pass owner address
    await poolManager.waitForDeployment();
    const poolManagerAddress = await poolManager.getAddress();
    console.log(`  ✓ PoolManager deployed: ${poolManagerAddress}`);
    deployedContracts.PoolManager = poolManagerAddress;
  } catch (error) {
    console.error("  ✗ PoolManager failed:", error.message);
    process.exit(1);
  }

  // 2. Deploy StateView
  console.log("\n➤ Deploying StateView...");
  try {
    const StateView = await hre.ethers.getContractFactory("StateView");
    const stateView = await StateView.deploy(deployedContracts.PoolManager);
    await stateView.waitForDeployment();
    const stateViewAddress = await stateView.getAddress();
    console.log(`  ✓ StateView deployed: ${stateViewAddress}`);
    deployedContracts.StateView = stateViewAddress;
  } catch (error) {
    console.error("  ✗ StateView failed:", error.message);
    process.exit(1);
  }

  // 3. Deploy SimpleLiquidityManager
  console.log("\n➤ Deploying SimpleLiquidityManager...");
  try {
    const SimpleLiquidityManager = await hre.ethers.getContractFactory("SimpleLiquidityManager");
    const liquidityManager = await SimpleLiquidityManager.deploy(deployedContracts.PoolManager);
    await liquidityManager.waitForDeployment();
    const liquidityManagerAddress = await liquidityManager.getAddress();
    console.log(`  ✓ SimpleLiquidityManager deployed: ${liquidityManagerAddress}`);
    deployedContracts.LiquidityManager = liquidityManagerAddress;
  } catch (error) {
    console.error("  ✗ SimpleLiquidityManager failed:", error.message);
    process.exit(1);
  }

  // 4. Deploy WorkingSwapRouter
  console.log("\n➤ Deploying WorkingSwapRouter...");
  try {
    const WorkingSwapRouter = await hre.ethers.getContractFactory("WorkingSwapRouter");
    const swapRouter = await WorkingSwapRouter.deploy(deployedContracts.PoolManager);
    await swapRouter.waitForDeployment();
    const swapRouterAddress = await swapRouter.getAddress();
    console.log(`  ✓ WorkingSwapRouter deployed: ${swapRouterAddress}`);
    deployedContracts.SwapRouter = swapRouterAddress;
  } catch (error) {
    console.error("  ✗ WorkingSwapRouter failed:", error.message);
    process.exit(1);
  }

  console.log("\n============================================================");
  console.log("DEPLOYMENT COMPLETE - SELENDRA NETWORK");
  console.log("============================================================\n");

  console.log("Deployed Contracts:");
  Object.entries(deployedContracts).forEach(([name, addr]) => {
    console.log(`${name.padEnd(20)}: ${addr}`);
  });

  console.log("\n--- Add to your .env file ---");
  console.log(`# Selendra DEX Contract Addresses`);
  console.log(`SELENDRA_POOL_MANAGER_ADDRESS=${deployedContracts.PoolManager}`);
  console.log(`SELENDRA_STATE_VIEW_ADDRESS=${deployedContracts.StateView}`);
  console.log(`SELENDRA_LIQUIDITY_MANAGER_ADDRESS=${deployedContracts.LiquidityManager}`);
  console.log(`SELENDRA_SWAP_ROUTER_ADDRESS=${deployedContracts.SwapRouter}`);

  // Save to JSON
  const outputPath = path.join(__dirname, "../../selendra-contracts.json");
  fs.writeFileSync(outputPath, JSON.stringify({
    network: "selendra",
    chainId: 1961,
    rpcUrl: "https://rpc.selendra.org",
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: deployedContracts
  }, null, 2));
  console.log(`\n✅ Contract info saved to: selendra-contracts.json`);

  return deployedContracts;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
