const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Deploying PriceOracle to Selendra...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "SEL\n");

  // Get PoolManager address from environment
  const poolManagerAddress = process.env.SELENDRA_POOL_MANAGER_ADDRESS || process.env.POOL_MANAGER_ADDRESS;
  if (!poolManagerAddress) {
    throw new Error("SELENDRA_POOL_MANAGER_ADDRESS not set in .env file");
  }
  console.log("PoolManager address:", poolManagerAddress);

  // Deploy PriceOracle
  console.log("\nDeploying PriceOracle...");
  const PriceOracle = await hre.ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy(poolManagerAddress);
  await priceOracle.waitForDeployment();
  
  const oracleAddress = await priceOracle.getAddress();
  console.log("PriceOracle deployed to:", oracleAddress);

  // Verify admin is set correctly
  const admin = await priceOracle.admin();
  console.log("Oracle admin:", admin);
  
  const isAuthorized = await priceOracle.authorizedFeeders(deployer.address);
  console.log("Deployer is authorized feeder:", isAuthorized);

  // Output for .env file
  console.log("\n========================================");
  console.log("Add to .env file:");
  console.log(`PRICE_ORACLE_ADDRESS=${oracleAddress}`);
  console.log("========================================\n");

  // Show oracle configuration
  console.log("Oracle Configuration:");
  console.log("- Default Fee:", (await priceOracle.defaultFee()).toString());
  console.log("- Default Tick Spacing:", (await priceOracle.defaultTickSpacing()).toString());
  console.log("- Max Price Age:", (await priceOracle.MAX_PRICE_AGE()).toString(), "seconds");
  console.log("- TWAP Window:", (await priceOracle.TWAP_WINDOW()).toString(), "seconds");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
