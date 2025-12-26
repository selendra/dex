/**
 * Pure Ethers.js - SWAP TOKENS (REAL IMPLEMENTATION)
 * 
 * Actually executes swaps using PoolSwapTest router
 * Based on: https://www.v4-by-example.org/swap
 * 
 * Install: npm install ethers dotenv
 * Run: node ethers-examples/06-swap.js
 */

const { ethers } = require("ethers");
require("dotenv").config();

// PoolSwapTest ABI - This is the test router for swaps
const SWAP_ROUTER_ABI = [
  "function swap((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, (bool takeClaims, bool settleUsingBurn) testSettings, bytes hookData) external payable returns (int256, int256)"
];

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount) external"
];

const STATE_VIEW_ABI = [
  "function getSlot0(bytes32 id) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)"
];

// Price limits from TickMath
const MIN_PRICE_LIMIT = "4295128740"; // TickMath.MIN_SQRT_PRICE + 1
const MAX_PRICE_LIMIT = "1461446703485210103287273052203988822378723970341"; // TickMath.MAX_SQRT_PRICE - 1

async function main() {
  console.log("=".repeat(70));
  console.log("🔄 SWAP TOKENS - REAL IMPLEMENTATION");
  console.log("=".repeat(70));

  // ============================================================================
  // Setup
  // ============================================================================
  const provider = new ethers.JsonRpcProvider(
    process.env.RPC_URL || "http://localhost:8545"
  );
  
  const wallet = new ethers.Wallet(
    process.env.PRIVATE_KEY || 
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    provider
  );
  
  console.log("\n✅ Wallet:", wallet.address);
  console.log("✅ Balance:", ethers.formatEther(await provider.getBalance(wallet.address)), "ETH");

  // ============================================================================
  // Get Token Addresses
  // ============================================================================
  const token0Address = process.env.TOKEN0_ADDRESS;
  const token1Address = process.env.TOKEN1_ADDRESS;
  
  if (!token0Address || !token1Address) {
    console.log("\n❌ Set TOKEN0_ADDRESS and TOKEN1_ADDRESS in .env");
    process.exit(1);
  }

  // Sort tokens
  const [currency0, currency1] = 
    token0Address.toLowerCase() < token1Address.toLowerCase()
      ? [token0Address, token1Address]
      : [token1Address, token0Address];

  const token0 = new ethers.Contract(currency0, ERC20_ABI, wallet);
  const token1 = new ethers.Contract(currency1, ERC20_ABI, wallet);

  const [symbol0, symbol1] = await Promise.all([
    token0.symbol(),
    token1.symbol()
  ]);

  console.log(`\n🪙 Pool: ${symbol0}/${symbol1}`);
  console.log("   Token0:", currency0);
  console.log("   Token1:", currency1);

  // ============================================================================
  // Check Balances Before Swap
  // ============================================================================
  console.log("\n💰 Balances Before Swap:");
  
  const balance0Before = await token0.balanceOf(wallet.address);
  const balance1Before = await token1.balanceOf(wallet.address);
  
  console.log(`   ${symbol0}:`, ethers.formatEther(balance0Before));
  console.log(`   ${symbol1}:`, ethers.formatEther(balance1Before));

  // Mint tokens if needed
  const swapAmount = ethers.parseEther("1"); // Swap 1 token
  
  if (balance0Before < swapAmount) {
    console.log(`\n🪙 Minting ${symbol0}...`);
    try {
      const tx = await token0.mint(wallet.address, ethers.parseEther("10"));
      await tx.wait();
      console.log("   ✅ Minted 10", symbol0);
    } catch (e) {
      console.log("   ⚠️  Could not mint - ensure you have tokens");
    }
  }

  // ============================================================================
  // Setup SwapRouter (PoolSwapTest)
  // ============================================================================
  console.log("\n🔧 Setting up SwapRouter...");
  
  const swapRouterAddress = process.env.SWAP_ROUTER_ADDRESS;
  
  if (!swapRouterAddress) {
    console.log("\n⚠️  SWAP_ROUTER_ADDRESS not set in .env");
    console.log("\nTo deploy PoolSwapTest:");
    console.log("  npx hardhat run scripts/deploy-test-routers.js --network localhost");
    console.log("\nOr add to .env:");
    console.log("  SWAP_ROUTER_ADDRESS=0x...");
    process.exit(1);
  }

  const swapRouter = new ethers.Contract(
    swapRouterAddress,
    SWAP_ROUTER_ABI,
    wallet
  );
  
  console.log("✅ SwapRouter:", swapRouterAddress);

  // ============================================================================
  // Approve Tokens to SwapRouter
  // ============================================================================
  console.log("\n✅ Approving tokens...");
  
  const allowance0 = await token0.allowance(wallet.address, swapRouterAddress);
  const allowance1 = await token1.allowance(wallet.address, swapRouterAddress);
  
  if (allowance0 < swapAmount) {
    console.log(`   Approving ${symbol0}...`);
    const tx = await token0.approve(swapRouterAddress, ethers.MaxUint256);
    await tx.wait();
    console.log("   ✅ Approved");
  } else {
    console.log(`   ✅ ${symbol0} already approved`);
  }
  
  if (allowance1 < swapAmount) {
    console.log(`   Approving ${symbol1}...`);
    const tx = await token1.approve(swapRouterAddress, ethers.MaxUint256);
    await tx.wait();
    console.log("   ✅ Approved");
  } else {
    console.log(`   ✅ ${symbol1} already approved`);
  }

  // ============================================================================
  // Create PoolKey
  // ============================================================================
  const poolKey = {
    currency0: currency0,
    currency1: currency1,
    fee: 3000,
    tickSpacing: 60,
    hooks: ethers.ZeroAddress
  };

  const poolId = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(address,address,uint24,int24,address)"],
      [[poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]]
    )
  );

  // ============================================================================
  // Check Pool State
  // ============================================================================
  const stateViewAddress = process.env.STATE_VIEW_ADDRESS ||
    "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
  
  const stateView = new ethers.Contract(stateViewAddress, STATE_VIEW_ABI, provider);
  
  try {
    const slot0 = await stateView.getSlot0(poolId);
    const Q96 = 2n ** 96n;
    const sqrtPrice = Number(slot0.sqrtPriceX96) / Number(Q96);
    const price = sqrtPrice * sqrtPrice;
    
    console.log("\n📊 Pool State Before:");
    console.log("   Current Tick:", slot0.tick.toString());
    console.log(`   Price (${symbol1}/${symbol0}):`, price.toFixed(6));
  } catch (e) {
    console.log("\n⚠️  Could not read pool state");
  }

  // ============================================================================
  // Execute Swap!
  // ============================================================================
  console.log("\n🔄 EXECUTING SWAP...");
  console.log("=".repeat(70));

  // Swap parameters
  const zeroForOne = true; // token0 -> token1
  const amountSpecified = -swapAmount; // Negative = exact input
  const sqrtPriceLimitX96 = zeroForOne ? MIN_PRICE_LIMIT : MAX_PRICE_LIMIT;

  console.log("Parameters:");
  console.log(`   Direction: ${symbol0} → ${symbol1}`);
  console.log("   Amount In:", ethers.formatEther(swapAmount), symbol0);
  console.log("   Type: Exact Input");
  console.log("   Slippage: Unlimited (for testing)");

  const swapParams = {
    zeroForOne: zeroForOne,
    amountSpecified: amountSpecified,
    sqrtPriceLimitX96: sqrtPriceLimitX96
  };

  // Test settings: take ERC20s, not claims
  const testSettings = {
    takeClaims: false,
    settleUsingBurn: false
  };

  const hookData = "0x";

  try {
    console.log("\n📤 Sending transaction...");
    const tx = await swapRouter.swap(
      poolKey,
      swapParams,
      testSettings,
      hookData
    );
    
    console.log("   TX Hash:", tx.hash);
    console.log("   ⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    
    console.log("\n✅ SWAP EXECUTED!");
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas Used:", receipt.gasUsed.toString());

    // Check balances after
    const balance0After = await token0.balanceOf(wallet.address);
    const balance1After = await token1.balanceOf(wallet.address);
    
    console.log("\n💰 Balances After Swap:");
    console.log(`   ${symbol0}:`, ethers.formatEther(balance0After));
    console.log(`   ${symbol1}:`, ethers.formatEther(balance1After));
    
    const token0Spent = balance0Before - balance0After;
    const token1Received = balance1After - balance1Before;
    
    console.log("\n💸 Swap Result:");
    console.log(`   ${symbol0} Spent:`, ethers.formatEther(token0Spent));
    console.log(`   ${symbol1} Received:`, ethers.formatEther(token1Received));
    
    if (token1Received > 0n) {
      const effectivePrice = Number(token0Spent) / Number(token1Received);
      console.log(`   Effective Price:`, effectivePrice.toFixed(6), `${symbol0}/${symbol1}`);
    }

    // Check pool state after
    try {
      const slot0After = await stateView.getSlot0(poolId);
      const Q96 = 2n ** 96n;
      const sqrtPriceAfter = Number(slot0After.sqrtPriceX96) / Number(Q96);
      const priceAfter = sqrtPriceAfter * sqrtPriceAfter;
      
      console.log("\n📊 Pool State After:");
      console.log("   Current Tick:", slot0After.tick.toString());
      console.log(`   Price (${symbol1}/${symbol0}):`, priceAfter.toFixed(6));
    } catch (e) {
      // Ignore
    }

  } catch (error) {
    console.error("\n❌ Error executing swap:");
    console.error("   ", error.message);
    
    if (error.message.includes("NOT_INITIALIZED")) {
      console.log("\n💡 Pool not initialized! Run:");
      console.log("   node ethers-examples/01-initialize-pool.js");
    } else if (error.message.includes("insufficient liquidity")) {
      console.log("\n💡 Pool has no liquidity! Run:");
      console.log("   node ethers-examples/05-add-liquidity.js");
    }
    throw error;
  }

  console.log("\n" + "=".repeat(70));
  console.log("✅ COMPLETE!");
  console.log("=".repeat(70));
  
  console.log("\n🚀 Try More Swaps:");
  console.log("   - Swap in opposite direction (set zeroForOne = false)");
  console.log("   - Try different amounts");
  console.log("   - Add more liquidity for better prices");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });
