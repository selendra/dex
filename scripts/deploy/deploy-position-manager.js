/**
 * Deploy PositionManager
 * 
 * PositionManager is the main peripheral contract for managing NFT-based liquidity positions.
 * It handles minting, burning, modifying positions, and integrates with Permit2.
 * 
 * Constructor Parameters:
 * - poolManager: Address of the deployed PoolManager contract
 * - permit2: Address of the deployed Permit2 contract
 * - unsubscribeGasLimit: Gas limit for unsubscribe notifications (typically 300000)
 * - tokenDescriptor: Address of the deployed PositionDescriptor contract
 * - weth9: Address of WETH9 or wrapped native token
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-position-manager.js --network localhost
 */

const hre = require("hardhat");

async function main() {
  console.log("=".repeat(60));
  console.log("Deploying PositionManager Contract");
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\nDeploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));

  // Get or deploy PoolManager
  let poolManagerAddress = process.env.POOL_MANAGER_ADDRESS;
  
  if (!poolManagerAddress) {
    console.log("\n⚠️  POOL_MANAGER_ADDRESS not found in environment");
    console.log("Deploying PoolManager first...");
    const PoolManager = await hre.ethers.getContractFactory("PoolManager");
    const poolManager = await PoolManager.deploy(deployer.address);
    await poolManager.waitForDeployment();
    poolManagerAddress = await poolManager.getAddress();
    console.log("✅ PoolManager deployed to:", poolManagerAddress);
  }

  // Get or deploy Permit2
  let permit2Address = process.env.PERMIT2_ADDRESS;
  
  if (!permit2Address) {
    console.log("\n⚠️  PERMIT2_ADDRESS not found in environment");
    console.log("Deploying Permit2 first...");
    const Permit2 = await hre.ethers.getContractFactory("Permit2");
    const permit2 = await Permit2.deploy();
    await permit2.waitForDeployment();
    permit2Address = await permit2.getAddress();
    console.log("✅ Permit2 deployed to:", permit2Address);
  }

  // Get or deploy WETH9
  let weth9Address = process.env.WETH9_ADDRESS;
  
  if (!weth9Address) {
    console.log("\n⚠️  WETH9_ADDRESS not found in environment");
    console.log("Deploying MockWETH...");
    
    try {
      const WETH9 = await hre.ethers.getContractFactory("WETH9");
      const weth9 = await WETH9.deploy();
      await weth9.waitForDeployment();
      weth9Address = await weth9.getAddress();
      console.log("✅ WETH9 deployed to:", weth9Address);
    } catch (error) {
      const TestToken = await hre.ethers.getContractFactory("TestToken");
      const mockWeth = await TestToken.deploy("Wrapped Ether", "WETH");
      await mockWeth.waitForDeployment();
      weth9Address = await mockWeth.getAddress();
      console.log("✅ MockWETH deployed to:", weth9Address);
    }
  }

  // Get or deploy PositionDescriptor
  let positionDescriptorAddress = process.env.POSITION_DESCRIPTOR_ADDRESS;
  
  if (!positionDescriptorAddress) {
    console.log("\n⚠️  POSITION_DESCRIPTOR_ADDRESS not found in environment");
    console.log("Deploying PositionDescriptor first...");
    
    const nativeCurrencyLabel = "ETH";
    const nativeCurrencyLabelBytes = hre.ethers.encodeBytes32String(nativeCurrencyLabel);
    
    const PositionDescriptor = await hre.ethers.getContractFactory("PositionDescriptor");
    const positionDescriptor = await PositionDescriptor.deploy(
      poolManagerAddress,
      weth9Address,
      nativeCurrencyLabelBytes
    );
    await positionDescriptor.waitForDeployment();
    positionDescriptorAddress = await positionDescriptor.getAddress();
    console.log("✅ PositionDescriptor deployed to:", positionDescriptorAddress);
  }

  // Set unsubscribe gas limit
  const unsubscribeGasLimit = process.env.UNSUBSCRIBE_GAS_LIMIT || 300000;

  // Deploy PositionManager
  console.log("\nDeploying PositionManager...");
  console.log("Parameters:");
  console.log("  - PoolManager:", poolManagerAddress);
  console.log("  - Permit2:", permit2Address);
  console.log("  - Unsubscribe Gas Limit:", unsubscribeGasLimit);
  console.log("  - Position Descriptor:", positionDescriptorAddress);
  console.log("  - WETH9:", weth9Address);

  const PositionManager = await hre.ethers.getContractFactory("PositionManager");
  
  const positionManager = await PositionManager.deploy(
    poolManagerAddress,
    permit2Address,
    unsubscribeGasLimit,
    positionDescriptorAddress,
    weth9Address
  );
  await positionManager.waitForDeployment();
  
  const address = await positionManager.getAddress();
  
  console.log("\n✅ PositionManager deployed successfully!");
  console.log("=".repeat(60));
  console.log("Contract Address:", address);
  console.log("PoolManager:", poolManagerAddress);
  console.log("Permit2:", permit2Address);
  console.log("Unsubscribe Gas Limit:", unsubscribeGasLimit);
  console.log("Position Descriptor:", positionDescriptorAddress);
  console.log("WETH9:", weth9Address);
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", (await hre.ethers.provider.getNetwork()).chainId.toString());
  console.log("=".repeat(60));

  // Verify deployment
  console.log("\nVerifying deployment...");
  const code = await hre.ethers.provider.getCode(address);
  if (code === "0x") {
    console.log("❌ Deployment failed: No code at address");
    process.exit(1);
  }
  console.log("✅ Contract code verified at address");

  // Test basic functionality
  console.log("\nTesting PositionManager...");
  const positionManagerContract = await hre.ethers.getContractAt("PositionManager", address);
  const connectedPoolManager = await positionManagerContract.poolManager();
  console.log("Connected PoolManager:", connectedPoolManager);
  
  if (connectedPoolManager.toLowerCase() !== poolManagerAddress.toLowerCase()) {
    console.log("⚠️  Warning: PoolManager address mismatch!");
  } else {
    console.log("✅ PoolManager connection verified");
  }

  // Check NFT metadata
  console.log("\nChecking NFT metadata...");
  const name = await positionManagerContract.name();
  const symbol = await positionManagerContract.symbol();
  console.log("NFT Name:", name);
  console.log("NFT Symbol:", symbol);

  // Save deployment info
  console.log("\n📝 Deployment Summary:");
  console.log("Add these to your .env file:");
  console.log(`POSITION_MANAGER_ADDRESS=${address}`);
  console.log(`POOL_MANAGER_ADDRESS=${poolManagerAddress}`);
  console.log(`PERMIT2_ADDRESS=${permit2Address}`);
  console.log(`POSITION_DESCRIPTOR_ADDRESS=${positionDescriptorAddress}`);
  console.log(`WETH9_ADDRESS=${weth9Address}`);

  console.log("\n💡 Next Steps:");
  console.log("1. Users should approve tokens to PositionManager");
  console.log("2. Users should approve Permit2 for signature-based transfers");
  console.log("3. Initialize pools using the PoolManager");

  return {
    address,
    poolManagerAddress,
    permit2Address,
    unsubscribeGasLimit,
    positionDescriptorAddress,
    weth9Address,
    deployer: deployer.address
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

module.exports = main;
