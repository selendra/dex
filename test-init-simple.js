const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const poolManager = await hre.ethers.getContractAt("PoolManager", "0x5FbDB2315678afecb367f032d93F642f64180aa3");
  const tokenS = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
  const tokenA = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";
  
  // Sort
  const [currency0, currency1] = tokenS.toLowerCase() < tokenA.toLowerCase() ? [tokenS, tokenA] : [tokenA, tokenS];
  
  const poolKey = {
    currency0,
    currency1,
    fee: 3000,
    tickSpacing: 60,
    hooks: hre.ethers.ZeroAddress
  };
  
  const sqrtPriceX96 = "79228162514264337593543950336";
  
  console.log("\nInitializing pool...");
  console.log("  currency0:", poolKey.currency0);
  console.log("  currency1:", poolKey.currency1);
  
  try {
    const tx = await poolManager.initialize(poolKey, sqrtPriceX96, "0x");
    await tx.wait();
    console.log("✅ SUCCESS!");
  } catch (error) {
    console.log("❌ FAILED:", error.message.substring(0, 100));
    if (error.data) console.log("  error.data:", error.data);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
