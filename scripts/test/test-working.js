const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  console.log("=".repeat(80));
  console.log("DEX COMPLETE WORKFLOW TEST");
  console.log("=".repeat(80));

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log("\nWallet:", wallet.address);

  // Contracts
  const poolManager = new ethers.Contract(process.env.POOL_MANAGER_ADDRESS, ['function initialize((address,address,uint24,int24,address), uint160) returns (int24)'], wallet);
  const liquidityRouter = new ethers.Contract(process.env.LIQUIDITY_ROUTER_ADDRESS, ['function addLiquidity((address,address,uint24,int24,address), int24, int24, int256)'], wallet);
  const swapRouter = new ethers.Contract(process.env.SWAP_ROUTER_ADDRESS, ['function swap((address,address,uint24,int24,address), (bool,int256,uint160))'], wallet);
  const stateView = new ethers.Contract(process.env.STATE_VIEW_ADDRESS, ['function getSlot0(bytes32) view returns (uint160,int24,uint24,uint24)', 'function getLiquidity(bytes32) view returns (uint128)'], provider);
  const tokenS = new ethers.Contract(process.env.TOKENS_ADDRESS, ['function balanceOf(address) view returns (uint256)', 'function approve(address,uint256)', 'function transfer(address,uint256)'], wallet);
  const tokenA = new ethers.Contract(process.env.TOKENA_ADDRESS, ['function balanceOf(address) view returns (uint256)', 'function approve(address,uint256)', 'function transfer(address,uint256)'], wallet);

  const poolKey = [process.env.TOKENA_ADDRESS, process.env.TOKENS_ADDRESS, 3000, 60, ethers.ZeroAddress];
  const poolId = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['tuple(address,address,uint24,int24,address)'], [poolKey]));

  console.log("\nPool: TOKENA/TOKENS (10:1 ratio)");

  // STEP 1: Initialize
  console.log("\n" + "=".repeat(80));
  console.log("STEP 1: INITIALIZE POOL");
  console.log("=".repeat(80));
  
  try {
    const slot0 = await stateView.getSlot0(poolId);
    console.log("✅ Pool already initialized, tick:", slot0[1].toString());
  } catch (e) {
    console.log("Initializing pool...");
    const sqrtPrice = BigInt(Math.floor(Math.sqrt(10) * Number(2n ** 96n)));
    const tx = await poolManager.initialize(poolKey, sqrtPrice, { gasLimit: 5000000 });
    await tx.wait();
    console.log("✅ Pool initialized!");
  }

  // STEP 2: Approve
  console.log("\n" + "=".repeat(80));
  console.log("STEP 2: APPROVE TOKENS");
  console.log("=".repeat(80));
  
  const tx1 = await tokenS.approve(swapRouter.target, ethers.MaxUint256, { gasLimit: 100000 });
  await tx1.wait();
  console.log("✅ TOKENS approved to SwapRouter");
  
  const tx2 = await tokenA.approve(swapRouter.target, ethers.MaxUint256, { gasLimit: 100000 });
  await tx2.wait();
  console.log("✅ TOKENA approved to SwapRouter");

  // STEP 3: Add Liquidity
  console.log("\n" + "=".repeat(80));
  console.log("STEP 3: ADD LIQUIDITY");
  console.log("=".repeat(80));
  
  const liquidityBefore = await stateView.getLiquidity(poolId);
  console.log("Liquidity before:", liquidityBefore.toString());
  
  const tx3 = await tokenA.transfer(liquidityRouter.target, ethers.parseEther('1000'), { gasLimit: 100000 });
  await tx3.wait();
  
  const tx4 = await tokenS.transfer(liquidityRouter.target, ethers.parseEther('1000'), { gasLimit: 100000 });
  await tx4.wait();
  console.log("✅ Tokens transferred to router");
  
  const tx5 = await liquidityRouter.addLiquidity(poolKey, -600, 600, ethers.parseEther('100'), { gasLimit: 5000000 });
  await tx5.wait();
  console.log("✅ Liquidity added!");
  
  const liquidityAfter = await stateView.getLiquidity(poolId);
  console.log("Liquidity after:", liquidityAfter.toString());
  console.log("Increase:", (liquidityAfter - liquidityBefore).toString());

  // STEP 4: Swap
  console.log("\n" + "=".repeat(80));
  console.log("STEP 4: SWAP TOKENS");
  console.log("=".repeat(80));
  
  const balanceS1 = await tokenS.balanceOf(wallet.address);
  const balanceA1 = await tokenA.balanceOf(wallet.address);
  console.log("Before: TOKENS =", ethers.formatEther(balanceS1), "| TOKENA =", ethers.formatEther(balanceA1));
  
  const swapAmount = ethers.parseEther('10');
  const tx6 = await swapRouter.swap(
    poolKey,
    [true, -swapAmount, "4295128740"],
    { gasLimit: 5000000 }
  );
  await tx6.wait();
  console.log("✅ Swap executed!");
  
  const balanceS2 = await tokenS.balanceOf(wallet.address);
  const balanceA2 = await tokenA.balanceOf(wallet.address);
  console.log("After: TOKENS =", ethers.formatEther(balanceS2), "| TOKENA =", ethers.formatEther(balanceA2));
  console.log("Result: Spent", ethers.formatEther(balanceA1 - balanceA2), "TOKENA, Got", ethers.formatEther(balanceS2 - balanceS1), "TOKENS");

  console.log("\n" + "=".repeat(80));
  console.log("✅ ALL OPERATIONS SUCCESSFUL!");
  console.log("=".repeat(80));
}

main().then(() => process.exit(0)).catch(e => { console.error("\n❌ Error:", e.message); process.exit(1); });
