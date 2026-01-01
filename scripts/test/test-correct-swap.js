const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Testing swap with account:", signer.address);

  // Contract addresses
  const poolManagerAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const routerAddress = "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1";
  const tokenAAddress = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
  const tokenBAddress = "0x610178dA211FEF7D417bC0e6FeD39F05609AD788";

  // Get contracts
  const tokenA = await ethers.getContractAt("TestToken", tokenAAddress);
  const tokenB = await ethers.getContractAt("TestToken", tokenBAddress);
  const router = await ethers.getContractAt("CorrectSwapRouter", routerAddress);

  // Sort addresses (currency0 must be < currency1)
  const [currency0, currency1] = tokenAAddress.toLowerCase() < tokenBAddress.toLowerCase()
    ? [tokenAAddress, tokenBAddress]
    : [tokenBAddress, tokenAAddress];
  
  const isTokenAFirst = (currency0 === tokenAAddress);

  // Check balances before
  const balanceABefore = await tokenA.balanceOf(signer.address);
  const balanceBBefore = await tokenB.balanceOf(signer.address);
  console.log("\n📊 Before swap:");
  console.log("TOKENA balance:", ethers.formatEther(balanceABefore));
  console.log("TOKENB balance:", ethers.formatEther(balanceBBefore));

  // Approve router to spend TOKENA
  const swapAmount = ethers.parseEther("1"); // 1 TOKENA
  console.log("\n✅ Approving router to spend", ethers.formatEther(swapAmount), "TOKENA...");
  const approveTx = await tokenA.approve(routerAddress, swapAmount);
  await approveTx.wait();
  console.log("Approved!");

  // Prepare pool key (sorted!)
  const poolKey = {
    currency0,
    currency1,
    fee: 3000,
    tickSpacing: 60,
    hooks: ethers.ZeroAddress
  };

  // Swap TOKENA for TOKENB
  // If TOKENA is currency1, we need zeroForOne=false (swap 1 for 0)
  // If TOKENA is currency0, we need zeroForOne=true (swap 0 for 1)
  const zeroForOne = isTokenAFirst;

  // Prepare swap params
  const swapParams = {
    zeroForOne,
    amountSpecified: -swapAmount, // negative = exactInput
    sqrtPriceLimitX96: 0
  };

  console.log("\n🔄 Executing swap...");
  console.log("Pool:", currency0, "<->", currency1);
  console.log("Direction: TOKENA -> TOKENB (zeroForOne:", zeroForOne, ")");
  console.log("Amount:", ethers.formatEther(swapAmount), "TOKENA");

  try {
    const tx = await router.swap(poolKey, swapParams);
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
