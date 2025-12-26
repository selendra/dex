/**
 * Pure Ethers.js Example - Complete Workflow
 * 
 * Full DEX workflow with pure ethers.js - no Hardhat needed!
 * 
 * Install: npm install ethers dotenv
 * Run: node ethers-examples/04-complete-workflow.js
 */

const { ethers } = require("ethers");
require("dotenv").config();

// Minimal ABIs
const POOL_MANAGER_ABI = [
  "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96, bytes calldata hookData) external returns (int24 tick)"
];

const STATE_VIEW_ABI = [
  "function getSlot0(bytes32 id) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
  "function getLiquidity(bytes32 id) external view returns (uint128 liquidity)"
];

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount) external"
];

async function main() {
  console.log("=".repeat(60));
  console.log("Pure Ethers.js - Complete DEX Workflow");
  console.log("=".repeat(60));

  // ============================================================================
  // SETUP
  // ============================================================================
  console.log("\n⚙️  Setting up...");
  
  const provider = new ethers.JsonRpcProvider(
    process.env.RPC_URL || "http://localhost:8545"
  );
  
  const wallet = new ethers.Wallet(
    process.env.PRIVATE_KEY || 
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    provider
  );
  
  console.log("✅ Wallet:", wallet.address);
  console.log("✅ Chain ID:", (await provider.getNetwork()).chainId.toString());

  // Contract addresses
  const poolManagerAddress = process.env.POOL_MANAGER_ADDRESS ||
    "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
  const stateViewAddress = process.env.STATE_VIEW_ADDRESS ||
    "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";

  // Get tokens
  const token0Address = process.env.TOKEN0_ADDRESS;
  const token1Address = process.env.TOKEN1_ADDRESS;
  
  if (!token0Address || !token1Address) {
    console.log("\n❌ Set TOKEN0_ADDRESS and TOKEN1_ADDRESS in .env");
    console.log("\nYou can deploy tokens using:");
    console.log("  npx hardhat run scripts/deploy-tokens.js --network localhost");
    process.exit(1);
  }

  // Sort tokens
  const [currency0, currency1] = 
    token0Address.toLowerCase() < token1Address.toLowerCase()
      ? [token0Address, token1Address]
      : [token1Address, token0Address];

  // ============================================================================
  // PHASE 1: Check Token Info
  // ============================================================================
  console.log("\n" + "=".repeat(60));
  console.log("PHASE 1: Token Information");
  console.log("=".repeat(60));

  const token0 = new ethers.Contract(currency0, ERC20_ABI, wallet);
  const token1 = new ethers.Contract(currency1, ERC20_ABI, wallet);

  const [name0, symbol0] = await Promise.all([
    token0.name(),
    token0.symbol()
  ]);
  
  const [name1, symbol1] = await Promise.all([
    token1.name(),
    token1.symbol()
  ]);

  console.log(`\n🪙 ${symbol0}: ${name0}`);
  console.log(`   Address: ${currency0}`);
  
  console.log(`\n🪙 ${symbol1}: ${name1}`);
  console.log(`   Address: ${currency1}`);

  // Check balances
  const balance0 = await token0.balanceOf(wallet.address);
  const balance1 = await token1.balanceOf(wallet.address);
  
  console.log(`\n💰 Your Balances:`);
  console.log(`   ${symbol0}:`, ethers.formatEther(balance0));
  console.log(`   ${symbol1}:`, ethers.formatEther(balance1));

  // ============================================================================
  // PHASE 2: Initialize or Check Pool
  // ============================================================================
  console.log("\n" + "=".repeat(60));
  console.log("PHASE 2: Initialize Pool");
  console.log("=".repeat(60));

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

  console.log("\n🔑 Pool Configuration:");
  console.log(`   Pair: ${symbol0}/${symbol1}`);
  console.log(`   Fee: 0.30% (3000)`);
  console.log(`   Pool ID: ${poolId.substring(0, 10)}...`);

  // Try to initialize pool
  const poolManager = new ethers.Contract(
    poolManagerAddress,
    POOL_MANAGER_ABI,
    wallet
  );

  const sqrtPriceX96 = "79228162514264337593543950336"; // 1:1 price

  try {
    console.log("\n🏊 Initializing pool...");
    const tx = await poolManager.initialize(poolKey, sqrtPriceX96, "0x");
    console.log("   Transaction:", tx.hash);
    await tx.wait();
    console.log("✅ Pool initialized!");
  } catch (error) {
    if (error.message.includes("already initialized")) {
      console.log("✅ Pool already initialized");
    } else {
      console.log("⚠️  Pool initialization:", error.message.substring(0, 100));
    }
  }

  // ============================================================================
  // PHASE 3: Check Pool State
  // ============================================================================
  console.log("\n" + "=".repeat(60));
  console.log("PHASE 3: Query Pool State");
  console.log("=".repeat(60));

  const stateView = new ethers.Contract(
    stateViewAddress,
    STATE_VIEW_ABI,
    provider
  );

  try {
    const slot0 = await stateView.getSlot0(poolId);
    const liquidity = await stateView.getLiquidity(poolId);
    
    // Calculate price
    const Q96 = 2n ** 96n;
    const sqrtPrice = Number(slot0.sqrtPriceX96) / Number(Q96);
    const price = sqrtPrice * sqrtPrice;
    
    console.log("\n📊 Pool State:");
    console.log(`   Current Tick: ${slot0.tick}`);
    console.log(`   Price (${symbol1}/${symbol0}): ${price.toFixed(6)}`);
    console.log(`   Liquidity: ${liquidity}`);
    console.log(`   LP Fee: ${slot0.lpFee}`);
    
    if (liquidity === 0n) {
      console.log("\n⚠️  Pool has no liquidity yet!");
      console.log("   Add liquidity using the API or PositionManager");
    }
    
  } catch (error) {
    console.log("❌ Could not read pool state:", error.message);
  }

  // ============================================================================
  // PHASE 4: Approve Tokens (if needed)
  // ============================================================================
  console.log("\n" + "=".repeat(60));
  console.log("PHASE 4: Token Approvals");
  console.log("=".repeat(60));

  const allowance0 = await token0.allowance(wallet.address, poolManagerAddress);
  const allowance1 = await token1.allowance(wallet.address, poolManagerAddress);
  
  console.log("\n🔐 Current Allowances:");
  console.log(`   ${symbol0}: ${ethers.formatEther(allowance0)}`);
  console.log(`   ${symbol1}: ${ethers.formatEther(allowance1)}`);

  const needsApproval = allowance0 < ethers.parseEther("1000") || 
                        allowance1 < ethers.parseEther("1000");

  if (needsApproval) {
    console.log("\n✅ Approving tokens...");
    
    if (allowance0 < ethers.parseEther("1000")) {
      const tx0 = await token0.approve(poolManagerAddress, ethers.MaxUint256);
      await tx0.wait();
      console.log(`   ✓ ${symbol0} approved`);
    }
    
    if (allowance1 < ethers.parseEther("1000")) {
      const tx1 = await token1.approve(poolManagerAddress, ethers.MaxUint256);
      await tx1.wait();
      console.log(`   ✓ ${symbol1} approved`);
    }
  } else {
    console.log("✅ Tokens already approved");
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log("\n" + "=".repeat(60));
  console.log("✅ Workflow Complete!");
  console.log("=".repeat(60));

  console.log("\n📋 Summary:");
  console.log(`   Pool: ${symbol0}/${symbol1}`);
  console.log(`   Pool ID: ${poolId.substring(0, 10)}...`);
  console.log(`   Fee: 0.30%`);
  console.log(`   Status: Initialized`);

  console.log("\n🚀 Next Steps:");
  console.log("   1. Add liquidity via API:");
  console.log("      POST /api/liquidity/add");
  console.log("\n   2. Execute swaps via API:");
  console.log("      POST /api/swap");
  console.log("\n   3. Query pool data:");
  console.log("      GET /api/pools");

  console.log("\n💾 Important Addresses:");
  console.log(`TOKEN0_ADDRESS=${currency0}`);
  console.log(`TOKEN1_ADDRESS=${currency1}`);
  console.log(`POOL_ID=${poolId}`);

  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });
