/**
 * Deploy All Core Contracts
 * 
 * Deploys all Uniswap V4 core and peripheral contracts in correct order:
 * 1. PoolManager (core)
 * 2. Permit2 (utility)
 * 3. StateView (lens)
 * 4. V4Quoter (lens)
 * 5. PositionDescriptor (peripheral)
 * 6. PositionManager (peripheral)
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-all.js --network localhost
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=".repeat(80));
  console.log("Starting Full Contract Deployment");
  console.log("=".repeat(80));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\nDeploying contracts with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));

  const deployedContracts = {};

  // =========================================================================
  // 1. Deploy PoolManager (Core)
  // =========================================================================
  console.log("\n" + "=".repeat(80));
  console.log("1. Deploying PoolManager...");
  console.log("=".repeat(80));

  const PoolManager = await hre.ethers.getContractFactory("PoolManager");
  const poolManager = await PoolManager.deploy(deployer.address); // initialOwner
  await poolManager.waitForDeployment();
  const poolManagerAddress = await poolManager.getAddress();

  console.log("✅ PoolManager deployed to:", poolManagerAddress);
  console.log("   - Initial Owner:", deployer.address);
  deployedContracts.PoolManager = poolManagerAddress;

  // =========================================================================
  // 2. Deploy Permit2 (Utility)
  // =========================================================================
  console.log("\n" + "=".repeat(80));
  console.log("2. Deploying Permit2...");
  console.log("=".repeat(80));

  const Permit2 = await hre.ethers.getContractFactory("Permit2");
  const permit2 = await Permit2.deploy();
  await permit2.waitForDeployment();
  const permit2Address = await permit2.getAddress();

  console.log("✅ Permit2 deployed to:", permit2Address);
  deployedContracts.Permit2 = permit2Address;

  // =========================================================================
  // 3. Deploy StateView (Lens)
  // =========================================================================
  console.log("\n" + "=".repeat(80));
  console.log("3. Deploying StateView...");
  console.log("=".repeat(80));

  const StateView = await hre.ethers.getContractFactory("StateView");
  const stateView = await StateView.deploy(poolManagerAddress);
  await stateView.waitForDeployment();
  const stateViewAddress = await stateView.getAddress();

  console.log("✅ StateView deployed to:", stateViewAddress);
  console.log("   - PoolManager:", poolManagerAddress);
  deployedContracts.StateView = stateViewAddress;

  // =========================================================================
  // 4. Deploy V4Quoter (Lens)
  // =========================================================================
  console.log("\n" + "=".repeat(80));
  console.log("4. Deploying V4Quoter...");
  console.log("=".repeat(80));

  const V4Quoter = await hre.ethers.getContractFactory("V4Quoter");
  const quoter = await V4Quoter.deploy(poolManagerAddress);
  await quoter.waitForDeployment();
  const quoterAddress = await quoter.getAddress();

  console.log("✅ V4Quoter deployed to:", quoterAddress);
  console.log("   - PoolManager:", poolManagerAddress);
  deployedContracts.V4Quoter = quoterAddress;

  // =========================================================================
  // 5. Deploy WETH9 (Needed for PositionManager)
  // =========================================================================
  console.log("\n" + "=".repeat(80));
  console.log("5. Deploying WETH9...");
  console.log("=".repeat(80));

  // Check if WETH9 contract exists, if not we'll use a mock
  let weth9Address;
  try {
    const WETH9 = await hre.ethers.getContractFactory("WETH9");
    const weth9 = await WETH9.deploy();
    await weth9.waitForDeployment();
    weth9Address = await weth9.getAddress();
    console.log("✅ WETH9 deployed to:", weth9Address);
    deployedContracts.WETH9 = weth9Address;
  } catch (error) {
    console.log("⚠️  WETH9 contract not found, deploying MockWETH...");
    // Deploy a simple mock WETH
    const MockWETH = await hre.ethers.getContractFactory("TestToken");
    const mockWeth = await MockWETH.deploy("Wrapped Ether", "WETH");
    await mockWeth.waitForDeployment();
    weth9Address = await mockWeth.getAddress();
    console.log("✅ MockWETH deployed to:", weth9Address);
    deployedContracts.WETH9 = weth9Address;
  }

  // =========================================================================
  // 6. Deploy PositionDescriptor (Peripheral)
  // =========================================================================
  console.log("\n" + "=".repeat(80));
  console.log("6. Deploying PositionDescriptor...");
  console.log("=".repeat(80));

  // Convert "ETH" to bytes32 for nativeCurrencyLabelBytes
  const nativeCurrencyLabel = "ETH";
  const nativeCurrencyLabelBytes = hre.ethers.encodeBytes32String(nativeCurrencyLabel);

  const PositionDescriptor = await hre.ethers.getContractFactory("PositionDescriptor");
  const positionDescriptor = await PositionDescriptor.deploy(
    poolManagerAddress,
    weth9Address,
    nativeCurrencyLabelBytes
  );
  await positionDescriptor.waitForDeployment();
  const positionDescriptorAddress = await positionDescriptor.getAddress();

  console.log("✅ PositionDescriptor deployed to:", positionDescriptorAddress);
  console.log("   - PoolManager:", poolManagerAddress);
  console.log("   - Wrapped Native:", weth9Address);
  console.log("   - Native Currency Label:", nativeCurrencyLabel);
  deployedContracts.PositionDescriptor = positionDescriptorAddress;

  // =========================================================================
  // 7. Deploy PositionManager (Peripheral)
  // =========================================================================
  console.log("\n" + "=".repeat(80));
  console.log("7. Deploying PositionManager...");
  console.log("=".repeat(80));

  const unsubscribeGasLimit = 300000; // Gas limit for unsubscribe notifications

  const PositionManager = await hre.ethers.getContractFactory("PositionManager");
  const positionManager = await PositionManager.deploy(
    poolManagerAddress,
    permit2Address,
    unsubscribeGasLimit,
    positionDescriptorAddress,
    weth9Address
  );
  await positionManager.waitForDeployment();
  const positionManagerAddress = await positionManager.getAddress();

  console.log("✅ PositionManager deployed to:", positionManagerAddress);
  console.log("   - PoolManager:", poolManagerAddress);
  console.log("   - Permit2:", permit2Address);
  console.log("   - Unsubscribe Gas Limit:", unsubscribeGasLimit);
  console.log("   - Position Descriptor:", positionDescriptorAddress);
  console.log("   - WETH9:", weth9Address);
  deployedContracts.PositionManager = positionManagerAddress;

  // =========================================================================
  // Summary
  // =========================================================================
  console.log("\n" + "=".repeat(80));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(80));
  console.log("\nDeployed Contracts:");
  console.log("-------------------");
  for (const [name, address] of Object.entries(deployedContracts)) {
    console.log(`${name.padEnd(25)} ${address}`);
  }

  // =========================================================================
  // Save deployment info
  // =========================================================================
  const deployment = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: deployedContracts
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = `${hre.network.name}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deployment, null, 2));

  console.log("\n📄 Deployment info saved to:", filepath);

  // Also save as latest
  const latestFilepath = path.join(deploymentsDir, `${hre.network.name}-latest.json`);
  fs.writeFileSync(latestFilepath, JSON.stringify(deployment, null, 2));
  console.log("📄 Latest deployment saved to:", latestFilepath);

  // =========================================================================
  // Generate .env template
  // =========================================================================
  console.log("\n" + "=".repeat(80));
  console.log("Environment Variables Template");
  console.log("=".repeat(80));
  console.log("\n# Add these to your .env file:");
  console.log(`POOL_MANAGER_ADDRESS=${poolManagerAddress}`);
  console.log(`PERMIT2_ADDRESS=${permit2Address}`);
  console.log(`STATE_VIEW_ADDRESS=${stateViewAddress}`);
  console.log(`QUOTER_ADDRESS=${quoterAddress}`);
  console.log(`POSITION_DESCRIPTOR_ADDRESS=${positionDescriptorAddress}`);
  console.log(`POSITION_MANAGER_ADDRESS=${positionManagerAddress}`);
  console.log(`WETH9_ADDRESS=${weth9Address}`);

  console.log("\n" + "=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
