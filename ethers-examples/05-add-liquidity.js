/**
 * Pure Ethers.js - ADD LIQUIDITY (REAL IMPLEMENTATION)
 * 
 * Actually adds liquidity to a pool using PoolModifyLiquidityTest
 * Based on: https://www.v4-by-example.org/create-liquidity
 * 
 * Install: npm install ethers dotenv
 * Run: node ethers-examples/05-add-liquidity.js
 */

const { ethers } = require("ethers");
require("dotenv").config();

// PoolModifyLiquidityTest ABI - This is the test router for liquidity
const LIQUIDITY_ROUTER_ABI = [
  "function modifyLiquidity((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt) params, bytes hookData) external payable returns (int256, int256)"
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
  "function getLiquidity(bytes32 id) external view returns (uint128 liquidity)"
];

async function main() {
  console.log("=".repeat(70));
  console.log("💧 ADD LIQUIDITY - REAL IMPLEMENTATION");
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
  // Check and Mint Tokens
  // ============================================================================
  console.log("\n💰 Checking token balances...");
  
  let balance0 = await token0.balanceOf(wallet.address);
  let balance1 = await token1.balanceOf(wallet.address);
  
  console.log(`   ${symbol0}:`, ethers.formatEther(balance0));
  console.log(`   ${symbol1}:`, ethers.formatEther(balance1));

  const requiredAmount = ethers.parseEther("100");
  
  // Mint if needed
  if (balance0 < requiredAmount) {
    console.log(`\n🪙 Minting ${symbol0}...`);
    try {
      const tx = await token0.mint(wallet.address, requiredAmount);
      await tx.wait();
      console.log("   ✅ Minted 100", symbol0);
      balance0 = await token0.balanceOf(wallet.address);
    } catch (e) {
      console.log("   ⚠️  Could not mint (may not be test token)");
    }
  }
  
  if (balance1 < requiredAmount) {
    console.log(`\n🪙 Minting ${symbol1}...`);
    try {
      const tx = await token1.mint(wallet.address, requiredAmount);
      await tx.wait();
      console.log("   ✅ Minted 100", symbol1);
      balance1 = await token1.balanceOf(wallet.address);
    } catch (e) {
      console.log("   ⚠️  Could not mint (may not be test token)");
    }
  }

  // ============================================================================
  // Deploy or Get LiquidityRouter (PoolModifyLiquidityTest)
  // ============================================================================
  console.log("\n🔧 Setting up LiquidityRouter...");
  
  // You need to deploy PoolModifyLiquidityTest first or use deployed address
  const liquidityRouterAddress = process.env.LIQUIDITY_ROUTER_ADDRESS;
  
  if (!liquidityRouterAddress) {
    console.log("\n⚠️  LIQUIDITY_ROUTER_ADDRESS not set in .env");
    console.log("\nTo deploy PoolModifyLiquidityTest:");
    console.log("  npx hardhat run scripts/deploy-test-routers.js --network localhost");
    console.log("\nOr add to .env:");
    console.log("  LIQUIDITY_ROUTER_ADDRESS=0x...");
    process.exit(1);
  }

  const liquidityRouter = new ethers.Contract(
    liquidityRouterAddress,
    LIQUIDITY_ROUTER_ABI,
    wallet
  );
  
  console.log("✅ LiquidityRouter:", liquidityRouterAddress);

  // ============================================================================
  // Approve Tokens to LiquidityRouter
  // ============================================================================
  console.log("\n✅ Approving tokens...");
  
  const allowance0 = await token0.allowance(wallet.address, liquidityRouterAddress);
  const allowance1 = await token1.allowance(wallet.address, liquidityRouterAddress);
  
  if (allowance0 < requiredAmount) {
    console.log(`   Approving ${symbol0}...`);
    const tx = await token0.approve(liquidityRouterAddress, ethers.MaxUint256);
    await tx.wait();
    console.log("   ✅ Approved");
  } else {
    console.log(`   ✅ ${symbol0} already approved`);
  }
  
  if (allowance1 < requiredAmount) {
    console.log(`   Approving ${symbol1}...`);
    const tx = await token1.approve(liquidityRouterAddress, ethers.MaxUint256);
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
  // Check Pool Liquidity Before
  // ============================================================================
  const stateViewAddress = process.env.STATE_VIEW_ADDRESS ||
    "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
  
  const stateView = new ethers.Contract(stateViewAddress, STATE_VIEW_ABI, provider);
  
  let liquidityBefore = 0n;
  try {
    liquidityBefore = await stateView.getLiquidity(poolId);
    console.log("\n📊 Pool Liquidity Before:", liquidityBefore.toString());
  } catch (e) {
    console.log("\n📊 Pool Liquidity Before: 0 (pool not initialized or no liquidity)");
  }

  // ============================================================================
  // Add Liquidity!
  // ============================================================================
  console.log("\n💧 ADDING LIQUIDITY...");
  console.log("=".repeat(70));

  // Liquidity parameters
  // For concentrated liquidity: use ticks near current price
  // For full-range: use MIN_TICK to MAX_TICK
  const tickLower = -600;  // Concentrated around current price
  const tickUpper = 600;
  const liquidityDelta = ethers.parseEther("10"); // Add 10 units of liquidity
  const salt = ethers.ZeroHash; // Use 0 for shared position

  console.log("Parameters:");
  console.log("   Tick Lower:", tickLower);
  console.log("   Tick Upper:", tickUpper);
  console.log("   Liquidity Delta:", ethers.formatEther(liquidityDelta));
  console.log("   Range: Concentrated");

  const modifyParams = {
    tickLower: tickLower,
    tickUpper: tickUpper,
    liquidityDelta: liquidityDelta,
    salt: salt
  };

  const hookData = "0x";

  try {
    console.log("\n📤 Sending transaction...");
    const tx = await liquidityRouter.modifyLiquidity(
      poolKey,
      modifyParams,
      hookData
    );
    
    console.log("   TX Hash:", tx.hash);
    console.log("   ⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    
    console.log("\n✅ LIQUIDITY ADDED!");
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas Used:", receipt.gasUsed.toString());

    // Check liquidity after
    const liquidityAfter = await stateView.getLiquidity(poolId);
    console.log("\n📊 Pool Liquidity After:", liquidityAfter.toString());
    console.log("   Increase:", (liquidityAfter - liquidityBefore).toString());

    // Check balances after
    const balance0After = await token0.balanceOf(wallet.address);
    const balance1After = await token1.balanceOf(wallet.address);
    
    console.log("\n💰 Token Balances After:");
    console.log(`   ${symbol0}:`, ethers.formatEther(balance0After));
    console.log(`   ${symbol1}:`, ethers.formatEther(balance1After));
    
    console.log("\n💸 Tokens Spent:");
    console.log(`   ${symbol0}:`, ethers.formatEther(balance0 - balance0After));
    console.log(`   ${symbol1}:`, ethers.formatEther(balance1 - balance1After));

  } catch (error) {
    console.error("\n❌ Error adding liquidity:");
    console.error("   ", error.message);
    
    if (error.message.includes("NOT_INITIALIZED")) {
      console.log("\n💡 Pool not initialized! Run:");
      console.log("   node ethers-examples/01-initialize-pool.js");
    }
    throw error;
  }

  console.log("\n" + "=".repeat(70));
  console.log("✅ COMPLETE!");
  console.log("=".repeat(70));
  
  console.log("\n🚀 Next Steps:");
  console.log("   - Execute swaps: node ethers-examples/06-swap.js");
  console.log("   - Remove liquidity: Use negative liquidityDelta");
  console.log("   - Collect fees: Check position and collect");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });
