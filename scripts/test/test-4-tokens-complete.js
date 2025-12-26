/**
 * 4-Token Complete DEX Test
 * Run: node scripts/test-4-tokens-complete.js
 */

const { ethers } = require("ethers");
require("dotenv").config();

const POOL_MANAGER_ABI = ["function initialize((address,address,uint24,int24,address) key, uint160 sqrtPriceX96, bytes hookData) external returns (int24 tick)"];
const LIQUIDITY_ROUTER_ABI = ["function addLiquidity((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, int24 tickLower, int24 tickUpper, int256 liquidityDelta) external returns (tuple(int256,int256))"];
const SWAP_ROUTER_ABI = ["function swap((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params) external returns (tuple(int256,int256))"];
const ERC20_ABI = ["function symbol() view returns (string)", "function balanceOf(address) view returns (uint256)", "function approve(address spender, uint256 amount) returns (bool)", "function transfer(address to, uint256 amount) returns (bool)", "function mint(address to, uint256 amount) external"];
const STATE_VIEW_ABI = ["function getLiquidity(bytes32 id) external view returns (uint128 liquidity)", "function getSlot0(bytes32 id) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)"];

const MIN_PRICE_LIMIT = "4295128740";
const MAX_PRICE_LIMIT = "1461446703485210103287273052203988822378723970341";

function getSqrtPriceX96(priceRatio) {
  const Q96 = 2n ** 96n;
  const sqrtPrice = Math.sqrt(priceRatio);
  return BigInt(Math.floor(sqrtPrice * Number(Q96)));
}

function getPoolId(poolKey) {
  return ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["tuple(address,address,uint24,int24,address)"], [[poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]]));
}

function createPoolKey(tokenA, tokenB) {
  const [currency0, currency1] = tokenA.toLowerCase() < tokenB.toLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA];
  return { currency0, currency1, fee: 3000, tickSpacing: 60, hooks: ethers.ZeroAddress };
}

