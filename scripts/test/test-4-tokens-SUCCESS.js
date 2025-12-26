const { ethers } = require("ethers");
require("dotenv").config();

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log("\n🚀 4-TOKEN DEX TEST - COMPLETE WORKFLOW\n");

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const poolManager = new ethers.Contract(process.env.POOL_MANAGER_ADDRESS, ['function initialize((address,address,uint24,int24,address), uint160) returns (int24)'], wallet);
  const liquidityRouter = new ethers.Contract(process.env.LIQUIDITY_ROUTER_ADDRESS, ['function addLiquidity((address,address,uint24,int24,address), int24, int24, int256)', 'function removeLiquidity((address,address,uint24,int24,address), int24, int24, int256)'], wallet);
  const swapRouter = new ethers.Contract(process.env.SWAP_ROUTER_ADDRESS, ['function swap((address,address,uint24,int24,address), (bool,int256,uint160))'], wallet);
  const stateView = new ethers.Contract(process.env.STATE_VIEW_ADDRESS, ['function getSlot0(bytes32) view returns (uint160,int24,uint24,uint24)', 'function getLiquidity(bytes32) view returns (uint128)'], provider);
  
  const tokenS = new ethers.Contract(process.env.TOKENS_ADDRESS, ['function symbol() view returns (string)', 'function balanceOf(address) view returns (uint256)', 'function approve(address,uint256)', 'function transfer(address,uint256)'], wallet);
  const tokenA = new ethers.Contract(process.env.TOKENA_ADDRESS, ['function symbol() view returns (string)', 'function balanceOf(address) view returns (uint256)', 'function approve(address,uint256)', 'function transfer(address,uint256)'], wallet);
  const tokenB = new ethers.Contract(process.env.TOKENB_ADDRESS, ['function symbol() view returns (string)', 'function balanceOf(address) view returns (uint256)', 'function approve(address,uint256)', 'function transfer(address,uint256)'], wallet);
  const tokenC = new ethers.Contract(process.env.TOKENC_ADDRESS, ['function symbol() view returns (string)', 'function balanceOf(address) view returns (uint256)', 'function approve(address,uint256)', 'function transfer(address,uint256)'], wallet);

  const pools = [
    { name: "TOKENA/TOKENS (10:1)", token0: tokenA, token1: tokenS, addr0: process.env.TOKENA_ADDRESS, addr1: process.env.TOKENS_ADDRESS, sqrtPrice: BigInt(Math.floor(Math.sqrt(10) * Number(2n ** 96n))) },
    { name: "TOKENB/TOKENS (20:1)", token0: tokenB, token1: tokenS, addr0: process.env.TOKENB_ADDRESS, addr1: process.env.TOKENS_ADDRESS, sqrtPrice: BigInt(Math.floor(Math.sqrt(20) * Number(2n ** 96n))) },
    { name: "TOKENC/TOKENS (1:1)", token0: tokenC, token1: tokenS, addr0: process.env.TOKENC_ADDRESS, addr1: process.env.TOKENS_ADDRESS, sqrtPrice: BigInt(Math.floor(Math.sqrt(1) * Number(2n ** 96n))) }
  ];

  // STEP 1: Initialize Pools
  console.log("=".repeat(80));
  console.log("STEP 1: INITIALIZE POOLS");
  console.log("=".repeat(80) + "\n");
  
  for (const pool of pools) {
    const poolKey = [pool.addr0, pool.addr1, 3000, 60, ethers.ZeroAddress];
    pool.poolKey = poolKey;
    pool.poolId = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['tuple(address,address,uint24,int24,address)'], [poolKey]));
    
    console.log(`Initializing ${pool.name}...`);
    try {
      const tx = await poolManager.initialize(poolKey, pool.sqrtPrice);
      await tx.wait();
      await sleep(500);
      console.log(`✅ ${pool.name} initialized!\n`);
    } catch (error) {
      if (error.message.includes("PoolAlreadyInitialized") || error.message.includes("0x7983c051")) {
        console.log(`✅ ${pool.name} already initialized\n`);
      } else {
        console.log(`❌ ${pool.name}: ${error.shortMessage}\n`);
        throw error;
      }
    }
  }

  // STEP 2: Approve Tokens
  console.log("\n" + "=".repeat(80));
  console.log("STEP 2: APPROVE TOKENS");
  console.log("=".repeat(80) + "\n");
  
  let nonce = await wallet.getNonce();
  let tx = await tokenS.approve(swapRouter.target, ethers.MaxUint256, { nonce: nonce++ });
  await tx.wait();
  console.log("✅ TOKENS approved");
  
  tx = await tokenA.approve(swapRouter.target, ethers.MaxUint256, { nonce: nonce++ });
  await tx.wait();
  console.log("✅ TOKENA approved");

  tx = await tokenB.approve(swapRouter.target, ethers.MaxUint256, { nonce: nonce++ });
  await tx.wait();
  console.log("✅ TOKENB approved");

  tx = await tokenC.approve(swapRouter.target, ethers.MaxUint256, { nonce: nonce++ });
  await tx.wait();
  console.log("✅ TOKENC approved");

  // STEP 3: Add Liquidity
  console.log("\n" + "=".repeat(80));
  console.log("STEP 3: ADD LIQUIDITY");
  console.log("=".repeat(80) + "\n");
  
  for (const pool of pools) {
    const liquidityBefore = await stateView.getLiquidity(pool.poolId);
    console.log(`${pool.name}:`);
  nonce = await wallet.getNonce();
  for (const pool of pools) {
    const liquidityBefore = await stateView.getLiquidity(pool.poolId);
    console.log(`${pool.name}:`);
    console.log(`  Liquidity before: ${liquidityBefore.toString()}`);
    
    tx = await pool.token0.transfer(liquidityRouter.target, ethers.parseEther('1000'), { nonce: nonce++ });
    await tx.wait();
    
    tx = await pool.token1.transfer(liquidityRouter.target, ethers.parseEther('1000'), { nonce: nonce++ });
    await tx.wait();
    
    tx = await liquidityRouter.addLiquidity(pool.poolKey, -600, 600, ethers.parseEther('100'), { nonce: nonce++ });
    await tx.wait();
    
    const liquidityAfter = await stateView.getLiquidity(pool.poolId);
    console.log(`  Liquidity after: ${liquidityAfter.toString()}`);
    console.log(`  ✅ Added ${(liquidityAfter - liquidityBefore).toString()}\n`);
  }

  // STEP 4: Execute Swaps
  console.log("=".repeat(80));
  console.log("STEP 4: EXECUTE SWAPS");
  console.log("=".repeat(80) + "\n");

  nonce = await wallet.getNonce();
  
  // Swap 1: TOKENS -> TOKENA
  console.log("Swap 1: 10 TOKENS -> TOKENA (expected ~100 TOKENA)");
  let balS = await tokenS.balanceOf(wallet.address);
  let balA = await tokenA.balanceOf(wallet.address);
  console.log(`  Before: ${ethers.formatEther(balS)} TOKENS, ${ethers.formatEther(balA)} TOKENA`);
  
  tx = await swapRouter.swap(pools[0].poolKey, [false, ethers.parseEther("10"), 0], { nonce: nonce++ });
  await tx.wait();
  
  balS = await tokenS.balanceOf(wallet.address);
  balA = await tokenA.balanceOf(wallet.address);
  console.log(`  After: ${ethers.formatEther(balS)} TOKENS, ${ethers.formatEther(balA)} TOKENA`);
  console.log(`  ✅ Swap executed!\n`);

  // Swap 2: TOKENS -> TOKENB
  console.log("Swap 2: 10 TOKENS -> TOKENB (expected ~200 TOKENB)");
  balS = await tokenS.balanceOf(wallet.address);
  let balB = await tokenB.balanceOf(wallet.address);
  console.log(`  Before: ${ethers.formatEther(balS)} TOKENS, ${ethers.formatEther(balB)} TOKENB`);
  
  tx = await swapRouter.swap(pools[1].poolKey, [false, ethers.parseEther("10"), 0], { nonce: nonce++ });
  await tx.wait();
  
  balS = await tokenS.balanceOf(wallet.address);
  balB = await tokenB.balanceOf(wallet.address);
  console.log(`  After: ${ethers.formatEther(balS)} TOKENS, ${ethers.formatEther(balB)} TOKENB`);
  console.log(`  ✅ Swap executed!\n`);

  // Swap 3: TOKENS -> TOKENC
  console.log("Swap 3: 10 TOKENS -> TOKENC (expected ~10 TOKENC)");
  balS = await tokenS.balanceOf(wallet.address);
  let balC = await tokenC.balanceOf(wallet.address);
  console.log(`  Before: ${ethers.formatEther(balS)} TOKENS, ${ethers.formatEther(balC)} TOKENC`);
  
  tx = await swapRouter.swap(pools[2].poolKey, [false, ethers.parseEther("10"), 0], { nonce: nonce++ });
  await tx.wait();
  
  balS = await tokenS.balanceOf(wallet.address);
  balC = await tokenC.balanceOf(wallet.address);
  console.log(`  After: ${ethers.formatEther(balS)} TOKENS, ${ethers.formatEther(balC)} TOKENC`);
  console.log(`  ✅ Swap executed!\n`);

  // STEP 5: Remove Liquidity
  console.log("=".repeat(80));
  console.log("STEP 5: REMOVE LIQUIDITY");
  console.log("=".repeat(80) + "\n");
  
  for (const pool of pools) {
    const liquidityBefore = await stateView.getLiquidity(pool.poolId);
    console.log(`${pool.name}:`);
  nonce = await wallet.getNonce();
  for (const pool of pools) {
    const liquidityBefore = await stateView.getLiquidity(pool.poolId);
    console.log(`${pool.name}:`);
    console.log(`  Liquidity before: ${liquidityBefore.toString()}`);
    
    tx = await liquidityRouter.removeLiquidity(pool.poolKey, -600, 600, ethers.parseEther('50'), { nonce: nonce++ });
    await tx.wait();
    
    const liquidityAfter = await stateView.getLiquidity(pool.poolId);
    console.log(`  Liquidity after: ${liquidityAfter.toString()}`);
    console.log(`  ✅ Removed ${(liquidityBefore - liquidityAfter).toString()}\n`);
  }

  console.log("=".repeat(80));
  console.log("✅✅✅ ALL TESTS PASSED! ✅✅✅");
  console.log("=".repeat(80) + "\n");
}

main().catch(console.error);
