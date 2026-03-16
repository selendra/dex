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

  // Deploy LiquidityManager
  console.log("\n➤ Deploying LiquidityManager...");
  const LiquidityManager = await hre.ethers.getContractFactory("LiquidityManager");
  const liquidityManager = await LiquidityManager.deploy(poolManagerAddress);
  await liquidityManager.waitForDeployment();
  const liquidityManagerAddress = await liquidityManager.getAddress();
  console.log("  ✓ LiquidityManager deployed:", liquidityManagerAddress);

  // Deploy OracleRegistry
  console.log("\n➤ Deploying OracleRegistry...");
  const OracleRegistry = await hre.ethers.getContractFactory("OracleRegistry");
  const oracleRegistry = await OracleRegistry.deploy(deployer.address);
  await oracleRegistry.waitForDeployment();
  const oracleRegistryAddress = await oracleRegistry.getAddress();
  console.log("  ✓ OracleRegistry deployed:", oracleRegistryAddress);

  // Deploy PriceOracle
  console.log("\n➤ Deploying PriceOracle...");
  const PriceOracle = await hre.ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy(poolManagerAddress);
  await priceOracle.waitForDeployment();
  const priceOracleAddress = await priceOracle.getAddress();
  console.log("  ✓ PriceOracle deployed:", priceOracleAddress);

  // Register PriceOracle with OracleRegistry
  console.log("\n➤ Registering PriceOracle in OracleRegistry...");
  const registerTx = await oracleRegistry.registerOracle(priceOracleAddress);
  await registerTx.wait();
  console.log("  ✓ PriceOracle registered as active oracle");

  // Deploy SwapRouter (now requires OracleRegistry address)
  console.log("\n➤ Deploying SwapRouter...");
  const SwapRouter = await hre.ethers.getContractFactory("SwapRouter");
  const swapRouter = await SwapRouter.deploy(poolManagerAddress, oracleRegistryAddress);
  await swapRouter.waitForDeployment();
  const swapRouterAddress = await swapRouter.getAddress();
  console.log("  ✓ SwapRouter deployed:", swapRouterAddress);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("\nAdd to your .env file:");
  console.log(`POOL_MANAGER_ADDRESS=${poolManagerAddress}`);
  console.log(`STATE_VIEW_ADDRESS=${stateViewAddress}`);
  console.log(`LIQUIDITY_ROUTER_ADDRESS=${liquidityManagerAddress}`);
  console.log(`ORACLE_REGISTRY_ADDRESS=${oracleRegistryAddress}`);
  console.log(`PRICE_ORACLE_ADDRESS=${priceOracleAddress}`);
  console.log(`SWAP_ROUTER_ADDRESS=${swapRouterAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
