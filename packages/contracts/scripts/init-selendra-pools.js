const { ethers } = require("ethers");

// Configuration
const PRIVATE_KEY = "0x5aa589e3adf3b85988353cd7276f1957fb9a2b1b989816d4a67d6cef9f5fe9db";
const RPC_URL = "https://rpc.selendra.org";

// Contract addresses (new deployment)
const POOL_MANAGER_ADDRESS = "0xE235994d2a281534938eB0d0763E52Ad30E388cB";

// Token addresses
const TOKENS = {
  TUSD: "0x8C771AB14EE8f9e1Cd2576767aF8E6aC9B6a017C",
  TBROWN: "0x485Da38cf11718c857cE00438B52795BC3b1A956"
};

// Pool parameters
const SQRT_PRICE_1_1 = "79228162514264337593543950336"; // 1:1 price ratio
const FEE = 3000; // 0.3% fee
const TICK_SPACING = 60;
const HOOKS_ADDRESS = ethers.ZeroAddress;

// PoolManager ABI (only initialize function)
const POOL_MANAGER_ABI = [
  "function initialize(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external returns (int24 tick)"
];

// Sort tokens by address (currency0 must be lower)
function sortTokens(tokenA, tokenB) {
  const addrA = tokenA.toLowerCase();
  const addrB = tokenB.toLowerCase();
  return addrA < addrB ? [tokenA, tokenB] : [tokenB, tokenA];
}

// Create pool key
function createPoolKey(token0, token1) {
  const [currency0, currency1] = sortTokens(token0, token1);
  return {
    currency0,
    currency1,
    fee: FEE,
    tickSpacing: TICK_SPACING,
    hooks: HOOKS_ADDRESS
  };
}

// Generate all pairs from token list
function generateAllPairs(tokens) {
  const pairs = [];
  const tokenNames = Object.keys(tokens);
  
  for (let i = 0; i < tokenNames.length; i++) {
    for (let j = i + 1; j < tokenNames.length; j++) {
      pairs.push({
        name: `${tokenNames[i]}/${tokenNames[j]}`,
        token0: tokens[tokenNames[i]],
        token1: tokens[tokenNames[j]]
      });
    }
  }
  
  return pairs;
}

async function main() {
  console.log("============================================================");
  console.log("Initializing Pools on SELENDRA");
  console.log("============================================================\n");

  // Connect to Selendra testnet
  const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, {
    staticNetwork: true,
    batchMaxCount: 1
  });
  
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(`Using wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} SEL\n`);
  
  if (balance === 0n) {
    console.error("ERROR: Wallet has no balance for gas!");
    process.exit(1);
  }

  // Connect to PoolManager
  const poolManager = new ethers.Contract(POOL_MANAGER_ADDRESS, POOL_MANAGER_ABI, wallet);
  console.log(`PoolManager: ${POOL_MANAGER_ADDRESS}\n`);

  // Generate all token pairs
  const pairs = generateAllPairs(TOKENS);
  console.log(`Initializing ${pairs.length} pools:\n`);

  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  for (const pair of pairs) {
    console.log(`➤ Initializing pool: ${pair.name}`);
    
    const poolKey = createPoolKey(pair.token0, pair.token1);
    console.log(`  currency0: ${poolKey.currency0}`);
    console.log(`  currency1: ${poolKey.currency1}`);
    
    try {
      const tx = await poolManager.initialize(poolKey, SQRT_PRICE_1_1, {
        gasLimit: 500000
      });
      console.log(`  Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log(`  ✓ Pool initialized successfully!`);
        console.log(`  Gas used: ${receipt.gasUsed.toString()}\n`);
        results.success.push(pair.name);
      } else {
        console.log(`  ✗ Transaction reverted\n`);
        results.failed.push(pair.name);
      }
    } catch (error) {
      if (error.message.includes("PoolAlreadyInitialized") || 
          error.message.includes("already initialized") ||
          error.message.includes("ALREADY_INITIALIZED")) {
        console.log(`  ⚠ Pool already initialized, skipping\n`);
        results.skipped.push(pair.name);
      } else {
        console.log(`  ✗ Error: ${error.message}\n`);
        results.failed.push(pair.name);
      }
    }
  }

  // Summary
  console.log("============================================================");
  console.log("INITIALIZATION SUMMARY");
  console.log("============================================================");
  console.log(`✓ Successfully initialized: ${results.success.length}`);
  results.success.forEach(p => console.log(`  - ${p}`));
  
  console.log(`\n⚠ Already initialized (skipped): ${results.skipped.length}`);
  results.skipped.forEach(p => console.log(`  - ${p}`));
  
  console.log(`\n✗ Failed: ${results.failed.length}`);
  results.failed.forEach(p => console.log(`  - ${p}`));
  
  console.log("\n============================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
