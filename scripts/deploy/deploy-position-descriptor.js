/**
 * Deploy PositionDescriptor
 * 
 * PositionDescriptor generates token URIs and metadata for NFT positions.
 * It provides visual and textual descriptions of liquidity positions.
 * 
 * Constructor Parameters:
 * - poolManager: Address of the deployed PoolManager contract
 * - wrappedNative: Address of WETH9 or wrapped native token
 * - nativeCurrencyLabelBytes: bytes32 representation of native currency label (e.g., "ETH")
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-position-descriptor.js --network localhost
 */

const hre = require("hardhat");

async function main() {
  console.log("=".repeat(60));
  console.log("Deploying PositionDescriptor Contract");
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\nDeploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));

  // Get PoolManager address
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
      // Fallback to TestToken as mock WETH
      console.log("Using TestToken as MockWETH...");
      const TestToken = await hre.ethers.getContractFactory("TestToken");
      const mockWeth = await TestToken.deploy("Wrapped Ether", "WETH");
      await mockWeth.waitForDeployment();
      weth9Address = await mockWeth.getAddress();
      console.log("✅ MockWETH deployed to:", weth9Address);
    }
  }

  // Set native currency label
  const nativeCurrencyLabel = process.env.NATIVE_CURRENCY_LABEL || "ETH";
  const nativeCurrencyLabelBytes = hre.ethers.encodeBytes32String(nativeCurrencyLabel);

  // Deploy PositionDescriptor
  console.log("\nDeploying PositionDescriptor...");
  console.log("Parameters:");
  console.log("  - PoolManager:", poolManagerAddress);
  console.log("  - Wrapped Native:", weth9Address);
  console.log("  - Native Label:", nativeCurrencyLabel);

  const PositionDescriptor = await hre.ethers.getContractFactory("PositionDescriptor");
  
  const positionDescriptor = await PositionDescriptor.deploy(
    poolManagerAddress,
    weth9Address,
    nativeCurrencyLabelBytes
  );
  await positionDescriptor.waitForDeployment();
  
  const address = await positionDescriptor.getAddress();
  
  console.log("\n✅ PositionDescriptor deployed successfully!");
  console.log("=".repeat(60));
  console.log("Contract Address:", address);
  console.log("PoolManager:", poolManagerAddress);
  console.log("Wrapped Native:", weth9Address);
  console.log("Native Currency:", nativeCurrencyLabel);
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
  console.log("\nTesting PositionDescriptor...");
  const descriptorContract = await hre.ethers.getContractAt("PositionDescriptor", address);
  const connectedPoolManager = await descriptorContract.poolManager();
  console.log("Connected PoolManager:", connectedPoolManager);
  
  const labelString = await descriptorContract.nativeCurrencyLabel();
  console.log("Native Currency Label:", labelString);
  
  if (connectedPoolManager.toLowerCase() !== poolManagerAddress.toLowerCase()) {
    console.log("⚠️  Warning: PoolManager address mismatch!");
  } else {
    console.log("✅ PoolManager connection verified");
  }

  // Save deployment info
  console.log("\n📝 Deployment Summary:");
  console.log("Add these to your .env file:");
  console.log(`POSITION_DESCRIPTOR_ADDRESS=${address}`);
  console.log(`WETH9_ADDRESS=${weth9Address}`);

  return {
    address,
    poolManagerAddress,
    weth9Address,
    nativeCurrencyLabel,
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
