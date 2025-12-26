const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  console.log("\n🚀 SINGLE POOL SWAP TEST\n");

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
  const sqrtPrice = "79228162514264337593543950336"; // 1:1

  let nonce = await wallet.getNonce();

  console.log("STEP 1: INITIALIZE POOL");
  console.log("=".repeat(60));
  try {
    const tx = await poolManager.initialize(poolKey, sqrtPrice, { nonce });
    await tx.wait();
    nonce++;
    console.log("✅ Pool initialized!\n");
  } catch (error) {
    if (error.data === "0x7983c051") {
      console.log("✅ Pool already initialized\n");
    } else {
      throw error;
    }
  }

  console.log("STEP 2: APPROVE TOKENS");
  console.log("=".repeat(60));
  let tx = await tokenS.approve(swapRouter.target, ethers.MaxUint256, { nonce });
  await tx.wait();
  nonce++;
  console.log("✅ TOKENS approved");
  
  tx = await tokenC.approve(swapRouter.target, ethers.MaxUint256, { nonce });
  await tx.wait();
  nonce++;
  console.log("✅ TOKENC approved\n");

  console.log("STEP 3: ADD LIQUIDITY");
  console.log("=".repeat(60));
  const liqBefore = await stateView.getLiquidity(poolId);
  console.log(`Liquidity before: ${liqBefore.toString()}`);
  
  tx = await tokenC.transfer(liquidityRouter.target, ethers.parseEther('1000'), { nonce });
  await tx.wait();
  nonce++;
  
  tx = await tokenS.transfer(liquidityRouter.target, ethers.parseEther('1000'), { nonce });
  await tx.wait();
  nonce++;
  console.log("✅ Tokens transferred");
  
  tx = await liquidityRouter.addLiquidity(poolKey, -600, 600, ethers.parseEther('100'), { nonce });
  await tx.wait();
  nonce++;
  
  const liqAfter = await stateView.getLiquidity(poolId);
  console.log(`Liquidity after: ${liqAfter.toString()}`);
  console.log(`✅ Added ${(liqAfter - liqBefore).toString()}\n`);

  console.log("STEP 4: SWAP (10 TOKENC -> TOKENS)");
  console.log("=".repeat(60));
  
  // Approve SwapRouter to spend TOKENC
  tx = await tokenC.approve(swapRouter.target, ethers.parseEther("1000"), { nonce });
  await tx.wait();
  nonce++;
  console.log("✅ TOKENC approved to SwapRouter");
  
  const balS1 = await tokenS.balanceOf(wallet.address);
  const balC1 = await tokenC.balanceOf(wallet.address);
  console.log(`Before: ${ethers.formatEther(balS1)} TOKENS, ${ethers.formatEther(balC1)} TOKENC`);
  
  // Swap: zeroForOne=true means swap currency0 for currency1 (TOKENC for TOKENS)
  tx = await swapRouter.swap(poolKey, [true, ethers.parseEther("10"), "1461446703485210103287273052203988822378723970341"], { nonce, gasLimit: 500000 });
  await tx.wait();
  nonce++;
  console.log("✅ Swap executed!");
  
  const balS2 = await tokenS.balanceOf(wallet.address);
  const balC2 = await tokenC.balanceOf(wallet.address);
  console.log(`After: ${ethers.formatEther(balS2)} TOKENS, ${ethers.formatEther(balC2)} TOKENC`);
  console.log(`Result: Spent ${ethers.formatEther(balC1 - balC2)} TOKENC, Got ${ethers.formatEther(balS2 - balS1)} TOKENS\n`);

  console.log("=".repeat(60));
  console.log("✅✅✅ SWAP WORKS! ✅✅✅");
  console.log("=".repeat(60) + "\n");
}

main().catch(console.error);
