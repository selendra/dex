const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║          DEX Contract Deployment Script                ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");
  
  console.log("Deployer address:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy PoolManager (requires owner address)
  console.log("➤ Deploying PoolManager...");
  const PoolManager = await hre.ethers.getContractFactory("PoolManager");
  const poolManager = await PoolManager.deploy(deployer.address);
  await poolManager.waitForDeployment();
  const poolManagerAddress = await poolManager.getAddress();
  console.log("  ✓ PoolManager deployed:", poolManagerAddress);

  // Deploy WorkingSwapRouter (simple functional router)
  console.log("\n➤ Deploying WorkingSwapRouter...");
  const WorkingSwapRouter = await hre.ethers.getContractFactory("WorkingSwapRouter");
  const swapRouter = await WorkingSwapRouter.deploy(poolManagerAddress);
  await swapRouter.waitForDeployment();
  const swapRouterAddress = await swapRouter.getAddress();
  console.log("  ✓ WorkingSwapRouter deployed:", swapRouterAddress);

  // Deploy SimpleLiquidityManager
  console.log("\n➤ Deploying SimpleLiquidityManager...");
  const SimpleLiquidityManager = await hre.ethers.getContractFactory("SimpleLiquidityManager");
  const liquidityManager = await SimpleLiquidityManager.deploy(poolManagerAddress);
  await liquidityManager.waitForDeployment();
  const liquidityManagerAddress = await liquidityManager.getAddress();
  console.log("  ✓ SimpleLiquidityManager deployed:", liquidityManagerAddress);

  // Deploy mock dependencies for PositionManager
  console.log("\n➤ Deploying PositionManager dependencies...");
  
  const MockWETH9 = await hre.ethers.getContractFactory("contracts/periphery/mocks/MockWETH9.sol:MockWETH9");
  const weth9 = await MockWETH9.deploy();
  await weth9.waitForDeployment();
  const weth9Address = await weth9.getAddress();
  console.log("  ✓ MockWETH9 deployed:", weth9Address);

  const Permit2 = await hre.ethers.getContractFactory("Permit2");
  const permit2 = await Permit2.deploy();
  await permit2.waitForDeployment();
  const permit2Address = await permit2.getAddress();
  console.log("  ✓ Permit2 deployed:", permit2Address);

  const MockPositionDescriptor = await hre.ethers.getContractFactory("contracts/mocks/MockPositionDescriptor.sol:MockPositionDescriptor");
  const positionDescriptor = await MockPositionDescriptor.deploy(poolManagerAddress, weth9Address);
  await positionDescriptor.waitForDeployment();
  const positionDescriptorAddress = await positionDescriptor.getAddress();
  console.log("  ✓ MockPositionDescriptor deployed:", positionDescriptorAddress);

  // Deploy PositionManager (full Uniswap V4 periphery)
  console.log("\n➤ Deploying PositionManager...");
  const PositionManager = await hre.ethers.getContractFactory("PositionManager");
  const positionManager = await PositionManager.deploy(
    poolManagerAddress,
    permit2Address,
    100000, // unsubscribe gas limit
    positionDescriptorAddress,
    weth9Address
  );
  await positionManager.waitForDeployment();
  const positionManagerAddress = await positionManager.getAddress();
  console.log("  ✓ PositionManager deployed:", positionManagerAddress);

  // Deploy StateView
  console.log("\n➤ Deploying StateView...");
  const StateView = await hre.ethers.getContractFactory("StateView");
  const stateView = await StateView.deploy(poolManagerAddress);
  await stateView.waitForDeployment();
  const stateViewAddress = await stateView.getAddress();
  console.log("  ✓ StateView deployed:", stateViewAddress);

  // Save deployment info to .env file
  console.log("\n➤ Saving deployment configuration...");
  
  const envPath = path.join(__dirname, '../api/.env');
  const envContent = `PORT=3000
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=${process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"}
POOL_MANAGER_ADDRESS=${poolManagerAddress}
STATE_VIEW_ADDRESS=${stateViewAddress}
POSITION_MANAGER_ADDRESS=${positionManagerAddress}
SWAP_ROUTER_ADDRESS=${swapRouterAddress}
LIQUIDITY_MANAGER_ADDRESS=${liquidityManagerAddress}
WETH9_ADDRESS=${weth9Address}
PERMIT2_ADDRESS=${permit2Address}
`;

  fs.writeFileSync(envPath, envContent);
  console.log("  ✓ Configuration saved to api/.env");

  // Save deployment config
  const deployConfig = {
    network: "localhost",
    chainId: 1337,
    poolManager: poolManagerAddress,
    positionManager: positionManagerAddress,
    swapRouter: swapRouterAddress,
    liquidityManager: liquidityManagerAddress,
    stateView: stateViewAddress,
    weth9: weth9Address,
    permit2: permit2Address,
    positionDescriptor: positionDescriptorAddress,
    deployer: deployer.address
  };

  const configPath = path.join(__dirname, '../deployments/localhost.json');
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(deployConfig, null, 2));
  console.log("  ✓ Deployment configuration saved to deployments/localhost.json");

  // Print deployment summary
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║          DEX Deployment Summary                         ║");
  console.log("╠════════════════════════════════════════════════════════╣");
  console.log("║  Core Contracts                                         ║");
  console.log("╠════════════════════════════════════════════════════════╣");
  console.log(`║  PoolManager:         ${poolManagerAddress}  ║`);
  console.log(`║  PositionManager:     ${positionManagerAddress}  ║`);
  console.log(`║  SwapRouter:          ${swapRouterAddress}  ║`);
  console.log(`║  LiquidityManager:    ${liquidityManagerAddress}  ║`);
  console.log(`║  StateView:           ${stateViewAddress}  ║`);
  console.log("╠════════════════════════════════════════════════════════╣");
  console.log("║  Supporting Contracts                                   ║");
  console.log("╠════════════════════════════════════════════════════════╣");
  console.log(`║  MockWETH9:           ${weth9Address}  ║`);
  console.log(`║  Permit2:             ${permit2Address}  ║`);
  console.log(`║  PositionDescriptor:  ${positionDescriptorAddress}  ║`);
  console.log("╚════════════════════════════════════════════════════════╝\n");

  console.log("✅ DEX contracts deployed successfully!\n");
  console.log("Next steps:");
  console.log("1. Deploy tokens: npx hardhat run scripts/deploy-tokens.js --network localhost");
  console.log("2. Start API server: cd api && npm start\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
