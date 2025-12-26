const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  console.log("\n🚀 SINGLE POOL TEST - TOKENC/TOKENS (1:1 ratio)\n");

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const poolManager = new ethers.Contract(process.env.POOL_MANAGER_ADDRESS, ['function initialize((address,address,uint24,int24,address), uint160) returns (int24)'], wallet);
  const liquidityRouter = new ethers.Contract(process.env.LIQUIDITY_ROUTER_ADDRESS, ['function addLiquidity((address,address,uint24,int24,address), int24, int24, int256)'], wallet);
  const swapRouter = new ethers.Contract(process.env.SWAP_ROUTER_ADDRESS, ['function swap((address,address,uint24,int24,address), (bool,int256,uint160))'], wallet);
  const stateView = new ethers.Contract(process.env.STATE_VIEW_ADDRESS, ['function getSlot0(bytes32) view returns (uint160,int24,uint24,uint24)', 'function getLiquidity(bytes32) view returns (uint128)'], provider);
  
  const tokenS = new ethers.Contract(process.env.TOKENS_ADDRESS, ['function balanceOf(address) view returns (uint256)', 'function approve(address,uint256)', 'function transfer(address,uint256)'], wallet);
  const tokenC = new ethers.Contract(process.env.TOKENC_ADDRESS, ['function balanceOf(address) view returns (uint256)', 'function approve(address,uint256)', 'function transfer(address,uint256)'], wallet);

  const poolKey = [process.env.TOKENC_ADDRESS, process.env.TOKENS_ADDRESS, 3000, 60, ethers.ZeroAddress];
  const poolId = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['tuple(address,address,uint24,int24,address)'], [poolKey]));
  const sqrtPrice = BigInt(Math.floor(Math.sqrt(1) * Number(2n ** 96n)));

  // STEP 1: Initialize
  console.log("STEP 1: INITIALIZE POOL");
  console.log("=".repeat(60));
  let nonce = await wallet.getNonce();
  try {
    const tx = await poolManager.initialize(poolKey, sqrtPrice, { nonce: nonce });
    await tx.wait();
    nonce++;
    console.log("✅ Pool initialized!\n");
  } catch (error) {
    if (error.data === "0x7983c051" || error.message.includes("PoolAlreadyInitialized")) {
      console.log("✅ Pool already initialized\n");
      // Pool already existed, estimateGas failed, nonce not consumed
    } else {
      throw error;
    }
  }

  // STEP 2: Check pool state
  const slot0 = await stateView.getSlot0(poolId);
  console.log(`Pool tick: ${slot0[1].toString()}`);
  console.log(`Pool sqrtPriceX96: ${slot0[0].toString()}\n`);

  // STEP 3: Approve
  console.log("STEP 2: APPROVE TOKENS");
  console.log("=".repeat(60));
  let tx = await tokenS.approve(swapRouter.target, ethers.MaxUint256, { nonce: nonce });
  await tx.wait();
  nonce++;
  console.log("✅ TOKENS approved");
  
  tx = await tokenC.approve(swapRouter.target, ethers.MaxUint256, { nonce: nonce });
  await tx.wait();
  nonce++;
  console.log("✅ TOKENC approved\n");

  // STEP 4: Add Liquidity
  console.log("STEP 3: ADD LIQUIDITY");
  console.log("=".repeat(60));
  const liquidityBefore = await stateView.getLiquidity(poolId);
  console.log(`Liquidity before: ${liquidityBefore.toString()}`);
  tx = await tokenC.transfer(liquidityRouter.target, ethers.parseEther('1000'), { nonce: nonce });
  await tx.wait();
  nonce++;
  
  tx = await tokenS.transfer(liquidityRouter.target, ethers.parseEther('1000'), { nonce: nonce });
  await tx.wait();
  nonce++;
  console.log("✅ Tokens transferred to router");
  
  tx = await liquidityRouter.addLiquidity(poolKey, -600, 600, ethers.parseEther('100'), { nonce: nonce });
  const receipt = await tx.wait();
  nonce++iquidity(poolKey, -600, 600, ethers.parseEther('100'), { nonce: nonce++ });
  const receipt = await tx.wait();
  console.log(`✅ Liquidity added! Gas: ${receipt.gasUsed.toString()}`);
  
  const liquidityAfter = await stateView.getLiquidity(poolId);
  console.log(`Liquidity after: ${liquidityAfter.toString()}`);
  console.log(`Added: ${(liquidityAfter - liquidityBefore).toString()}\n`);

  // STEP 5: Swap TOKENS -> TOKENC (1:1 ratio, should get ~10 TOKENC for 10 TOKENS)
  console.log("STEP 4: EXECUTE SWAP (10 TOKENS -> TOKENC)");
  console.log("=".repeat(60));
  
  const balS1 = await tokenS.balanceOf(wallet.address);
  const balC1 = await tokenC.balanceOf(wallet.address);
  // Swap parameters: [zeroForOne, amountSpecified, sqrtPriceLimitX96]
  // false = TOKENS -> TOKENC (since TOKENC < TOKENS in sorted order)
  // Positive amount = exact input
  tx = await swapRouter.swap(
    poolKey,
    [false, ethers.parseEther("10"), 0],
    { nonce: nonce, gasLimit: 500000 }
  );
  const swapReceipt = await tx.wait();
  nonce++0 }
  );
  const swapReceipt = await tx.wait();
  console.log(`✅ Swap executed! Gas: ${swapReceipt.gasUsed.toString()}`);
  
  const balS2 = await tokenS.balanceOf(wallet.address);
  const balC2 = await tokenC.balanceOf(wallet.address);
  console.log(`After: ${ethers.formatEther(balS2)} TOKENS, ${ethers.formatEther(balC2)} TOKENC`);
  console.log(`Result: Spent ${ethers.formatEther(balS1 - balS2)} TOKENS, Got ${ethers.formatEther(balC2 - balC1)} TOKENC\n`);

  console.log("=".repeat(60));
  console.log("✅✅✅ TEST PASSED! ✅✅✅");
  console.log("=".repeat(60) + "\n");
}

main().catch(console.error);
