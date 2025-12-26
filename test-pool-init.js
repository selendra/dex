const { ethers } = require("ethers");
require("dotenv").config();

const POOL_MANAGER_ABI = ["function initialize((address,address,uint24,int24,address) key, uint160 sqrtPriceX96, bytes hookData) external returns (int24 tick)"];

async function main() {
  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  const wallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
  
  console.log("Wallet:", wallet.address);
  console.log("PoolManager:", process.env.POOL_MANAGER_ADDRESS);
  
  const poolManager = new ethers.Contract(process.env.POOL_MANAGER_ADDRESS, POOL_MANAGER_ABI, wallet);
  
  // Sort tokens
  const tokenS = process.env.TOKENS_ADDRESS;
  const tokenA = process.env.TOKENA_ADDRESS;
  
  const [currency0, currency1] = tokenS.toLowerCase() < tokenA.toLowerCase() 
    ? [tokenS, tokenA] 
    : [tokenA, tokenS];
  
  console.log("\nPool tokens:");
  console.log("  currency0:", currency0);
  console.log("  currency1:", currency1);
  
  // For 1:1 ratio use standard price
  const sqrtPriceX96 = "79228162514264337593543950336"; // 1:1 price
  
  const poolKey = [currency0, currency1, 3000, 60, ethers.ZeroAddress];
  
  console.log("\nInitializing pool...");
  console.log("  sqrtPriceX96:", sqrtPriceX96);
  
  try {
    const tx = await poolManager.initialize(poolKey, sqrtPriceX96, "0x");
    console.log("  TX:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ SUCCESS! Block:", receipt.blockNumber);
  } catch (error) {
    console.log("❌ FAILED:", error.message);
    if (error.data) console.log("  Data:", error.data);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