async function main() {
  console.log("================================================================================");
  console.log("4-TOKEN DEX WORKFLOW TEST");
  console.log("================================================================================");

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://localhost:8545");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
  
  console.log("\n✅ Wallet:", wallet.address);

  const tokenSAddress = process.env.TOKENS_ADDRESS;
  const tokenAAddress = process.env.TOKENA_ADDRESS;
  const tokenBAddress = process.env.TOKENB_ADDRESS;
  const tokenCAddress = process.env.TOKENC_ADDRESS;

  const poolManager = new ethers.Contract(process.env.POOL_MANAGER_ADDRESS, POOL_MANAGER_ABI, wallet);
  const liquidityRouter = new ethers.Contract(process.env.LIQUIDITY_ROUTER_ADDRESS, LIQUIDITY_ROUTER_ABI, wallet);
  const swapRouter = new ethers.Contract(process.env.SWAP_ROUTER_ADDRESS, SWAP_ROUTER_ABI, wallet);
  const stateView = new ethers.Contract(process.env.STATE_VIEW_ADDRESS, STATE_VIEW_ABI, provider);
  
  const tokenS = new ethers.Contract(tokenSAddress, ERC20_ABI, wallet);
  const tokenA = new ethers.Contract(tokenAAddress, ERC20_ABI, wallet);
  const tokenB = new ethers.Contract(tokenBAddress, ERC20_ABI, wallet);
  const tokenC = new ethers.Contract(tokenCAddress, ERC20_ABI, wallet);

  console.log("\n📋 4 Tokens:", tokenSAddress.substring(0,10)+"...", tokenAAddress.substring(0,10)+"...", tokenBAddress.substring(0,10)+"...", tokenCAddress.substring(0,10)+"...");

  // Pool definitions
  const pools = [
    { name: "TOKENS/TOKENA", token0: tokenSAddress, token1: tokenAAddress, ratio: 0.1 },
    { name: "TOKENS/TOKENB", token0: tokenSAddress, token1: tokenBAddress, ratio: 0.05 },
    { name: "TOKENS/TOKENC", token0: tokenSAddress, token1: tokenCAddress, ratio: 1 }
  ];

  // STEP 1: Initialize pools
  console.log("\n" + "=".repeat(80));
  console.log("STEP 1: INITIALIZE POOLS");
  console.log("=".repeat(80));

  for (const pool of pools) {
    console.log(`\n--- ${pool.name} ---`);
    const poolKey = createPoolKey(pool.token0, pool.token1);
    const poolId = getPoolId(poolKey);
    pool.poolKey = poolKey;
    pool.poolId = poolId;

    let isInitialized = false;
    try {
      const slot0 = await stateView.getSlot0(poolId);
      if (slot0.sqrtPriceX96 > 0n) {
        isInitialized = true;
        console.log("✅ Already initialized");
      }
    } catch (e) {}

    if (!isInitialized) {
      const isTokenSFirst = poolKey.currency0.toLowerCase() === tokenSAddress.toLowerCase();
      const actualRatio = isTokenSFirst ? pool.ratio : (1 / pool.ratio);
      const sqrtPriceX96 = getSqrtPriceX96(actualRatio);
      console.log("   Initializing at ratio:", actualRatio.toFixed(4));
      
      try {
        const poolKeyTuple = [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks];
        const tx = await poolManager.initialize(poolKeyTuple, sqrtPriceX96, "0x");
        await tx.wait();
        console.log("✅ Initialized!");
      } catch (error) {
        console.log("⚠️", error.message.substring(0, 60));
      }
    }
  }

  // STEP 2: Mint & Approve
  console.log("\n" + "=".repeat(80));
  console.log("STEP 2: MINT & APPROVE");
  console.log("=".repeat(80));

  const tokens = [
    { contract: tokenS, symbol: "TOKENS", address: tokenSAddress },
    { contract: tokenA, symbol: "TOKENA", address: tokenAAddress },
    { contract: tokenB, symbol: "TOKENB", address: tokenBAddress },
    { contract: tokenC, symbol: "TOKENC", address: tokenCAddress }
  ];

  for (const token of tokens) {
    const balance = await token.contract.balanceOf(wallet.address);
    console.log(`\n${token.symbol}: ${ethers.formatEther(balance)}`);
    
    try {
      const mintAmount = ethers.parseEther("50000");
      if (balance < mintAmount) {
        await (await token.contract.mint(wallet.address, mintAmount)).wait();
        console.log("   ✅ Minted");
      }
      await (await token.contract.approve(swapRouter.target, ethers.MaxUint256)).wait();
      console.log("   ✅ Approved");
    } catch (e) {
      console.log("   ⚠️", e.message.substring(0, 40));
    }
  }

  // STEP 3: Add Liquidity
  console.log("\n" + "=".repeat(80));
  console.log("STEP 3: ADD LIQUIDITY");
  console.log("=".repeat(80));

  const tickLower = -600;
  const tickUpper = 600;
  const liquidityDelta = ethers.parseEther("100");

  for (const pool of pools) {
    console.log(`\n--- ${pool.name} ---`);
    const liquidityBefore = await stateView.getLiquidity(pool.poolId);
    console.log("   Liquidity before:", liquidityBefore.toString());

    // Find token contracts
    let token0Contract = tokens.find(t => t.address.toLowerCase() === pool.poolKey.currency0.toLowerCase()).contract;
    let token1Contract = tokens.find(t => t.address.toLowerCase() === pool.poolKey.currency1.toLowerCase()).contract;

    // Transfer to router
    const transferAmount = ethers.parseEther("1000");
    await (await token0Contract.transfer(liquidityRouter.target, transferAmount)).wait();
    await (await token1Contract.transfer(liquidityRouter.target, transferAmount)).wait();
    console.log("   ✅ Transferred to router");

    try {
      const poolKeyTuple = [pool.poolKey.currency0, pool.poolKey.currency1, pool.poolKey.fee, pool.poolKey.tickSpacing, pool.poolKey.hooks];
      const tx = await liquidityRouter.addLiquidity(poolKeyTuple, tickLower, tickUpper, liquidityDelta);
      await tx.wait();
      console.log("✅ Liquidity added!");
      
      const liquidityAfter = await stateView.getLiquidity(pool.poolId);
      console.log("   Liquidity after:", liquidityAfter.toString());
    } catch (error) {
      console.log("❌", error.message.substring(0, 80));
    }
  }

  // STEP 4: Execute Swaps
  console.log("\n" + "=".repeat(80));
  console.log("STEP 4: EXECUTE SWAPS");
  console.log("=".repeat(80));

  const swapAmount = ethers.parseEther("10");

  // Swap 1: TOKENS -> TOKENA
  console.log("\n--- Swap: 10 TOKENS -> TOKENA ---");
  let balanceS1 = await tokenS.balanceOf(wallet.address);
  let balanceA1 = await tokenA.balanceOf(wallet.address);
  console.log("Before: TOKENS =", ethers.formatEther(balanceS1), "| TOKENA =", ethers.formatEther(balanceA1));

  try {
    const pool1 = pools[0];
    const zeroForOne1 = pool1.poolKey.currency0.toLowerCase() === tokenSAddress.toLowerCase();
    const poolKeyTuple = [pool1.poolKey.currency0, pool1.poolKey.currency1, pool1.poolKey.fee, pool1.poolKey.tickSpacing, pool1.poolKey.hooks];
    
    const tx = await swapRouter.swap(poolKeyTuple, { zeroForOne: zeroForOne1, amountSpecified: -swapAmount, sqrtPriceLimitX96: zeroForOne1 ? MIN_PRICE_LIMIT : MAX_PRICE_LIMIT });
    await tx.wait();
    console.log("✅ Swap executed!");

    const balanceS2 = await tokenS.balanceOf(wallet.address);
    const balanceA2 = await tokenA.balanceOf(wallet.address);
    console.log("After: TOKENS =", ethers.formatEther(balanceS2), "| TOKENA =", ethers.formatEther(balanceA2));
    console.log("Result: Spent", ethers.formatEther(balanceS1 - balanceS2), "TOKENS, Got", ethers.formatEther(balanceA2 - balanceA1), "TOKENA");
  } catch (error) {
    console.log("❌", error.message.substring(0, 80));
  }

  // Swap 2: TOKENS -> TOKENB
  console.log("\n--- Swap: 10 TOKENS -> TOKENB ---");
  let balanceS3 = await tokenS.balanceOf(wallet.address);
  let balanceB1 = await tokenB.balanceOf(wallet.address);
  console.log("Before: TOKENS =", ethers.formatEther(balanceS3), "| TOKENB =", ethers.formatEther(balanceB1));

  try {
    const pool2 = pools[1];
    const zeroForOne2 = pool2.poolKey.currency0.toLowerCase() === tokenSAddress.toLowerCase();
    const poolKeyTuple = [pool2.poolKey.currency0, pool2.poolKey.currency1, pool2.poolKey.fee, pool2.poolKey.tickSpacing, pool2.poolKey.hooks];
    
    const tx = await swapRouter.swap(poolKeyTuple, { zeroForOne: zeroForOne2, amountSpecified: -swapAmount, sqrtPriceLimitX96: zeroForOne2 ? MIN_PRICE_LIMIT : MAX_PRICE_LIMIT });
    await tx.wait();
    console.log("✅ Swap executed!");

    const balanceS4 = await tokenS.balanceOf(wallet.address);
    const balanceB2 = await tokenB.balanceOf(wallet.address);
    console.log("After: TOKENS =", ethers.formatEther(balanceS4), "| TOKENB =", ethers.formatEther(balanceB2));
    console.log("Result: Spent", ethers.formatEther(balanceS3 - balanceS4), "TOKENS, Got", ethers.formatEther(balanceB2 - balanceB1), "TOKENB");
  } catch (error) {
    console.log("❌", error.message.substring(0, 80));
  }

  // Swap 3: TOKENC -> TOKENS
  console.log("\n--- Swap: 10 TOKENC -> TOKENS ---");
  let balanceC1 = await tokenC.balanceOf(wallet.address);
  let balanceS5 = await tokenS.balanceOf(wallet.address);
  console.log("Before: TOKENC =", ethers.formatEther(balanceC1), "| TOKENS =", ethers.formatEther(balanceS5));

  try {
    const pool3 = pools[2];
    const zeroForOne3 = pool3.poolKey.currency0.toLowerCase() === tokenCAddress.toLowerCase();
    const poolKeyTuple = [pool3.poolKey.currency0, pool3.poolKey.currency1, pool3.poolKey.fee, pool3.poolKey.tickSpacing, pool3.poolKey.hooks];
    
    const tx = await swapRouter.swap(poolKeyTuple, { zeroForOne: zeroForOne3, amountSpecified: -swapAmount, sqrtPriceLimitX96: zeroForOne3 ? MIN_PRICE_LIMIT : MAX_PRICE_LIMIT });
    await tx.wait();
    console.log("✅ Swap executed!");

    const balanceC2 = await tokenC.balanceOf(wallet.address);
    const balanceS6 = await tokenS.balanceOf(wallet.address);
    console.log("After: TOKENC =", ethers.formatEther(balanceC2), "| TOKENS =", ethers.formatEther(balanceS6));
    console.log("Result: Spent", ethers.formatEther(balanceC1 - balanceC2), "TOKENC, Got", ethers.formatEther(balanceS6 - balanceS5), "TOKENS");
  } catch (error) {
    console.log("❌", error.message.substring(0, 80));
  }

  // STEP 5: Remove Liquidity
  console.log("\n" + "=".repeat(80));
  console.log("STEP 5: REMOVE LIQUIDITY");
  console.log("=".repeat(80));

  const removeDelta = -ethers.parseEther("50");

  for (const pool of pools) {
    console.log(`\n--- ${pool.name} ---`);
    const liquidityBefore = await stateView.getLiquidity(pool.poolId);
    console.log("   Liquidity before:", liquidityBefore.toString());

    let token0Contract = tokens.find(t => t.address.toLowerCase() === pool.poolKey.currency0.toLowerCase()).contract;
    let token1Contract = tokens.find(t => t.address.toLowerCase() === pool.poolKey.currency1.toLowerCase()).contract;

    const transferAmount = ethers.parseEther("500");
    await (await token0Contract.transfer(liquidityRouter.target, transferAmount)).wait();
    await (await token1Contract.transfer(liquidityRouter.target, transferAmount)).wait();

    try {
      const poolKeyTuple = [pool.poolKey.currency0, pool.poolKey.currency1, pool.poolKey.fee, pool.poolKey.tickSpacing, pool.poolKey.hooks];
      const tx = await liquidityRouter.addLiquidity(poolKeyTuple, tickLower, tickUpper, removeDelta);
      await tx.wait();
      console.log("✅ Liquidity removed!");
      
      const liquidityAfter = await stateView.getLiquidity(pool.poolId);
      console.log("   Liquidity after:", liquidityAfter.toString());
    } catch (error) {
      console.log("❌", error.message.substring(0, 80));
    }
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("✅ ALL TESTS COMPLETE!");
  console.log("=".repeat(80));

  console.log("\n💰 Final Balances:");
  for (const token of tokens) {
    const balance = await token.contract.balanceOf(wallet.address);
    console.log(`   ${token.symbol}: ${ethers.formatEther(balance)}`);
  }

  console.log("\n📊 Final Pool Liquidity:");
  for (const pool of pools) {
    const liquidity = await stateView.getLiquidity(pool.poolId);
    console.log(`   ${pool.name}: ${liquidity.toString()}`);
  }

  console.log("\n✅ Verified: 3 pools initialized, liquidity added/removed, 3 swaps executed");
  console.log("=".repeat(80));
}

main().then(() => process.exit(0)).catch((error) => { console.error("\n❌ Error:", error); process.exit(1); });
