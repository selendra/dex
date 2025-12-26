const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  console.log("\n🔄 SIMPLE SWAP TEST - TOKENC/TOKENS\n");

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const swapRouter = new ethers.Contract(
    process.env.SWAP_ROUTER_ADDRESS,
    ['function swap((address,address,uint24,int24,address), (bool,int256,uint160)) external returns (int256,int256)'],
    wallet
  );
  
  const tokenS = new ethers.Contract(
    process.env.TOKENS_ADDRESS,
    ['function balanceOf(address) view returns (uint256)', 'function symbol() view returns (string)'],
    provider
  );
  
  const tokenC = new ethers.Contract(
    process.env.TOKENC_ADDRESS,
    ['function balanceOf(address) view returns (uint256)', 'function symbol() view returns (string)'],
    provider
  );
  
  const poolKey = [process.env.TOKENC_ADDRESS, process.env.TOKENS_ADDRESS, 3000, 60, ethers.ZeroAddress];
  
  console.log("Balances BEFORE swap:");
  const balS1 = await tokenS.balanceOf(wallet.address);
  const balC1 = await tokenC.balanceOf(wallet.address);
  console.log(`  ${await tokenS.symbol()}: ${ethers.formatEther(balS1)}`);
  console.log(`  ${await tokenC.symbol()}: ${ethers.formatEther(balC1)}`);
  
  console.log("\nAttempting swap with POSITIVE amount (exact output)...");
  try {
    const tx = await swapRouter.swap(
      poolKey,
      [true, ethers.parseEther("5"), "4295128740"],  // zeroForOne=true, +5 ether (exact output), MIN price
      { gasLimit: 1000000 }
    );
    console.log("Transaction sent:", tx.hash);
    await tx.wait();
    console.log("✅ Swap SUCCESS!\n");
    
    console.log("Balances AFTER swap:");
    const balS2 = await tokenS.balanceOf(wallet.address);
    const balC2 = await tokenC.balanceOf(wallet.address);
    console.log(`  ${await tokenS.symbol()}: ${ethers.formatEther(balS2)}`);
    console.log(`  ${await tokenC.symbol()}: ${ethers.formatEther(balC2)}`);
    
    console.log("\nResult:");
    console.log(`  Spent: ${ethers.formatEther(balC1 - balC2)} ${await tokenC.symbol()}`);
    console.log(`  Got: ${ethers.formatEther(balS2 - balS1)} ${await tokenS.symbol()}`);
  } catch (error) {
    console.log("❌ FAILED with exact output, trying exact input...\n");
    
    try {
      const tx = await swapRouter.swap(
        poolKey,
        [true, -ethers.parseEther("5"), "4295128740"],  // zeroForOne=true, -5 ether (exact input), MIN price
        { gasLimit: 1000000 }
      );
      console.log("Transaction sent:", tx.hash);
      await tx.wait();
      console.log("✅ Swap SUCCESS!\n");
      
      console.log("Balances AFTER swap:");
      const balS2 = await tokenS.balanceOf(wallet.address);
      const balC2 = await tokenC.balanceOf(wallet.address);
      console.log(`  ${await tokenS.symbol()}: ${ethers.formatEther(balS2)}`);
      console.log(`  ${await tokenC.symbol()}: ${ethers.formatEther(balC2)}`);
      
      console.log("\nResult:");
      console.log(`  Spent: ${ethers.formatEther(balC1 - balC2)} ${await tokenC.symbol()}`);
      console.log(`  Got: ${ethers.formatEther(balS2 - balS1)} ${await tokenS.symbol()}`);
    } catch (error2) {
      console.log("❌ Both swap directions failed");
      console.log("Error:", error2.shortMessage);
      console.log("\nTrying opposite direction (TOKENS -> TOKENC)...\n");
      
      try {
        const tx = await swapRouter.swap(
          poolKey,
          [false, -ethers.parseEther("5"), "1461446703485210103287273052203988822378723970342"],  // zeroForOne=false, -5 ether, MAX price
          { gasLimit: 1000000 }
        );
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
        console.log("✅ Swap SUCCESS!\n");
        
        console.log("Balances AFTER swap:");
        const balS2 = await tokenS.balanceOf(wallet.address);
        const balC2 = await tokenC.balanceOf(wallet.address);
        console.log(`  ${await tokenS.symbol()}: ${ethers.formatEther(balS2)}`);
        console.log(`  ${await tokenC.symbol()}: ${ethers.formatEther(balC2)}`);
        
        console.log("\nResult:");
        console.log(`  Spent: ${ethers.formatEther(balS1 - balS2)} ${await tokenS.symbol()}`);
        console.log(`  Got: ${ethers.formatEther(balC2 - balC1)} ${await tokenC.symbol()}`);
      } catch (error3) {
        console.log("❌ All swap attempts failed");
        console.log("Final error:", error3.shortMessage);
        if (error3.data) console.log("Error data:", error3.data);
      }
    }
  }
}

main();
