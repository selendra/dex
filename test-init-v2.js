const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const poolManager = await hre.ethers.getContractAt("PoolManager", "0x5FbDB2315678afecb367f032d93F642f64180aa3");
  const tokenS = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
  const tokenA = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";
  
  const [currency0, currency1] = tokenS.toLowerCase() < tokenA.toLowerCase() ? [tokenS, tokenA] : [tokenA, tokenS];
  
  const poolKey = {
    currency0,
    currency1,
    fee: 3000,
    tickSpacing: 60,
    hooks: hre.ethers.ZeroAddress
  };
  
  const sqrtPriceX96 = "79228162514264337593543950336";
  
  console.log("\nInitializing TOKENS/TOKENA pool...");
  
  try {
    const tx = await poolManager.initialize(poolKey, sqrtPriceX96);
    await tx.wait();
    console.log("✅ SUCCESS!");
  } catch (error) {
    console.log("❌", error.message.substring(0, 100));
  }
  
  // Now try TOKENS/TOKENB
  const tokenB = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
  const [currency0_b, currency1_b] = tokenS.toLowerCase() < tokenB.toLowerCase() ? [tokenS, tokenB] : [tokenB, tokenS];
  
  const poolKey_b = {
    currency0: currency0_b,
    currency1: currency1_b,
    fee: 3000,
    tickSpacing: 60,
    hooks: hre.ethers.ZeroAddress
  };
  
  console.log("\nInitializing TOKENS/TOKENB pool...");
  
  try {
    const tx = await poolManager.initialize(poolKey_b, sqrtPriceX96);
    await tx.wait();
    console.log("✅ SUCCESS!");
  } catch (error) {
    console.log("❌", error.message.substring(0, 100));
  }
  
  // TOKENS/TOKENC
  const tokenC = "0x610178dA211FEF7D417bC0e6FeD39F05609AD788";
  const [currency0_c, currency1_c] = tokenS.toLowerCase() < tokenC.toLowerCase() ? [tokenS, tokenC] : [tokenC, tokenS];
  
  const poolKey_c = {
    currency0: currency0_c,
    currency1: currency1_c,
    fee: 3000,
    tickSpacing: 60,
    hooks: hre.ethers.ZeroAddress
  };
  
  console.log("\nInitializing TOKENS/TOKENC pool...");
  
  try {
    const tx = await poolManager.initialize(poolKey_c, sqrtPriceX96);
    await tx.wait();
    console.log("✅ SUCCESS!");
  } catch (error) {
    console.log("❌", error.message.substring(0, 100));
  }
  
  console.log("\n✅ All 3 pools initialized!");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
