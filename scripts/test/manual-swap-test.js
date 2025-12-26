const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  console.log("Testing manual swap on TOKENC/TOKENS pool\n");

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const swapRouter = new ethers.Contract(
    process.env.SWAP_ROUTER_ADDRESS, 
    ['function swap((address,address,uint24,int24,address), (bool,int256,uint160)) external returns (int256,int256)'], 
    wallet
  );
  
  const poolKey = [process.env.TOKENC_ADDRESS, process.env.TOKENS_ADDRESS, 3000, 60, ethers.ZeroAddress];
  
  console.log("PoolKey:");
  console.log("  currency0 (TOKENC):", poolKey[0]);
  console.log("  currency1 (TOKENS):", poolKey[1]);
  console.log("  fee:", poolKey[2]);
  console.log("  tickSpacing:", poolKey[3]);
  console.log("  hooks:", poolKey[4]);
  
  console.log("\nSwap params:");
  console.log("  zeroForOne:", false, "(swapping TOKENS for TOKENC)");
  console.log("  amountSpecified:", "-10 ether", "(exact input)");
  console.log("  sqrtPriceLimitX96:", "MAX");
  
  try {
    const tx = await swapRouter.swap(
      poolKey,
      [false, -ethers.parseEther("10"), "1461446703485210103287273052203988822378723970342"]
    );
    console.log("\n✅ Swap transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Swap confirmed! Gas used:", receipt.gasUsed.toString());
  } catch (error) {
    console.log("\n❌ Swap failed:");
    console.log("Error:", error.shortMessage);
    if (error.data) console.log("Error data:", error.data);
  }
}

main();
