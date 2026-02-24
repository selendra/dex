const { ethers } = require("ethers");

// Configuration
const PRIVATE_KEY = "0x5aa589e3adf3b85988353cd7276f1957fb9a2b1b989816d4a67d6cef9f5fe9db";
const RPC_URL = "https://rpc.selendra.org";

// Contract addresses (new deployment)
const LIQUIDITY_MANAGER_ADDRESS = "0x9bF44bb20d84795F9804104494068B479e7D43f3";

// Token addresses
const TOKENS = {
  TUSD: "0x8C771AB14EE8f9e1Cd2576767aF8E6aC9B6a017C",
  TBROWN: "0x485Da38cf11718c857cE00438B52795BC3b1A956"
};

// Pool parameters
const FEE = 3000;
const TICK_SPACING = 60;
const HOOKS_ADDRESS = ethers.ZeroAddress;
const MIN_TICK = -887220;
const MAX_TICK = 887220;

// Liquidity amount (1000 tokens worth)
const LIQUIDITY_AMOUNT = ethers.parseEther("1000");

// ABIs
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

const LIQUIDITY_MANAGER_ABI = [
  "function addLiquidity(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, int24 tickLower, int24 tickUpper, int256 liquidityDelta) external returns (int256 delta)"
];

// Sort tokens by address
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

// Get full-range tick bounds aligned to tick spacing
function getFullRangeTicks(tickSpacing) {
  const tickLower = Math.ceil(MIN_TICK / tickSpacing) * tickSpacing;
  const tickUpper = Math.floor(MAX_TICK / tickSpacing) * tickSpacing;
  return { tickLower, tickUpper };
}

async function addLiquidityToPool(wallet, liquidityManager, token0Addr, token1Addr, amount) {
  const token0 = new ethers.Contract(token0Addr, ERC20_ABI, wallet);
  const token1 = new ethers.Contract(token1Addr, ERC20_ABI, wallet);
  
  const symbol0 = await token0.symbol();
  const symbol1 = await token1.symbol();
  console.log(`\n➤ Adding liquidity to ${symbol0}/${symbol1} pool`);

  // Check balances
  const balance0 = await token0.balanceOf(wallet.address);
  const balance1 = await token1.balanceOf(wallet.address);
  console.log(`  Balance ${symbol0}: ${ethers.formatEther(balance0)}`);
  console.log(`  Balance ${symbol1}: ${ethers.formatEther(balance1)}`);

  if (balance0 < amount || balance1 < amount) {
    console.log(`  ⚠ Insufficient balance, skipping`);
    return false;
  }

  // Transfer tokens to LiquidityManager
  console.log(`  Transferring ${ethers.formatEther(amount)} ${symbol0} to LiquidityManager...`);
  const tx0 = await token0.transfer(LIQUIDITY_MANAGER_ADDRESS, amount, { gasLimit: 100000 });
  await tx0.wait();
  
  console.log(`  Transferring ${ethers.formatEther(amount)} ${symbol1} to LiquidityManager...`);
  const tx1 = await token1.transfer(LIQUIDITY_MANAGER_ADDRESS, amount, { gasLimit: 100000 });
  await tx1.wait();

  // Create pool key and get tick range
  const poolKey = createPoolKey(token0Addr, token1Addr);
  const { tickLower, tickUpper } = getFullRangeTicks(TICK_SPACING);
  
  console.log(`  Adding liquidity with full range ticks: [${tickLower}, ${tickUpper}]`);
  
  // Add liquidity - liquidityDelta is the amount of liquidity to add
  // For simplicity, use the token amount as liquidity (this is an approximation)
  const liquidityDelta = amount;
  
  try {
    const tx = await liquidityManager.addLiquidity(
      poolKey,
      tickLower,
      tickUpper,
      liquidityDelta,
      { gasLimit: 1000000 }
    );
    console.log(`  Transaction: ${tx.hash}`);
    
    const receipt = await tx.wait();
    if (receipt.status === 1) {
      console.log(`  ✓ Liquidity added successfully! Gas: ${receipt.gasUsed}`);
      return true;
    } else {
      console.log(`  ✗ Transaction reverted`);
      return false;
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("============================================================");
  console.log("Adding Liquidity to Pools on SELENDRA TESTNET");
  console.log("============================================================");

  // Connect to Selendra testnet
  const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, {
    staticNetwork: true,
    batchMaxCount: 1
  });
  
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(`\nWallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`SEL Balance: ${ethers.formatEther(balance)} SEL`);

  // Connect to LiquidityManager
  const liquidityManager = new ethers.Contract(
    LIQUIDITY_MANAGER_ADDRESS,
    LIQUIDITY_MANAGER_ABI,
    wallet
  );
  console.log(`LiquidityManager: ${LIQUIDITY_MANAGER_ADDRESS}`);

  // Add liquidity to TUSD/TBROWN pool first
  const success = await addLiquidityToPool(
    wallet,
    liquidityManager,
    TOKENS.TUSD,
    TOKENS.TBROWN,
    LIQUIDITY_AMOUNT
  );

  console.log("\n============================================================");
  console.log(success ? "✓ Liquidity successfully added!" : "✗ Failed to add liquidity");
  console.log("============================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
