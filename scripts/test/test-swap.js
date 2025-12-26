const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║          DEX Swap Test - Full Workflow                ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  const [deployer] = await ethers.getSigners();
  console.log("Testing with account:", deployer.address);
  
  // Load deployed contract addresses
  const fs = require('fs');
  const path = require('path');
  const configPath = path.join(__dirname, '../api/test-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  // Connect to contracts
  const poolManager = await ethers.getContractAt("PoolManager", config.poolManager);
  const positionManager = await ethers.getContractAt("PositionManager", config.positionManager);
  const swapRouter = await ethers.getContractAt("WorkingSwapRouter", config.swapRouter);
  const tokenA = await ethers.getContractAt("TestToken", config.tokenA);
  const tokenB = await ethers.getContractAt("TestToken", config.tokenB);

  console.log("\n➤ Contract Connections:");
  console.log(`  PoolManager: ${config.poolManager}`);
  console.log(`  PositionManager: ${config.positionManager}`);
  console.log(`  SwapRouter: ${config.swapRouter}`);
  console.log(`  Token A (TKNA): ${config.tokenA}`);
  console.log(`  Token B (TKNB): ${config.tokenB}`);

  // Check initial balances
  const balanceA_initial = await tokenA.balanceOf(deployer.address);
  const balanceB_initial = await tokenB.balanceOf(deployer.address);
  console.log("\n➤ Initial Token Balances:");
  console.log(`  TKNA: ${ethers.formatEther(balanceA_initial)}`);
  console.log(`  TKNB: ${ethers.formatEther(balanceB_initial)}`);

  // Pool parameters
  const poolKey = {
    currency0: config.currency0,
    currency1: config.currency1,
    fee: 3000,
    tickSpacing: 60,
    hooks: ethers.ZeroAddress
  };

  console.log("\n➤ Pool Configuration:");
  console.log(`  Currency0: ${poolKey.currency0}`);
  console.log(`  Currency1: ${poolKey.currency1}`);
  console.log(`  Fee: ${poolKey.fee} (0.3%)`);
  console.log(`  Tick Spacing: ${poolKey.tickSpacing}`);

  // Step 1: Initialize Pool
  console.log("\n" + "=".repeat(60));
  console.log("STEP 1: Initialize Pool");
  console.log("=".repeat(60));

  const sqrtPriceX96 = "79228162514264337593543950336"; // 1:1 price
  
  try {
    const initTx = await poolManager.initialize(poolKey, sqrtPriceX96);
    await initTx.wait();
    console.log("  ✓ Pool initialized at 1:1 price");
    console.log(`  Transaction: ${initTx.hash}`);
  } catch (error) {
    if (error.message.includes("PoolAlreadyInitialized")) {
      console.log("  ✓ Pool already initialized");
    } else {
      console.log("  ⚠ Initialization error:", error.message);
    }
  }

  // Step 2: Approve tokens for liquidity
  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: Approve Tokens for Liquidity");
  console.log("=".repeat(60));

  const liquidityAmount = ethers.parseEther("1000"); // 1000 tokens
  
  console.log(`  Approving ${ethers.formatEther(liquidityAmount)} TKNA...`);
  const approveA1 = await tokenA.approve(config.positionManager, liquidityAmount);
  await approveA1.wait();
  console.log(`  ✓ TKNA approved (tx: ${approveA1.hash.slice(0, 10)}...)`);

  console.log(`  Approving ${ethers.formatEther(liquidityAmount)} TKNB...`);
  const approveB1 = await tokenB.approve(config.positionManager, liquidityAmount);
  await approveB1.wait();
  console.log(`  ✓ TKNB approved (tx: ${approveB1.hash.slice(0, 10)}...)`);

  // Step 3: Add Liquidity
  console.log("\n" + "=".repeat(60));
  console.log("STEP 3: Add Liquidity to Pool");
  console.log("=".repeat(60));

  const mintParams = {
    poolKey: poolKey,
    tickLower: -887220,
    tickUpper: 887220,
    liquidity: ethers.parseEther("1000"),
    amount0Max: liquidityAmount,
    amount1Max: liquidityAmount,
    recipient: deployer.address,
    deadline: Math.floor(Date.now() / 1000) + 300
  };

  try {
    console.log("  Adding liquidity (full range)...");
    const mintTx = await positionManager.mint(mintParams);
    const receipt = await mintTx.wait();
    console.log(`  ✓ Liquidity added successfully`);
    console.log(`  Transaction: ${mintTx.hash}`);
    console.log(`  Gas used: ${receipt.gasUsed.toString()}`);
  } catch (error) {
    console.log("  ⚠ Liquidity addition error:", error.message.slice(0, 100));
  }

  // Step 4: Approve tokens for swap
  console.log("\n" + "=".repeat(60));
  console.log("STEP 4: Approve Tokens for Swap");
  console.log("=".repeat(60));

  const swapAmount = ethers.parseEther("10"); // 10 tokens
  
  console.log(`  Approving ${ethers.formatEther(swapAmount)} TKNA for swap...`);
  const approveA2 = await tokenA.approve(config.swapRouter, swapAmount);
  await approveA2.wait();
  console.log(`  ✓ TKNA approved (tx: ${approveA2.hash.slice(0, 10)}...)`);

  // Step 5: Execute Swap
  console.log("\n" + "=".repeat(60));
  console.log("STEP 5: Execute Swap (TKNA → TKNB)");
  console.log("=".repeat(60));

  const swapParams = {
    poolKey: poolKey,
    zeroForOne: true, // Swapping token0 (TKNA) for token1 (TKNB)
    amountSpecified: swapAmount,
    sqrtPriceLimitX96: "4295128740", // Minimum price limit
    hookData: "0x"
  };

  console.log(`  Swapping ${ethers.formatEther(swapAmount)} TKNA for TKNB...`);
  console.log(`  Zero for One: ${swapParams.zeroForOne}`);
  
  try {
    const swapTx = await swapRouter.swap(swapParams);
    const receipt = await swapTx.wait();
    console.log(`  ✓ Swap executed successfully`);
    console.log(`  Transaction: ${swapTx.hash}`);
    console.log(`  Gas used: ${receipt.gasUsed.toString()}`);

    // Parse events for swap details
    const events = receipt.logs;
    console.log(`  Events emitted: ${events.length}`);
  } catch (error) {
    console.log("  ⚠ Swap error:", error.message.slice(0, 200));
  }

  // Step 6: Check final balances
  console.log("\n" + "=".repeat(60));
  console.log("STEP 6: Verify Final Balances");
  console.log("=".repeat(60));

  const balanceA_final = await tokenA.balanceOf(deployer.address);
  const balanceB_final = await tokenB.balanceOf(deployer.address);
  
  const changeA = balanceA_initial - balanceA_final;
  const changeB = balanceB_final - balanceB_initial;

  console.log("\n  Final Token Balances:");
  console.log(`  TKNA: ${ethers.formatEther(balanceA_final)}`);
  console.log(`  TKNB: ${ethers.formatEther(balanceB_final)}`);
  
  console.log("\n  Changes:");
  console.log(`  TKNA: ${changeA > 0 ? '-' : '+'}${ethers.formatEther(changeA > 0 ? changeA : -changeA)}`);
  console.log(`  TKNB: ${changeB > 0 ? '+' : '-'}${ethers.formatEther(changeB > 0 ? changeB : -changeB)}`);

  // Step 7: Execute reverse swap (optional)
  console.log("\n" + "=".repeat(60));
  console.log("STEP 7: Execute Reverse Swap (TKNB → TKNA)");
  console.log("=".repeat(60));

  const reverseSwapAmount = ethers.parseEther("5"); // 5 tokens
  
  console.log(`  Approving ${ethers.formatEther(reverseSwapAmount)} TKNB for swap...`);
  const approveB2 = await tokenB.approve(config.swapRouter, reverseSwapAmount);
  await approveB2.wait();
  console.log(`  ✓ TKNB approved`);

  const reverseSwapParams = {
    poolKey: poolKey,
    zeroForOne: false, // Swapping token1 (TKNB) for token0 (TKNA)
    amountSpecified: reverseSwapAmount,
    sqrtPriceLimitX96: "1461446703485210103287273052203988822378723970341", // Maximum price limit
    hookData: "0x"
  };

  console.log(`  Swapping ${ethers.formatEther(reverseSwapAmount)} TKNB for TKNA...`);
  
  try {
    const reverseTx = await swapRouter.swap(reverseSwapParams);
    const receipt = await reverseTx.wait();
    console.log(`  ✓ Reverse swap executed successfully`);
    console.log(`  Transaction: ${reverseTx.hash}`);
    console.log(`  Gas used: ${receipt.gasUsed.toString()}`);
  } catch (error) {
    console.log("  ⚠ Reverse swap error:", error.message.slice(0, 200));
  }

  // Final summary
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║               Swap Test Complete!                     ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  const balanceA_final2 = await tokenA.balanceOf(deployer.address);
  const balanceB_final2 = await tokenB.balanceOf(deployer.address);
  
  console.log("Final Balances:");
  console.log(`  TKNA: ${ethers.formatEther(balanceA_final2)}`);
  console.log(`  TKNB: ${ethers.formatEther(balanceB_final2)}`);
  
  console.log("\nTotal Changes from Initial:");
  console.log(`  TKNA: ${ethers.formatEther(balanceA_initial - balanceA_final2)}`);
  console.log(`  TKNB: ${ethers.formatEther(balanceB_final2 - balanceB_initial)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
