/**
 * Pure Ethers.js Example - Query Pool State
 * 
 * Read pool information using StateView contract
 * 
 * Install: npm install ethers dotenv
 * Run: node ethers-examples/02-query-pool.js
 */

const { ethers } = require("ethers");
require("dotenv").config();

// StateView ABI
const STATE_VIEW_ABI = [
  "function getSlot0(bytes32 id) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
  "function getLiquidity(bytes32 id) external view returns (uint128 liquidity)",
  "function getFeeGrowthGlobals(bytes32 id) external view returns (uint256 feeGrowthGlobal0X128, uint256 feeGrowthGlobal1X128)",
  "function getTickInfo(bytes32 id, int24 tick) external view returns (uint128 liquidityGross, int128 liquidityNet, uint256 feeGrowthOutside0X128, uint256 feeGrowthOutside1X128)"
];

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
];

async function main() {
  console.log("=".repeat(60));
  console.log("Pure Ethers.js - Query Pool State");
  console.log("=".repeat(60));

  // ============================================================================
  // Step 1: Setup Provider
  // ============================================================================
  console.log("\n📡 Connecting to network...");
  
  const provider = new ethers.JsonRpcProvider(
    process.env.RPC_URL || "http://localhost:8545"
  );
  
  const network = await provider.getNetwork();
  console.log("✅ Connected to chain ID:", network.chainId.toString());

  // ============================================================================
  // Step 2: Calculate or Get Pool ID
  // ============================================================================
  console.log("\n🆔 Getting Pool ID...");
  
  const poolId = process.env.POOL_ID;
  const token0Address = process.env.TOKEN0_ADDRESS;
  const token1Address = process.env.TOKEN1_ADDRESS;
  
  let finalPoolId = poolId;
  
  if (!poolId && token0Address && token1Address) {
    // Calculate pool ID from tokens
    const [currency0, currency1] = 
      token0Address.toLowerCase() < token1Address.toLowerCase()
        ? [token0Address, token1Address]
        : [token1Address, token0Address];
    
    finalPoolId = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(address,address,uint24,int24,address)"],
        [[currency0, currency1, 3000, 60, ethers.ZeroAddress]]
      )
    );
    console.log("Calculated Pool ID:", finalPoolId);
  } else if (poolId) {
    console.log("Using Pool ID from .env:", finalPoolId);
  } else {
    console.log("❌ POOL_ID or TOKEN0/TOKEN1_ADDRESS required in .env");
    process.exit(1);
  }

  // ============================================================================
  // Step 3: Connect to StateView
  // ============================================================================
  console.log("\n📊 Connecting to StateView...");
  
  const stateViewAddress = process.env.STATE_VIEW_ADDRESS ||
    "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
  
  const stateView = new ethers.Contract(
    stateViewAddress,
    STATE_VIEW_ABI,
    provider
  );
  
  console.log("StateView:", stateViewAddress);

  // ============================================================================
  // Step 4: Get Slot0 (Current Price & Tick)
  // ============================================================================
  console.log("\n💰 Reading Pool State...");
  
  try {
    const slot0 = await stateView.getSlot0(finalPoolId);
    
    console.log("\n📈 Slot0 Data:");
    console.log("sqrtPriceX96:", slot0.sqrtPriceX96.toString());
    console.log("Current Tick:", slot0.tick.toString());
    console.log("Protocol Fee:", slot0.protocolFee.toString());
    console.log("LP Fee:", slot0.lpFee.toString());
    
    // Calculate human-readable price
    const Q96 = 2n ** 96n;
    const sqrtPrice = Number(slot0.sqrtPriceX96) / Number(Q96);
    const price = sqrtPrice * sqrtPrice;
    
    console.log("\n💱 Current Price:");
    console.log("Token1/Token0:", price.toFixed(6));
    console.log("Token0/Token1:", (1 / price).toFixed(6));
    
  } catch (error) {
    console.log("❌ Could not read Slot0:", error.message);
    console.log("(Pool may not be initialized)");
  }

  // ============================================================================
  // Step 5: Get Pool Liquidity
  // ============================================================================
  console.log("\n💧 Reading Liquidity...");
  
  try {
    const liquidity = await stateView.getLiquidity(finalPoolId);
    console.log("Total Liquidity:", liquidity.toString());
    
    if (liquidity > 0n) {
      console.log("✅ Pool has active liquidity");
    } else {
      console.log("⚠️  Pool has no liquidity");
    }
  } catch (error) {
    console.log("❌ Could not read liquidity:", error.message);
  }

  // ============================================================================
  // Step 6: Get Fee Growth
  // ============================================================================
  console.log("\n💸 Reading Fee Growth...");
  
  try {
    const feeGrowth = await stateView.getFeeGrowthGlobals(finalPoolId);
    
    console.log("Fee Growth Global0:", feeGrowth.feeGrowthGlobal0X128.toString());
    console.log("Fee Growth Global1:", feeGrowth.feeGrowthGlobal1X128.toString());
    
    if (feeGrowth.feeGrowthGlobal0X128 > 0n || feeGrowth.feeGrowthGlobal1X128 > 0n) {
      console.log("✅ Pool has generated fees");
    } else {
      console.log("No fees generated yet");
    }
  } catch (error) {
    console.log("❌ Could not read fee growth:", error.message);
  }

  // ============================================================================
  // Step 7: Get Tick Information
  // ============================================================================
  console.log("\n📊 Reading Tick Data...");
  
  const ticksToCheck = [0, -600, 600];
  
  for (const tick of ticksToCheck) {
    try {
      const tickInfo = await stateView.getTickInfo(finalPoolId, tick);
      
      if (tickInfo.liquidityGross > 0n) {
        console.log(`\n✅ Tick ${tick}:`);
        console.log("  Liquidity Gross:", tickInfo.liquidityGross.toString());
        console.log("  Liquidity Net:", tickInfo.liquidityNet.toString());
      }
    } catch (error) {
      // Tick not initialized
    }
  }

  // ============================================================================
  // Step 8: Get Token Information
  // ============================================================================
  if (token0Address && token1Address) {
    console.log("\n🪙 Token Information...");
    
    const [currency0, currency1] = 
      token0Address.toLowerCase() < token1Address.toLowerCase()
        ? [token0Address, token1Address]
        : [token1Address, token0Address];
    
    try {
      const token0 = new ethers.Contract(currency0, ERC20_ABI, provider);
      const token1 = new ethers.Contract(currency1, ERC20_ABI, provider);
      
      const [name0, symbol0, decimals0] = await Promise.all([
        token0.name(),
        token0.symbol(),
        token0.decimals()
      ]);
      
      const [name1, symbol1, decimals1] = await Promise.all([
        token1.name(),
        token1.symbol(),
        token1.decimals()
      ]);
      
      console.log(`\nToken0: ${name0} (${symbol0})`);
      console.log(`  Address: ${currency0}`);
      console.log(`  Decimals: ${decimals0}`);
      
      console.log(`\nToken1: ${name1} (${symbol1})`);
      console.log(`  Address: ${currency1}`);
      console.log(`  Decimals: ${decimals1}`);
      
    } catch (error) {
      console.log("Could not read token info");
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Complete!");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });
