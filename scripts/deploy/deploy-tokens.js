const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║          Token Deployment Script                        ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");
  
  console.log("Deployer address:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy Test Tokens
  console.log("➤ Deploying Test Tokens...");
  const TestToken = await hre.ethers.getContractFactory("TestToken");
  
  console.log("  Deploying Token A...");
  const tokenA = await TestToken.deploy("Test Token A", "TKNA");
  await tokenA.waitForDeployment();
  const tokenAAddress = await tokenA.getAddress();
  
  // Verify deployment
  const codeA = await hre.ethers.provider.getCode(tokenAAddress);
  if (codeA === "0x") {
    throw new Error("Token A deployment failed - no code at address!");
  }
  console.log("  ✓ Token A deployed:", tokenAAddress);
  
  console.log("  Deploying Token B...");
  const tokenB = await TestToken.deploy("Test Token B", "TKNB");
  await tokenB.waitForDeployment();
  const tokenBAddress = await tokenB.getAddress();
  
  // Verify deployment
  const codeB = await hre.ethers.provider.getCode(tokenBAddress);
  if (codeB === "0x") {
    throw new Error("Token B deployment failed - no code at address!");
  }
  console.log("  ✓ Token B deployed:", tokenBAddress);

  // Sort tokens for pool configuration
  const [currency0, currency1] = tokenAAddress.toLowerCase() < tokenBAddress.toLowerCase()
    ? [tokenAAddress, tokenBAddress]
    : [tokenBAddress, tokenAAddress];

  // Mint initial supply to deployer
  console.log("\n➤ Minting initial supply...");
  const mintAmount = hre.ethers.parseEther("1000000"); // 1M tokens
  await tokenA.mint(deployer.address, mintAmount);
  await tokenB.mint(deployer.address, mintAmount);
  console.log("  ✓ Minted 1,000,000 tokens each to deployer");

  // Load existing DEX deployment config
  const dexConfigPath = path.join(__dirname, '../deployments/localhost.json');
  if (!fs.existsSync(dexConfigPath)) {
    throw new Error("DEX contracts not deployed! Run deploy.js first.");
  }
  const dexConfig = JSON.parse(fs.readFileSync(dexConfigPath, 'utf8'));

  // Update config with token addresses
  const tokenConfig = {
    tokenA: tokenAAddress,
    tokenB: tokenBAddress,
    currency0,
    currency1,
    pool: {
      fee: 3000,
      tickSpacing: 60,
      hooks: hre.ethers.ZeroAddress
    }
  };

  const tokensConfigPath = path.join(__dirname, '../deployments/tokens-localhost.json');
  fs.writeFileSync(tokensConfigPath, JSON.stringify(tokenConfig, null, 2));
  console.log("  ✓ Token configuration saved to deployments/tokens-localhost.json");

  // Update API test config
  const testConfig = {
    ...tokenConfig,
    ...dexConfig
  };

  const testConfigPath = path.join(__dirname, '../api/test-config.json');
  fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));
  console.log("  ✓ Complete config saved to api/test-config.json");

  // Print deployment summary
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║          Token Deployment Summary                       ║");
  console.log("╠════════════════════════════════════════════════════════╣");
  console.log(`║  Token A (TKNA):      ${tokenAAddress}  ║`);
  console.log(`║  Token B (TKNB):      ${tokenBAddress}  ║`);
  console.log("╠════════════════════════════════════════════════════════╣");
  console.log(`║  Currency0:           ${currency0}  ║`);
  console.log(`║  Currency1:           ${currency1}  ║`);
  console.log("╠════════════════════════════════════════════════════════╣");
  console.log("║  Initial Supply:      1,000,000 each                    ║");
  console.log("║  Minted To:           Deployer                          ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  console.log("✅ Token deployment completed successfully!\n");
  console.log("Pool Configuration:");
  console.log("  Fee: 3000 (0.3%)");
  console.log("  Tick Spacing: 60");
  console.log("  Hooks: None (ZeroAddress)\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
