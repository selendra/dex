const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  console.log("=".repeat(80));
  console.log("4-TOKEN DEX TEST - ACTUALLY WORKING VERSION");
  console.log("=".repeat(80));

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log("\nWallet:", wallet.address);

  // Contracts
  const poolManager = new ethers.Contract(process.env.POOL_MANAGER_ADDRESS, ['function initialize((address,address,uint24,int24,address), uint160) returns (int24)'], wallet);
  const liquidityRouter = new ethers.Contract(process.env.LIQUIDITY_ROUTER_ADDRESS, ['function addLiquidity((address,address,uint24,int24,address), int24, int24, int256)'], wallet);
  const swapRouter = new ethers.Contract(process.env.SWAP_ROUTER_ADDRESS, ['function swap((address,address,uint24,int24,address), (bool,int256,uint160))'], wallet);
  const stateView = new ethers.Contract(process.env.STATE_VIEW_ADDRESS, ['function getSlot0(bytes32) view returns (uint160,int24,uint24,uint24)', 'function getLiquidity(bytes32) view returns (uint128)'], provider);
  
  const tokenS = new ethers.Contract(process.env.TOKENS_ADDRESS, ['function symbol() view returns (string)', 'function balanceOf(address) view returns (uint256)', 'function approve(address,uint256)', 'function transfer(address,uint256)'], wallet);
  const tokenA = new ethers.Contract(process.env.TOKENA_ADDRESS, ['function symbol() view returns (string)', 'function balanceOf(address) view returns (uint256)', 'function approve(address,uint256)', 'function transfer(address,uint256)'], wallet);
  const tokenB = new ethers.Contract(process.env.TOKENB_ADDRESS, ['function symbol() view returns (string)', 'function balanceOf(address) view returns (uint256)', 'function approve(address,uint256)', 'function transfer(address,uint256)'], wallet);
  const tokenC = new ethers.Contract(process.env.TOKENC_ADDRESS, ['function symbol() view returns (string)', 'function balanceOf(address) view returns (uint256)', 'function approve(address,uint256)', 'function transfer(address,uint256)'], wallet);

  const pools = [
    { name: "TOKENA/TOKENS", token0: tokenA, token1: tokenS, addr0: process.env.TOKENA_ADDRESS, addr1: process.env.TOKENS_ADDRESS, sqrtPrice: BigInt(Math.floor(Math.sqrt(10) * Number(2n ** 96n))) },
    { name: "TOKENB/TOKENS", token0: tokenB, token1: tokenS, addr0: process.env.TOKENB_ADDRESS, addr1: process.env.TOKENS_ADDRESS, sqrtPrice: BigInt(Math.floor(Math.sqrt(20) * Number(2n ** 96n))) },
    { name: "TOKENC/TOKENS", token0: tokenC, token1: tokenS, addr0: process.env.TOKENC_ADDRESS, addr1: process.env.TOKENS_ADDRESS, sqrtPrice: BigInt(Math.floor(Math.sqrt(1) * Number(2n ** 96n))) }
  ];

  // STEP 1: Initialize Pools
  console.log("\n" + "=".repeat(80));
  console.log("STEP 1: INITIALIZE POOLS");
  console.log("=".repeat(80));
  
  for (const pool of pools) {
    const poolKey = [pool.addr0, pool.addr1, 3000, 60, ethers.ZeroAddress];
    pool.poolKey = poolKey;
    pool.poolId = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['tuple(address,address,uint24,int24,address)'], [poolKey]));
    
    try {
      const slot0 = await stateView.getSlot0(pool.poolId);
      console.log(`✅ ${pool.name} already initialized, tick: ${slot0[1].toString()}`);
    } catch (e) {
      console.log(`Initializing ${pool.name}...`);
      const tx = await poolManager.initialize(poolKey, pool.sqrtPrice, { gasLimit: 5000000 });
      await tx.wait();
      console.log(`✅ ${pool.name} initialized!`);
    }
  }

  // STEP 2: Approve Tokens
  console.log("\n" + "=".repeat(80));
  console.log("STEP 2: APPROVE TOKENS");
  console.log("=".repeat(80));
  
  let tx = await tokenS.approve(swapRouter.target, ethers.MaxUint256);
  await tx.wait();
  console.log("✅ TOKENS approved to SwapRouter");
  
  tx = await tokenA.approve(swapRouter.target, ethers.MaxUint256);
  await tx.wait();
  console.log("✅ TOKENA approved to SwapRouter");

  tx = await tokenB.approve(swapRouter.target, ethers.MaxUint256);
  await tx.wait();
  console.log("✅ TOKENB approved to SwapRouter");

  tx = await tokenC.approve(swapRouter.target, ethers.MaxUint256);
  await tx.wait();
  console.log("✅ TOKENC approved to SwapRouter");

  // STEP 3: Add Liquidity
  console.log("\n" + "=".repeat(80));
  console.log("STEP 3: ADD LIQUIDITY");
  console.log("=".repeat(80));
  
  for (const pool of pools) {
    const liquidityBefore = await stateView.getLiquidity(pool.poolId);
    console.log(`\n${pool.name}:`);
    console.log(`  Liquidity before: ${liquidityBefore.toString()}`);
    
    tx = await pool.token0.transfer(liquidityRouter.target, ethers.parseEther('1000'));
    await tx.wait();
    
    tx = await pool.token1.transfer(liquidityRouter.target, ethers.parseEther('1000'));
    await tx.wait();
    console.log(`  ✅ Tokens transferred to router`);
    
    tx = await liquidityRouter.addLiquidity(pool.poolKey, -600, 600, ethers.parseEther('100'));
    await tx.wait();
    console.log(`  ✅ Liquidity added!`);
    
    const liquidityAfter = await stateView.getLiquidity(pool.poolId);
    console.log(`  Liquidity after: ${liquidityAfter.toString()}`);
    console.log(`  Increase: ${(liquidityAfter - liquidityBefore).toString()}`);
  }

  // STEP 4: Execute Swaps
  console.log("\n" + "=".repeat(80));
  console.log("STEP 4: EXECUTE SWAPS");
  console.log("=".repeat(80));

  // Swap 1: TOKENS -> TOKENA (expected ~10:1)
  console.log("\nSwap 1: 10 TOKENS -> TOKENA (expected ~100 TOKENA)");
  let balS = await tokenS.balanceOf(wallet.address);
  let balA = await tokenA.balanceOf(wallet.address);
  console.log(`  Before: ${ethers.formatEther(balS)} TOKENS, ${ethers.formatEther(balA)} TOKENA`);
  
  tx = await swapRouter.swap(
    pools[0].poolKey,
    [false, ethers.parseEther("10"), 0],
    { gasLimit: 500000 }
  );
  await tx.wait();
  
  balS = await tokenS.balanceOf(wallet.address);
  balA = await tokenA.balanceOf(wallet.address);
  console.log(`  After: ${ethers.formatEther(balS)} TOKENS, ${ethers.formatEther(balA)} TOKENA`);
  console.log(`  ✅ Swap executed!`);

  // Swap 2: TOKENS -> TOKENB (expected ~20:1)
  console.log("\nSwap 2: 10 TOKENS -> TOKENB (expected ~200 TOKENB)");
  balS = await tokenS.balanceOf(wallet.address);
  let balB = await tokenB.balanceOf(wallet.address);
  console.log(`  Before: ${ethers.formatEther(balS)} TOKENS, ${ethers.formatEther(balB)} TOKENB`);
  
  tx = await swapRouter.swap(
    pools[1].poolKey,
    [false, ethers.parseEther("10"), 0],
    { gasLimit: 500000 }
  );
  await tx.wait();
  
  balS = await tokenS.balanceOf(wallet.address);
  balB = await tokenB.balanceOf(wallet.address);
  console.log(`  After: ${ethers.formatEther(balS)} TOKENS, ${ethers.formatEther(balB)} TOKENB`);
  console.log(`  ✅ Swap executed!`);

  // Swap 3: TOKENS -> TOKENC (expected ~1:1)
  console.log("\nSwap 3: 10 TOKENS -> TOKENC (expected ~10 TOKENC)");
  balS = await tokenS.balanceOf(wallet.address);
  let balC = await tokenC.balanceOf(wallet.address);
  console.log(`  Before: ${ethers.formatEther(balS)} TOKENS, ${ethers.formatEther(balC)} TOKENC`);
  
  tx = await swapRouter.swap(
    pools[2].poolKey,
    [false, ethers.parseEther("10"), 0],
    { gasLimit: 500000 }
  );
  await tx.wait();
  
  balS = await tokenS.balanceOf(wallet.address);
  balC = await tokenC.balanceOf(wallet.address);
  console.log(`  After: ${ethers.formatEther(balS)} TOKENS, ${ethers.formatEther(balC)} TOKENC`);
  console.log(`  ✅ Swap executed!`);

  // STEP 5: Remove Liquidity
  console.log("\n" + "=".repeat(80));
  console.log("STEP 5: REMOVE LIQUIDITY");
  console.log("=".repeat(80));
  
  const liquidityRouterWithRemove = new ethers.Contract(
    process.env.LIQUIDITY_ROUTER_ADDRESS,
    ['function removeLiquidity((address,address,uint24,int24,address), int24, int24, int256)'],
    wallet
  );
  
  for (const pool of pools) {
    const liquidityBefore = await stateView.getLiquidity(pool.poolId);
    console.log(`\n${pool.name}:`);
    console.log(`  Liquidity before: ${liquidityBefore.toString()}`);
    
    tx = await liquidityRouterWithRemove.removeLiquidity(
      pool.poolKey,
      -600,
      600,
      ethers.parseEther('50'),
      { gasLimit: 5000000 }
    );
    await tx.wait();
    console.log(`  ✅ Liquidity removed!`);
    
    const liquidityAfter = await stateView.getLiquidity(pool.poolId);
    console.log(`  Liquidity after: ${liquidityAfter.toString()}`);
    console.log(`  Decrease: ${(liquidityBefore - liquidityAfter).toString()}`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅✅✅ ALL TESTS PASSED! ✅✅✅");
  console.log("=".repeat(80));
}

main().catch((error) => {
  console.error("❌ ERROR:", error);
  process.exitCode = 1;
});
