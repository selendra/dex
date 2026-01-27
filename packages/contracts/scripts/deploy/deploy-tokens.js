const hre = require("hardhat");

async function main() {
  console.log("=".repeat(70));
  console.log("DEPLOYING 4 TEST TOKENS");
  console.log("=".repeat(70));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\nDeploying with account:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "SEL");

  const SELToken = await hre.ethers.getContractFactory("SELToken");

  // Deploy TokenS (Stable Coin)
  console.log("\n" + "-".repeat(70));
  console.log("1. Deploying TokenS (Stable Coin)...");
  console.log("-".repeat(70));

  const tokenS = await SELToken.deploy("Token Stable", "TOKENS");
  await tokenS.waitForDeployment();
  const tokenSAddress = await tokenS.getAddress();

  console.log("✅ TokenS deployed:", tokenSAddress);
  console.log("   Name: Token Stable");
  console.log("   Symbol: TOKENS");

  // Deploy TokenA (10 TokenA = 1 TokenS)
  console.log("\n" + "-".repeat(70));
  console.log("2. Deploying TokenA (10 TokenA = 1 TokenS)...");
  console.log("-".repeat(70));

  const tokenA = await SELToken.deploy("Token A", "TOKENA");
  await tokenA.waitForDeployment();
  const tokenAAddress = await tokenA.getAddress();

  console.log("✅ TokenA deployed:", tokenAAddress);
  console.log("   Name: Token A");
  console.log("   Symbol: TOKENA");
  console.log("   Value: 10 TOKENA = 1 TOKENS");

  // Deploy TokenB (20 TokenB = 1 TokenS)
  console.log("\n" + "-".repeat(70));
  console.log("3. Deploying TokenB (20 TokenB = 1 TokenS)...");
  console.log("-".repeat(70));

  const tokenB = await SELToken.deploy("Token B", "TOKENB");
  await tokenB.waitForDeployment();
  const tokenBAddress = await tokenB.getAddress();

  console.log("✅ TokenB deployed:", tokenBAddress);
  console.log("   Name: Token B");
  console.log("   Symbol: TOKENB");
  console.log("   Value: 20 TOKENB = 1 TOKENS");

  // Deploy TokenC (1 TokenC = 1 TokenS)
  console.log("\n" + "-".repeat(70));
  console.log("4. Deploying TokenC (1 TokenC = 1 TokenS)...");
  console.log("-".repeat(70));

  const tokenC = await SELToken.deploy("Token C", "TOKENC");
  await tokenC.waitForDeployment();
  const tokenCAddress = await tokenC.getAddress();

  console.log("✅ TokenC deployed:", tokenCAddress);
  console.log("   Name: Token C");
  console.log("   Symbol: TOKENC");
  console.log("   Value: 1 TOKENC = 1 TOKENS");

  // Mint additional tokens to deployer
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

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(70));

  console.log("\nDeployed Tokens:");
  console.log("TokenS (Stable):", tokenSAddress);
  console.log("TokenA (10:1)  :", tokenAAddress);
  console.log("TokenB (20:1)  :", tokenBAddress);
  console.log("TokenC (1:1)   :", tokenCAddress);

  console.log("\nAdd to your .env file:");
  console.log(`TOKENS_ADDRESS=${tokenSAddress}`);
  console.log(`TOKENA_ADDRESS=${tokenAAddress}`);
  console.log(`TOKENB_ADDRESS=${tokenBAddress}`);
  console.log(`TOKENC_ADDRESS=${tokenCAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
