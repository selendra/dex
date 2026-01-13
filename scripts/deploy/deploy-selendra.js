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

  // 3. Deploy LiquidityManager
  console.log("\n➤ Deploying LiquidityManager...");
  try {
    const LiquidityManager = await hre.ethers.getContractFactory("LiquidityManager");
    const liquidityManager = await LiquidityManager.deploy(deployedContracts.PoolManager);
    await liquidityManager.waitForDeployment();
    const liquidityManagerAddress = await liquidityManager.getAddress();
    console.log(`  ✓ LiquidityManager deployed: ${liquidityManagerAddress}`);
    deployedContracts.LiquidityManager = liquidityManagerAddress;
  } catch (error) {
    console.error("  ✗ LiquidityManager failed:", error.message);
    process.exit(1);
  }

  // 4. Deploy SwapRouter
  console.log("\n➤ Deploying SwapRouter...");
  try {
    const SwapRouter = await hre.ethers.getContractFactory("SwapRouter");
    const swapRouter = await SwapRouter.deploy(deployedContracts.PoolManager);
    await swapRouter.waitForDeployment();
    const swapRouterAddress = await swapRouter.getAddress();
    console.log(`  ✓ SwapRouter deployed: ${swapRouterAddress}`);
    deployedContracts.SwapRouter = swapRouterAddress;
  } catch (error) {
    console.error("  ✗ SwapRouter failed:", error.message);
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
