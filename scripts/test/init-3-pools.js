const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const poolManager = new ethers.Contract(process.env.POOL_MANAGER_ADDRESS, ['function initialize((address,address,uint24,int24,address), uint160) returns (int24)'], wallet);
  
  const pools = [
    { name: "TOKENA/TOKENS", addr0: process.env.TOKENA_ADDRESS, addr1: process.env.TOKENS_ADDRESS, sqrtPrice: BigInt(Math.floor(Math.sqrt(10) * Number(2n ** 96n))) },
    { name: "TOKENB/TOKENS", addr0: process.env.TOKENB_ADDRESS, addr1: process.env.TOKENS_ADDRESS, sqrtPrice: BigInt(Math.floor(Math.sqrt(20) * Number(2n ** 96n))) },
    { name: "TOKENC/TOKENS", addr0: process.env.TOKENC_ADDRESS, addr1: process.env.TOKENS_ADDRESS, sqrtPrice: BigInt(Math.floor(Math.sqrt(1) * Number(2n ** 96n))) }
  ];

  console.log("Initializing 3 pools...\n");

  for (const pool of pools) {
    const poolKey = [pool.addr0, pool.addr1, 3000, 60, ethers.ZeroAddress];
    
    console.log(`${pool.name}:`);
    console.log(`  PoolKey: [${pool.addr0}, ${pool.addr1}, 3000, 60, ${ethers.ZeroAddress}]`);
    console.log(`  SqrtPriceX96: ${pool.sqrtPrice.toString()}`);
    
    try {
      const tx = await poolManager.initialize(poolKey, pool.sqrtPrice);
      const receipt = await tx.wait();
      console.log(`  ✅ SUCCESS! Gas used: ${receipt.gasUsed.toString()}\n`);
    } catch (error) {
      if (error.message.includes("PoolAlreadyInitialized") || error.data === "0x7983c051") {
        console.log(`  ✅ Already initialized\n`);
      } else {
        console.log(`  ❌ FAILED: ${error.shortMessage}`);
        console.log(`  Error data: ${error.data}\n`);
      }
    }
  }
}

main().catch(console.error);
