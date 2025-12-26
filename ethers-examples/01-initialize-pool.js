/**
 * Pure Ethers.js Example - Initialize a Pool
 * 
 * No Hardhat required - just Node.js and ethers.js
 * 
 * Install: npm install ethers dotenv
 * Run: node ethers-examples/01-initialize-pool.js
 */

const { ethers } = require("ethers");
require("dotenv").config();

// Contract ABIs (only the functions we need)
const POOL_MANAGER_ABI = [
  "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96, bytes calldata hookData) external returns (int24 tick)"
];

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)"
];

async function main() {
  console.log("=".repeat(60));
  console.log("Pure Ethers.js - Initialize Pool");
  console.log("=".repeat(60));

  // ============================================================================
  // Step 1: Setup Provider and Wallet
  // ============================================================================
  console.log("\n📡 Connecting to network...");
  
  const provider = new ethers.JsonRpcProvider(
    process.env.RPC_URL || "http://localhost:8545"
  );
  
  const wallet = new ethers.Wallet(
    process.env.PRIVATE_KEY || 
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Default Hardhat key
    provider
  );
  
  console.log("✅ Connected to:", await provider.getNetwork().then(n => n.name));
  console.log("✅ Using wallet:", wallet.address);
  console.log("✅ Balance:", ethers.formatEther(await provider.getBalance(wallet.address)), "ETH");

  // ============================================================================
  // Step 2: Get Token Addresses
  // ============================================================================
  console.log("\n🪙 Token Configuration:");
  
  const token0Address = process.env.TOKEN0_ADDRESS;
  const token1Address = process.env.TOKEN1_ADDRESS;
  
  if (!token0Address || !token1Address) {
    console.log("❌ TOKEN0_ADDRESS and TOKEN1_ADDRESS required in .env");
    console.log("\nExample .env:");
    console.log("TOKEN0_ADDRESS=0x...");
    console.log("TOKEN1_ADDRESS=0x...");
    process.exit(1);
  }

  // Sort tokens (currency0 must be < currency1)
  let [currency0, currency1] = 
    token0Address.toLowerCase() < token1Address.toLowerCase()
      ? [token0Address, token1Address]
      : [token1Address, token0Address];

  console.log("currency0:", currency0);
  console.log("currency1:", currency1);

  // Get token info
  const token0Contract = new ethers.Contract(currency0, ERC20_ABI, provider);
  const token1Contract = new ethers.Contract(currency1, ERC20_ABI, provider);
  
  try {
    const name0 = await token0Contract.name();
    const name1 = await token1Contract.name();
    console.log(`\n📛 ${name0} / ${name1}`);
  } catch (e) {
    console.log("(Unable to read token names)");
  }

  // ============================================================================
  // Step 3: Create PoolKey
  // ============================================================================
  console.log("\n🔑 Creating PoolKey...");
  
  const poolKey = {
    currency0: currency0,
    currency1: currency1,
    fee: 3000,                      // 0.30%
    tickSpacing: 60,                // Matches 3000 fee tier
    hooks: ethers.ZeroAddress       // No hooks
  };
  
  console.log("Fee: 0.30% (3000 basis points)");
  console.log("Tick Spacing:", poolKey.tickSpacing);
  console.log("Hooks:", poolKey.hooks, "(hookless)");

  // ============================================================================
  // Step 4: Initialize Pool
  // ============================================================================
  console.log("\n🏊 Initializing pool...");
  
  const poolManagerAddress = process.env.POOL_MANAGER_ADDRESS ||
    "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
  
  const poolManager = new ethers.Contract(
    poolManagerAddress,
    POOL_MANAGER_ABI,
    wallet
  );
  
  const sqrtPriceX96 = "79228162514264337593543950336"; // 1:1 price
  const hookData = "0x";
  
  console.log("Starting price: 1:1 ratio");
  console.log("PoolManager:", poolManagerAddress);

  try {
    const tx = await poolManager.initialize(poolKey, sqrtPriceX96, hookData);
    console.log("\n📤 Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Pool initialized!");
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log("Block:", receipt.blockNumber);

    // Calculate Pool ID
    const poolId = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(address,address,uint24,int24,address)"],
        [[
          poolKey.currency0,
          poolKey.currency1,
          poolKey.fee,
          poolKey.tickSpacing,
          poolKey.hooks
        ]]
      )
    );

    console.log("\n📋 Pool Details:");
    console.log("Pool ID:", poolId);
    console.log("\n💾 Save to .env:");
    console.log(`POOL_ID=${poolId}`);

  } catch (error) {
    if (error.message.includes("already initialized")) {
      console.log("⚠️  Pool already initialized");
    } else {
      console.error("❌ Error:", error.message);
      throw error;
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
