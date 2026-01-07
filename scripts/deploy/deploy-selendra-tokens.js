const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("======================================================================");
  console.log("DEPLOYING 4 ERC20 TOKENS TO SELENDRA NETWORK");
  console.log("======================================================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`\nDeploying with account: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${hre.ethers.formatEther(balance)} SEL\n`);

  if (balance === 0n) {
    console.error("ERROR: Account has no balance. Please fund your account first.");
    process.exit(1);
  }

  // Token configurations
  const tokens = [
    { name: "Test USD", symbol: "TUSD", description: "Stablecoin pegged to USD" },
    { name: "Test Brown", symbol: "TBROWN", description: "Brown ecosystem token" },
    { name: "Test Smart", symbol: "TSMART", description: "Smart contract token" },
    { name: "Test Zando", symbol: "TZANDO", description: "Zando marketplace token" }
  ];

  const deployedTokens = {};
  const INITIAL_SUPPLY = hre.ethers.parseEther("1000000"); // 1 million tokens each

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    console.log("----------------------------------------------------------------------");
    console.log(`${i + 1}. Deploying ${token.symbol} (${token.name})...`);
    console.log("----------------------------------------------------------------------");

    try {
      const TestToken = await hre.ethers.getContractFactory("TestToken");
      const tokenContract = await TestToken.deploy(token.name, token.symbol);
      await tokenContract.waitForDeployment();
      
      const address = await tokenContract.getAddress();
      console.log(`✅ ${token.symbol} deployed: ${address}`);
      console.log(`   Name: ${token.name}`);
      console.log(`   Description: ${token.description}`);

      // Mint initial supply to deployer
      console.log(`   Minting ${hre.ethers.formatEther(INITIAL_SUPPLY)} ${token.symbol}...`);
      const mintTx = await tokenContract.mint(deployer.address, INITIAL_SUPPLY);
      await mintTx.wait();
      console.log(`   ✅ Minted to deployer`);

      deployedTokens[token.symbol] = {
        address: address,
        name: token.name,
        symbol: token.symbol,
        description: token.description
      };

    } catch (error) {
      console.error(`❌ Failed to deploy ${token.symbol}:`, error.message);
    }
  }

  console.log("\n======================================================================");
  console.log("DEPLOYMENT COMPLETE - SELENDRA NETWORK");
  console.log("======================================================================\n");

  console.log("Deployed Tokens:");
  Object.entries(deployedTokens).forEach(([symbol, info]) => {
    console.log(`${symbol.padEnd(10)}: ${info.address}`);
  });

  // Generate .env updates
  console.log("\n--- Add to your .env file ---");
  console.log(`# Selendra Token Addresses`);
  Object.entries(deployedTokens).forEach(([symbol, info]) => {
    console.log(`SELENDRA_${symbol}_ADDRESS=${info.address}`);
  });

  // Save to JSON file for reference
  const outputPath = path.join(__dirname, "../../selendra-tokens.json");
  fs.writeFileSync(outputPath, JSON.stringify({
    network: "selendra",
    chainId: 1961,
    rpcUrl: "https://rpc.selendra.org",
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    tokens: deployedTokens
  }, null, 2));
  console.log(`\n✅ Token info saved to: selendra-tokens.json`);

  return deployedTokens;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
