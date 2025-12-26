/**
 * Deploy V4Quoter
 * 
 * V4Quoter provides offchain quote functionality for swaps.
 * It simulates swaps and returns expected output amounts without executing them.
 * 
 * Constructor Parameters:
 * - poolManager: Address of the deployed PoolManager contract
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-quoter.js --network localhost
 */

const hre = require("hardhat");

async function main() {
  console.log("=".repeat(60));
  console.log("Deploying V4Quoter Contract");
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\nDeploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));

  // Get PoolManager address from environment or prompt
  let poolManagerAddress = process.env.POOL_MANAGER_ADDRESS;
  
  if (!poolManagerAddress) {
    console.log("\n⚠️  POOL_MANAGER_ADDRESS not found in environment");
    console.log("Please provide PoolManager address:");
    
    // For automated deployment, you might want to deploy PoolManager first
    console.log("Deploying PoolManager first...");
    const PoolManager = await hre.ethers.getContractFactory("PoolManager");
    const poolManager = await PoolManager.deploy(deployer.address);
    await poolManager.waitForDeployment();
    poolManagerAddress = await poolManager.getAddress();
    console.log("✅ PoolManager deployed to:", poolManagerAddress);
  }

  // Deploy V4Quoter
  console.log("\nDeploying V4Quoter...");
  const V4Quoter = await hre.ethers.getContractFactory("V4Quoter");
  
  const quoter = await V4Quoter.deploy(poolManagerAddress);
  await quoter.waitForDeployment();
  
  const address = await quoter.getAddress();
  
  console.log("\n✅ V4Quoter deployed successfully!");
  console.log("=".repeat(60));
  console.log("Contract Address:", address);
  console.log("PoolManager:", poolManagerAddress);
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
  console.log("\nTesting V4Quoter connection...");
  const quoterContract = await hre.ethers.getContractAt("V4Quoter", address);
  const connectedPoolManager = await quoterContract.poolManager();
  console.log("Connected PoolManager:", connectedPoolManager);
  
  if (connectedPoolManager.toLowerCase() !== poolManagerAddress.toLowerCase()) {
    console.log("⚠️  Warning: PoolManager address mismatch!");
  } else {
    console.log("✅ PoolManager connection verified");
  }

  // Save deployment info
  console.log("\n📝 Deployment Summary:");
  console.log("Add this to your .env file:");
  console.log(`QUOTER_ADDRESS=${address}`);

  console.log("\n💡 Note: V4Quoter functions should NOT be called onchain");
  console.log("   They are designed for offchain simulation only");

  return {
    address,
    poolManagerAddress,
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
