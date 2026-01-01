const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying PreFundedSwapRouter with account:", deployer.address);

  const poolManagerAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  console.log("Using PoolManager at:", poolManagerAddress);

  const PreFundedSwapRouter = await ethers.getContractFactory("PreFundedSwapRouter");
  const router = await PreFundedSwapRouter.deploy(poolManagerAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();

  console.log("✅ PreFundedSwapRouter deployed to:", routerAddress);
  
  return routerAddress;
}

main()
  .then((address) => {
    console.log("\n🎉 Deployment complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
