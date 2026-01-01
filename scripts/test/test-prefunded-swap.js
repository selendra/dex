const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Testing PreFundedSwapRouter with account:", signer.address);

  // Contract addresses
  const routerAddress = "0x851356ae760d987E095750cCeb3bC6014560891C";
  const tokenAAddress = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
  const tokenBAddress = "0x610178dA211FEF7D417bC0e6FeD39F05609AD788";

  // Sort addresses
  const [currency0, currency1] = tokenAAddress.toLowerCase() < tokenBAddress.toLowerCase()
    ? [tokenAAddress, tokenBAddress]
    : [tokenBAddress, tokenAAddress];
  
  const isTokenAFirst = (currency0 === tokenAAddress);

  // Get contracts
  const tokenA = await ethers.getContractAt("TestToken", tokenAAddress);
  const tokenB = await ethers.getContractAt("TestToken", tokenBAddress);
  const router = await ethers.getContractAt("PreFundedSwapRouter", routerAddress);

  // Check balances before
  const balanceABefore = await tokenA.balanceOf(signer.address);
  const balanceBBefore = await tokenB.balanceOf(signer.address);
  console.log("\n📊 Before swap:");
  console.log("TOKENA balance:", ethers.formatEther(balanceABefore));
  console.log("TOKENB balance:", ethers.formatEther(balanceBBefore));

  // Transfer TOKENA to router (pre-fund pattern)
  const swapAmount = ethers.parseEther("1"); // 1 TOKENA
  console.log("\n📤 Transferring", ethers.formatEther(swapAmount), "TOKENA to router...");
  const transferTx = await tokenA.transfer(routerAddress, swapAmount);
  await transferTx.wait();
  console.log("Transferred!");

  // Prepare pool key (sorted!)
  const poolKey = {
    currency0,
    currency1,
    fee: 3000,
    tickSpacing: 60,
    hooks: ethers.ZeroAddress
  };

  // Swap direction
  const zeroForOne = isTokenAFirst;

  // Price limit: use MIN or MAX depending on direction
  // zeroForOne=true: price goes DOWN, use MIN as limit (no limit)
  // zeroForOne=false: price goes UP, use MAX as limit (no limit)
  const sqrtPriceLimitX96 = zeroForOne 
    ? "4295128740"  // MIN_SQRT_PRICE + 1
    : "1461446703485210103287273052203988822378723970341"; // MAX_SQRT_PRICE - 1

  // Prepare swap params
  const swapParams = {
    zeroForOne,
    amountSpecified: -swapAmount, // negative = exactInput
    sqrtPriceLimitX96
  };

  console.log("\n🔄 Executing swap...");
  console.log("Pool:", currency0, "<->", currency1);
  console.log("Direction: TOKENA -> TOKENB (zeroForOne:", zeroForOne, ")");
  console.log("Amount:", ethers.formatEther(swapAmount), "TOKENA");

  try {
    const tx = await router.swap(poolKey, swapParams, signer.address);
    const receipt = await tx.wait();
    console.log("✅ Swap successful!");
    console.log("Transaction hash:", receipt.hash);

    // Check balances after
    const balanceAAfter = await tokenA.balanceOf(signer.address);
    const balanceBAfter = await tokenB.balanceOf(signer.address);
    console.log("\n📊 After swap:");
    console.log("TOKENA balance:", ethers.formatEther(balanceAAfter));
    console.log("TOKENB balance:", ethers.formatEther(balanceBAfter));
    console.log("TOKENA spent:", ethers.formatEther(balanceABefore - balanceAAfter));
    console.log("TOKENB received:", ethers.formatEther(balanceBAfter - balanceBBefore));

  } catch (error) {
    console.error("\n❌ Swap failed!");
    console.error("Error:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
