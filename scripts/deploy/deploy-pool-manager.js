/**
 * Deploy PoolManager
 * 
 * PoolManager is the core contract that manages all pools in Uniswap V4.
 * It handles swaps, liquidity management, and pool state.
 * 
 * Constructor Parameters:
 * - initialOwner: Address that will own the PoolManager and control protocol fees
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-pool-manager.js --network localhost
 */

const hre = require("hardhat");

async function main() {
  console.log("=".repeat(60));
  console.log("Deploying PoolManager Contract");
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\nDeploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));

  // Deploy PoolManager
  console.log("\nDeploying PoolManager...");
  const PoolManager = await hre.ethers.getContractFactory("PoolManager");
  
  // Constructor parameter: initialOwner (address)
  // This address will own the contract and have control over protocol fees
  const initialOwner = deployer.address;
  
  const poolManager = await PoolManager.deploy(initialOwner);
  await poolManager.waitForDeployment();
  
  const address = await poolManager.getAddress();
  
  console.log("\n✅ PoolManager deployed successfully!");
  console.log("=".repeat(60));
  console.log("Contract Address:", address);
  console.log("Initial Owner:", initialOwner);
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

  // Save deployment info
  console.log("\n📝 Deployment Summary:");
  console.log("Add this to your .env file:");
  console.log(`POOL_MANAGER_ADDRESS=${address}`);

  return {
    address,
    initialOwner,
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
