const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Adding liquidity with account:", signer.address);

  const poolManagerAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const liquidityManagerAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const tokenAAddress = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
  const tokenBAddress = "0x610178dA211FEF7D417bC0e6FeD39F05609AD788";

  // Sort addresses
  const [currency0, currency1] = tokenAAddress.toLowerCase() < tokenBAddress.toLowerCase()
    ? [tokenAAddress, tokenBAddress]
    : [tokenBAddress, tokenAAddress];

  const tokenA = await ethers.getContractAt("TestToken", tokenAAddress);
  const tokenB = await ethers.getContractAt("TestToken", tokenBAddress);
  const liquidityManager = await ethers.getContractAt("SimpleLiquidityManager", liquidityManagerAddress);

  // Transfer tokens to liquidity manager
  const amount = ethers.parseEther("100"); // 100 tokens each
  console.log("\n📤 Transferring tokens to liquidity manager...");
  await (await tokenA.transfer(liquidityManagerAddress, amount)).wait();
  await (await tokenB.transfer(liquidityManagerAddress, amount)).wait();
  console.log("Transferred!");

  // Pool key
  const poolKey = {
    currency0,
    currency1,
    fee: 3000,
    tickSpacing: 60,
    hooks: ethers.ZeroAddress
  };

  // Liquidity params (full range)
  const tickLower = -887220;
  const tickUpper = 887220;
  const liquidityDelta = ethers.parseEther("10"); // Amount of liquidity

  console.log("\n🏊 Adding liquidity...");
  console.log("Pool:", currency0, "<->", currency1);
  console.log("Amount each:", ethers.formatEther(amount));

  try {
    const tx = await liquidityManager.addLiquidity(
      poolKey,
      tickLower,
      tickUpper,
      liquidityDelta
    );
    const receipt = await tx.wait();
    console.log("✅ Liquidity added successfully!");
    console.log("Transaction hash:", receipt.hash);
  } catch (error) {
    console.error("❌ Failed to add liquidity:", error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
