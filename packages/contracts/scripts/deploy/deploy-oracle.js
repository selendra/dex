const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Deploying Oracle Contracts to Selendra...\n");

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

  // Deploy or reuse OracleRegistry
  let oracleRegistryAddress = process.env.SELENDRA_ORACLE_REGISTRY_ADDRESS || process.env.ORACLE_REGISTRY_ADDRESS;
  let oracleRegistry;

  if (oracleRegistryAddress) {
    console.log("\nUsing existing OracleRegistry:", oracleRegistryAddress);
    oracleRegistry = await hre.ethers.getContractAt("OracleRegistry", oracleRegistryAddress);
  } else {
    console.log("\nDeploying OracleRegistry...");
    const OracleRegistry = await hre.ethers.getContractFactory("OracleRegistry");
    oracleRegistry = await OracleRegistry.deploy(deployer.address);
    await oracleRegistry.waitForDeployment();
    oracleRegistryAddress = await oracleRegistry.getAddress();
    console.log("OracleRegistry deployed to:", oracleRegistryAddress);
  }

  // Deploy PriceOracle
  console.log("\nDeploying PriceOracle...");
  const PriceOracle = await hre.ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy(poolManagerAddress);
  await priceOracle.waitForDeployment();

  const oracleAddress = await priceOracle.getAddress();
  console.log("PriceOracle deployed to:", oracleAddress);

  // Verify roles using AccessControl
  const DEFAULT_ADMIN_ROLE = hre.ethers.ZeroHash;
  const FEEDER_ROLE = await priceOracle.FEEDER_ROLE();

  const isAdmin = await priceOracle.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  const isFeeder = await priceOracle.hasRole(FEEDER_ROLE, deployer.address);
  console.log("Deployer has DEFAULT_ADMIN_ROLE:", isAdmin);
  console.log("Deployer has FEEDER_ROLE:", isFeeder);

  // Register PriceOracle with OracleRegistry
  console.log("\nRegistering PriceOracle in OracleRegistry...");
  const registerTx = await oracleRegistry.registerOracle(oracleAddress);
  await registerTx.wait();
  const activeOracle = await oracleRegistry.activeOracle();
  console.log("Active oracle:", activeOracle);

  // Output for .env file
  console.log("\n========================================");
  console.log("Add to .env file:");
  console.log(`ORACLE_REGISTRY_ADDRESS=${oracleRegistryAddress}`);
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
