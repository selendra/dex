const hre = require("hardhat");

async function main() {
  console.log("Deploying Uniswap V4 test helper contracts...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const poolManagerAddress = process.env.POOL_MANAGER_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  console.log("PoolManager:", poolManagerAddress);

  // Deploy PoolModifyLiquidityTest
  console.log("\nDeploying PoolModifyLiquidityTest...");
  const PoolModifyLiquidityTest = await hre.ethers.getContractFactory("PoolModifyLiquidityTest", {
    libraries: {
      CurrencySettler: "0x0000000000000000000000000000000000000000" // Will be replaced by hardhat
    }
  });
  
  let liquidityTest;
  try {
    liquidityTest = await PoolModifyLiquidityTest.deploy(poolManagerAddress);
    await liquidityTest.waitForDeployment();
    console.log("✅ PoolModifyLiquidityTest:", await liquidityTest.getAddress());
  } catch (error) {
    console.log("❌ PoolModifyLiquidityTest failed:", error.message);
  }

  // Deploy PoolSwapTest
  console.log("\nDeploying PoolSwapTest...");
  const PoolSwapTest = await hre.ethers.getContractFactory("PoolSwapTest");
  
  let swapTest;
  try {
    swapTest = await PoolSwapTest.deploy(poolManagerAddress);
    await swapTest.waitForDeployment();
    console.log("✅ PoolSwapTest:", await swapTest.getAddress());
  } catch (error) {
    console.log("❌ PoolSwapTest failed:", error.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  
  if (liquidityTest) {
    console.log("\nAdd to .env:");
    console.log(`LIQUIDITY_TEST_ADDRESS=${await liquidityTest.getAddress()}`);
  }
  if (swapTest) {
    console.log(`SWAP_TEST_ADDRESS=${await swapTest.getAddress()}`);
  }
}

main().catch(console.error);
