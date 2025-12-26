/**
 * Deploy 4 Test Tokens
 * 
 * TokenS: Stable coin (base token)
 * TokenA: 10 TokenA = 1 TokenS (cheaper)
 * TokenB: 20 TokenB = 1 TokenS (even cheaper)
 * TokenC: 1 TokenC = 1 TokenS (equal value)
 * 
 * Run: npx hardhat run scripts/deploy-4-test-tokens.js --network localhost
 */

const hre = require("hardhat");

async function main() {
  console.log("=".repeat(70));
  console.log("DEPLOYING 4 TEST TOKENS");
  console.log("=".repeat(70));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\nDeploying with account:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");

  const TestToken = await hre.ethers.getContractFactory("TestToken");

  // ============================================================================
  // Deploy TokenS (Stable Coin)
  // ============================================================================
  console.log("\n" + "-".repeat(70));
  console.log("1. Deploying TokenS (Stable Coin)...");
  console.log("-".repeat(70));

  const tokenS = await TestToken.deploy(
    "Token Stable",
    "TOKENS"
  );
  await tokenS.waitForDeployment();
  const tokenSAddress = await tokenS.getAddress();

  console.log("✅ TokenS deployed:", tokenSAddress);
  console.log("   Name: Token Stable");
  console.log("   Symbol: TOKENS");
  console.log("   Initial Supply: 1,000,000 (to deployer)");

  // ============================================================================
  // Deploy TokenA (10 TokenA = 1 TokenS)
  // ============================================================================
  console.log("\n" + "-".repeat(70));
  console.log("2. Deploying TokenA (10 TokenA = 1 TokenS)...");
  console.log("-".repeat(70));

  const tokenA = await TestToken.deploy(
    "Token A",
    "TOKENA"
  );
  await tokenA.waitForDeployment();
  const tokenAAddress = await tokenA.getAddress();

  console.log("✅ TokenA deployed:", tokenAAddress);
  console.log("   Name: Token A");
  console.log("   Symbol: TOKENA");
  console.log("   Initial Supply: 1,000,000 (to deployer)");
  console.log("   Value: 10 TOKENA = 1 TOKENS");

  // ============================================================================
  // Deploy TokenB (20 TokenB = 1 TokenS)
  // ============================================================================
  console.log("\n" + "-".repeat(70));
  console.log("3. Deploying TokenB (20 TokenB = 1 TokenS)...");
  console.log("-".repeat(70));

  const tokenB = await TestToken.deploy(
    "Token B",
    "TOKENB"
  );
  await tokenB.waitForDeployment();
  const tokenBAddress = await tokenB.getAddress();

  console.log("✅ TokenB deployed:", tokenBAddress);
  console.log("   Name: Token B");
  console.log("   Symbol: TOKENB");
  console.log("   Initial Supply: 1,000,000 (to deployer)");
  console.log("   Value: 20 TOKENB = 1 TOKENS");

  // ============================================================================
  // Deploy TokenC (1 TokenC = 1 TokenS)
  // ============================================================================
  console.log("\n" + "-".repeat(70));
  console.log("4. Deploying TokenC (1 TokenC = 1 TokenS)...");
  console.log("-".repeat(70));

  const tokenC = await TestToken.deploy(
    "Token C",
    "TOKENC"
  );
  await tokenC.waitForDeployment();
  const tokenCAddress = await tokenC.getAddress();

  console.log("✅ TokenC deployed:", tokenCAddress);
  console.log("   Name: Token C");
  console.log("   Symbol: TOKENC");
  console.log("   Initial Supply: 1,000,000 (to deployer)");
  console.log("   Value: 1 TOKENC = 1 TOKENS");

  // ============================================================================
  // Mint initial tokens to deployer
  // ============================================================================
  console.log("\n" + "-".repeat(70));
  console.log("5. Minting tokens to deployer...");
  console.log("-".repeat(70));

  const mintAmount = hre.ethers.parseEther("100000"); // 100k each

  await tokenS.mint(deployer.address, mintAmount);
  console.log("✅ Minted 100,000 TOKENS");

  await tokenA.mint(deployer.address, mintAmount);
  console.log("✅ Minted 100,000 TOKENA");

  await tokenB.mint(deployer.address, mintAmount);
  console.log("✅ Minted 100,000 TOKENB");

  await tokenC.mint(deployer.address, mintAmount);
  console.log("✅ Minted 100,000 TOKENC");

  // ============================================================================
  // Summary
  // ============================================================================
  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(70));

  console.log("\nDeployed Tokens:");
  console.log("TokenS (Stable):", tokenSAddress);
  console.log("TokenA (10:1)  :", tokenAAddress);
  console.log("TokenB (20:1)  :", tokenBAddress);
  console.log("TokenC (1:1)   :", tokenCAddress);

  console.log("\n📝 Add to your .env file:");
  console.log(`TOKENS_ADDRESS=${tokenSAddress}`);
  console.log(`TOKENA_ADDRESS=${tokenAAddress}`);
  console.log(`TOKENB_ADDRESS=${tokenBAddress}`);
  console.log(`TOKENC_ADDRESS=${tokenCAddress}`);

  console.log("\n💡 Price Ratios:");
  console.log("   10 TOKENA = 1 TOKENS");
  console.log("   20 TOKENB = 1 TOKENS");
  console.log("   1 TOKENC = 1 TOKENS");

  console.log("\n🚀 Next Steps:");
  console.log("  1. Add addresses to .env");
  console.log("  2. Run: node scripts/test-4-tokens-workflow.js");

  console.log("\n" + "=".repeat(70));

  // Return addresses for programmatic use
  return {
    tokenS: tokenSAddress,
    tokenA: tokenAAddress,
    tokenB: tokenBAddress,
    tokenC: tokenCAddress
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

module.exports = main;
