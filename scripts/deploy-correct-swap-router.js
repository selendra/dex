const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying CorrectSwapRouter with account:", deployer.address);

  const poolManagerAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  console.log("Using PoolManager at:", poolManagerAddress);

  const CorrectSwapRouter = await ethers.getContractFactory("CorrectSwapRouter");
  const router = await CorrectSwapRouter.deploy(poolManagerAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();

  console.log("✅ CorrectSwapRouter deployed to:", routerAddress);
  
  return routerAddress;
}

main()
  .then((address) => {
    console.log("\n🎉 Deployment complete!");
    console.log("Update api-v2/.env with:");
    console.log(`SWAP_ROUTER_ADDRESS=${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
