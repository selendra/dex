/**
 * Deploy Permit2
 * 
 * Permit2 is a token approval contract that supports signature-based and
 * allowance-based transfers. It unifies EIP-2612 permits and traditional approvals.
 * 
 * Constructor Parameters: None
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-permit2.js --network localhost
 */

const hre = require("hardhat");

async function main() {
  console.log("=".repeat(60));
  console.log("Deploying Permit2 Contract");
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\nDeploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));

  // Deploy Permit2
  console.log("\nDeploying Permit2...");
  const Permit2 = await hre.ethers.getContractFactory("Permit2");
  
  // No constructor parameters needed
  const permit2 = await Permit2.deploy();
  await permit2.waitForDeployment();
  
  const address = await permit2.getAddress();
  
  console.log("\n✅ Permit2 deployed successfully!");
  console.log("=".repeat(60));
  console.log("Contract Address:", address);
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
  console.log(`PERMIT2_ADDRESS=${address}`);

  console.log("\n💡 Note: Users must approve Permit2 before using it for transfers");

  return {
    address,
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
