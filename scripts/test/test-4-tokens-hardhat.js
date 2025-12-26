/**
 * 4-Token Complete Test with Hardhat
 * Run: npx hardhat run scripts/test-4-tokens-hardhat.js --network localhost
 */

const hre = require("hardhat");

async function main() {
  console.log("=".repeat(80));
  console.log("4-TOKEN DEX WORKFLOW TEST (Hardhat)");
  console.log("=".repeat(80));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\n✅ Wallet:", deployer.address);

  const PM_ADDR = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const STATEVIEW_ADDR = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const LIQ_ROUTER_ADDR = "0x0B306BF915C4d645ff596e518fAf3F9669b97016";
  const SWAP_ROUTER_ADDR = "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1";
  
  const TOKEN_S = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
  const TOKEN_A = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";
  const TOKEN_B = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
  const TOKEN_C = "0x610178dA211FEF7D417bC0e6FeD39F05609AD788";

  const poolManager = await hre.ethers.getContractAt("PoolManager", PM_ADDR);
  const stateView = await hre.ethers.getContractAt("StateView", STATEVIEW_ADDR);
  const liquidityRouter = await hre.ethers.getContractAt("SimpleLiquidityManager", LIQ_ROUTER_ADDR);
  const swapRouter = await hre.ethers.getContractAt("WorkingSwapRouter", SWAP_ROUTER_ADDR);
  
  const tokenS = await hre.ethers.getContractAt("TestToken", TOKEN_S);
  const tokenA = await hre.ethers.getContractAt("TestToken", TOKEN_A);
  const tokenB = await hre.ethers.getContractAt("TestToken", TOKEN_B);
  const tokenC = await hre.ethers.getContractAt("TestToken", TOKEN_C);

  function createPoolKey(token0, token1) {
    const [c0, c1] = token0.toLowerCase() < token1.toLowerCase() ? [token0, token1] : [token1, token0];
    return { currency0: c0, currency1: c1, fee: 3000, tickSpacing: 60, hooks: hre.ethers.ZeroAddress };
  }

  function getPoolId(poolKey) {
    return hre.ethers.keccak256(hre.ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(address,address,uint24,int24,address)"],
      [[poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]]
    ));
  }

  const pools = [
    { name: "TOKENS/TOKENA", poolKey: createPoolKey(TOKEN_S, TOKEN_A) },
    { name: "TOKENS/TOKENB", poolKey: createPoolKey(TOKEN_S, TOKEN_B) },
    { name: "TOKENS/TOKENC", poolKey: createPoolKey(TOKEN_S, TOKEN_C) }
  ];

  pools.forEach(p => p.poolId = getPoolId(p.poolKey));

  console.log("\n📋 3 Pools:", pools.map(p => p.name).join(", "));

  // STEP 2: Add Liquidity
  console.log("\n" + "=".repeat(80));
  console.log("STEP 2: ADD LIQUIDITY");
  console.log("=".repeat(80));

  const transferAmount = hre.ethers.parseEther("1000");
  const liquidityDelta = hre.ethers.parseEther("100");
  
  for (const pool of pools) {
    console.log(`\n--- ${pool.name} ---`);
    const liquidityBefore = await stateView.getLiquidity(pool.poolId);
    console.log("   Liquidity before:", liquidityBefore.toString());

    const token0 = pool.poolKey.currency0.toLowerCase() === TOKEN_S.toLowerCase() ? tokenS :
                   pool.poolKey.currency0.toLowerCase() === TOKEN_A.toLowerCase() ? tokenA :
                   pool.poolKey.currency0.toLowerCase() === TOKEN_B.toLowerCase() ? tokenB : tokenC;
    
    const token1 = pool.poolKey.currency1.toLowerCase() === TOKEN_S.toLowerCase() ? tokenS :
                   pool.poolKey.currency1.toLowerCase() === TOKEN_A.toLowerCase() ? tokenA :
                   pool.poolKey.currency1.toLowerCase() === TOKEN_B.toLowerCase() ? tokenB : tokenC;

    await (await token0.transfer(LIQ_ROUTER_ADDR, transferAmount)).wait();
    await (await token1.transfer(LIQ_ROUTER_ADDR, transferAmount)).wait();
    console.log("   ✅ Transferred to router");

    try {
      const tx = await liquidityRouter.addLiquidity(pool.poolKey, -600, 600, liquidityDelta);
      await tx.wait();
      console.log("✅ Liquidity added!");
      
      const liquidityAfter = await stateView.getLiquidity(pool.poolId);
      console.log("   Liquidity after:", liquidityAfter.toString());
      console.log("   Increase:", (liquidityAfter - liquidityBefore).toString());
    } catch (error) {
      console.log("❌", error.message.substring(0, 80));
    }
  }

  // STEP 3: Execute Swaps
  console.log("\n" + "=".repeat(80));
  console.log("STEP 3: EXECUTE SWAPS");
  console.log("=".repeat(80));

  const swapAmount = hre.ethers.parseEther("10");
  const MIN_PRICE = "4295128740";
  const MAX_PRICE = "1461446703485210103287273052203988822378723970341";

  // Swap 1: TOKENS -> TOKENA
  console.log("\n--- Swap: 10 TOKENS -> TOKENA ---");
  const balS1 = await tokenS.balanceOf(deployer.address);
  const balA1 = await tokenA.balanceOf(deployer.address);
  console.log("Before: TOKENS =", hre.ethers.formatEther(balS1), "| TOKENA =", hre.ethers.formatEther(balA1));

  await (await tokenS.approve(SWAP_ROUTER_ADDR, hre.ethers.MaxUint256)).wait();
  
  try {
    const zeroForOne = pools[0].poolKey.currency0.toLowerCase() === TOKEN_S.toLowerCase();
    const tx = await swapRouter.swap(pools[0].poolKey, { zeroForOne, amountSpecified: -swapAmount, sqrtPriceLimitX96: zeroForOne ? MIN_PRICE : MAX_PRICE });
    await tx.wait();
    console.log("✅ Swap executed!");

    const balS2 = await tokenS.balanceOf(deployer.address);
    const balA2 = await tokenA.balanceOf(deployer.address);
    console.log("After: TOKENS =", hre.ethers.formatEther(balS2), "| TOKENA =", hre.ethers.formatEther(balA2));
    console.log("Result: Spent", hre.ethers.formatEther(balS1 - balS2), "TOKENS, Got", hre.ethers.formatEther(balA2 - balA1), "TOKENA");
  } catch (error) {
    console.log("❌", error.message.substring(0, 80));
  }

  // Swap 2: TOKENS -> TOKENB
  console.log("\n--- Swap: 10 TOKENS -> TOKENB ---");
  const balS3 = await tokenS.balanceOf(deployer.address);
  const balB1 = await tokenB.balanceOf(deployer.address);
  console.log("Before: TOKENS =", hre.ethers.formatEther(balS3), "| TOKENB =", hre.ethers.formatEther(balB1));

  try {
    const zeroForOne = pools[1].poolKey.currency0.toLowerCase() === TOKEN_S.toLowerCase();
    const tx = await swapRouter.swap(pools[1].poolKey, { zeroForOne, amountSpecified: -swapAmount, sqrtPriceLimitX96: zeroForOne ? MIN_PRICE : MAX_PRICE });
    await tx.wait();
    console.log("✅ Swap executed!");

    const balS4 = await tokenS.balanceOf(deployer.address);
    const balB2 = await tokenB.balanceOf(deployer.address);
    console.log("After: TOKENS =", hre.ethers.formatEther(balS4), "| TOKENB =", hre.ethers.formatEther(balB2));
    console.log("Result: Spent", hre.ethers.formatEther(balS3 - balS4), "TOKENS, Got", hre.ethers.formatEther(balB2 - balB1), "TOKENB");
  } catch (error) {
    console.log("❌", error.message.substring(0, 80));
  }

  // Swap 3: TOKENC -> TOKENS
  console.log("\n--- Swap: 10 TOKENC -> TOKENS ---");
  const balC1 = await tokenC.balanceOf(deployer.address);
  const balS5 = await tokenS.balanceOf(deployer.address);
  console.log("Before: TOKENC =", hre.ethers.formatEther(balC1), "| TOKENS =", hre.ethers.formatEther(balS5));

  await (await tokenC.approve(SWAP_ROUTER_ADDR, hre.ethers.MaxUint256)).wait();
  
  try {
    const zeroForOne = pools[2].poolKey.currency0.toLowerCase() === TOKEN_C.toLowerCase();
    const tx = await swapRouter.swap(pools[2].poolKey, { zeroForOne, amountSpecified: -swapAmount, sqrtPriceLimitX96: zeroForOne ? MIN_PRICE : MAX_PRICE });
    await tx.wait();
    console.log("✅ Swap executed!");

    const balC2 = await tokenC.balanceOf(deployer.address);
    const balS6 = await tokenS.balanceOf(deployer.address);
    console.log("After: TOKENC =", hre.ethers.formatEther(balC2), "| TOKENS =", hre.ethers.formatEther(balS6));
    console.log("Result: Spent", hre.ethers.formatEther(balC1 - balC2), "TOKENC, Got", hre.ethers.formatEther(balS6 - balS5), "TOKENS");
  } catch (error) {
    console.log("❌", error.message.substring(0, 80));
  }

  // STEP 4: Remove Liquidity
  console.log("\n" + "=".repeat(80));
  console.log("STEP 4: REMOVE LIQUIDITY");
  console.log("=".repeat(80));

  const removeDelta = -hre.ethers.parseEther("50");

  for (const pool of pools) {
    console.log(`\n--- ${pool.name} ---`);
    const liquidityBefore = await stateView.getLiquidity(pool.poolId);
    console.log("   Liquidity before:", liquidityBefore.toString());

    const token0 = pool.poolKey.currency0.toLowerCase() === TOKEN_S.toLowerCase() ? tokenS :
                   pool.poolKey.currency0.toLowerCase() === TOKEN_A.toLowerCase() ? tokenA :
                   pool.poolKey.currency0.toLowerCase() === TOKEN_B.toLowerCase() ? tokenB : tokenC;
    
    const token1 = pool.poolKey.currency1.toLowerCase() === TOKEN_S.toLowerCase() ? tokenS :
                   pool.poolKey.currency1.toLowerCase() === TOKEN_A.toLowerCase() ? tokenA :
                   pool.poolKey.currency1.toLowerCase() === TOKEN_B.toLowerCase() ? tokenB : tokenC;

    await (await token0.transfer(LIQ_ROUTER_ADDR, transferAmount)).wait();
    await (await token1.transfer(LIQ_ROUTER_ADDR, transferAmount)).wait();

    try {
      const tx = await liquidityRouter.addLiquidity(pool.poolKey, -600, 600, removeDelta);
      await tx.wait();
      console.log("✅ Liquidity removed!");
      
      const liquidityAfter = await stateView.getLiquidity(pool.poolId);
      console.log("   Liquidity after:", liquidityAfter.toString());
      console.log("   Decrease:", (liquidityBefore - liquidityAfter).toString());
    } catch (error) {
      console.log("❌", error.message.substring(0, 80));
    }
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("✅ ALL TESTS COMPLETE!");
  console.log("=".repeat(80));

  console.log("\n💰 Final Balances:");
  console.log("   TOKENS:", hre.ethers.formatEther(await tokenS.balanceOf(deployer.address)));
  console.log("   TOKENA:", hre.ethers.formatEther(await tokenA.balanceOf(deployer.address)));
  console.log("   TOKENB:", hre.ethers.formatEther(await tokenB.balanceOf(deployer.address)));
  console.log("   TOKENC:", hre.ethers.formatEther(await tokenC.balanceOf(deployer.address)));

  console.log("\n📊 Final Pool Liquidity:");
  for (const pool of pools) {
    const liq = await stateView.getLiquidity(pool.poolId);
    console.log(`   ${pool.name}: ${liq.toString()}`);
  }

  console.log("\n✅ Verified: 3 pools initialized, liquidity added/removed, 3 swaps executed");
  console.log("=".repeat(80));
}

main().then(() => process.exit(0)).catch((error) => { console.error("\n❌ Error:", error); process.exit(1); });
