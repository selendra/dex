const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Initializing pool with account:", signer.address);

  const poolManagerAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const tokenAAddress = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
  const tokenBAddress = "0x610178dA211FEF7D417bC0e6FeD39F05609AD788";

  // Sort addresses (currency0 must be < currency1)
  const [currency0, currency1] = tokenAAddress.toLowerCase() < tokenBAddress.toLowerCase()
    ? [tokenAAddress, tokenBAddress]
    : [tokenBAddress, tokenAAddress];

  const poolManager = await ethers.getContractAt("IPoolManager", poolManagerAddress);

  // Pool key
  const poolKey = [
    currency0,      // currency0 (sorted)
    currency1,      // currency1 (sorted)
    3000,           // fee (0.3%)
    60,             // tickSpacing
    ethers.ZeroAddress // hooks
  ];

  // Initial price: 1:1 ratio
  const sqrtPriceX96 = "79228162514264337593543950336"; // sqrt(1) * 2^96

  console.log("\n🔧 Pool Configuration:");
  console.log("Currency0:", currency0, currency0 === tokenAAddress ? "(TOKENA)" : "(TOKENB)");
  console.log("Currency1:", currency1, currency1 === tokenBAddress ? "(TOKENB)" : "(TOKENA)");
  console.log("Fee:", "3000 (0.3%)");
  console.log("TickSpacing:", "60");
  console.log("Initial Price:", "1:1 (sqrtPriceX96 =", sqrtPriceX96, ")");

  try {
    console.log("\n🚀 Initializing pool...");
    const tx = await poolManager.initialize(poolKey, sqrtPriceX96);
    const receipt = await tx.wait();
    
    console.log("✅ Pool initialized successfully!");
    console.log("Transaction hash:", receipt.hash);
    console.log("Gas used:", receipt.gasUsed.toString());
  } catch (error) {
    if (error.message.includes("PoolAlreadyInitialized") || error.message.includes("0x7983c051")) {
      console.log("ℹ️  Pool already initialized");
    } else {
      console.error("❌ Initialization failed:", error.message);
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
