const { ethers } = require("ethers");
require("dotenv").config();

const POOL_MANAGER_ABI = ["function initialize((address,address,uint24,int24,address) key, uint160 sqrtPriceX96, bytes hookData) external returns (int24 tick)"];
const LIQUIDITY_ROUTER_ABI = ["function addLiquidity((address,address,uint24,int24,address) key, int24 tickLower, int24 tickUpper, int256 liquidityDelta) external"];
const SWAP_ROUTER_ABI = ["function swap((address,address,uint24,int24,address) key, (bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params) external"];
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)", "function approve(address,uint256) returns (bool)", "function transfer(address,uint256) returns (bool)"];
const STATE_VIEW_ABI = ["function getLiquidity(bytes32) external view returns (uint128)", "function getSlot0(bytes32) external view returns (uint160,int24,uint24,uint24)"];

const MIN_PRICE = "4295128740";
const MAX_PRICE = "1461446703485210103287273052203988822378723970341";

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function getSqrtPriceX96(ratio) {
  return BigInt(Math.floor(Math.sqrt(ratio) * Number(2n ** 96n)));
}

function getPoolId(key) {
  return ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["tuple(address,address,uint24,int24,address)"], [[key[0], key[1], key[2], key[3], key[4]]]));
}

async function main() {
  console.log("=".repeat(80));
  console.log("SIMPLE 4-TOKEN TEST");
  console.log("=".repeat(80));

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log("\n✅ Wallet:", wallet.address);

  const poolManager = new ethers.Contract(process.env.POOL_MANAGER_ADDRESS, POOL_MANAGER_ABI, wallet);
  const liquidityRouter = new ethers.Contract(process.env.LIQUIDITY_ROUTER_ADDRESS, LIQUIDITY_ROUTER_ABI, wallet);
  const swapRouter = new ethers.Contract(process.env.SWAP_ROUTER_ADDRESS, SWAP_ROUTER_ABI, wallet);
  const stateView = new ethers.Contract(process.env.STATE_VIEW_ADDRESS, STATE_VIEW_ABI, provider);
  
  const tokenS = new ethers.Contract(process.env.TOKENS_ADDRESS, ERC20_ABI, wallet);
  const tokenA = new ethers.Contract(process.env.TOKENA_ADDRESS, ERC20_ABI, wallet);

  // Pool: TOKENS/TOKENA (10:1 ratio)
  const poolKey = [
    process.env.TOKENS_ADDRESS < process.env.TOKENA_ADDRESS ? process.env.TOKENS_ADDRESS : process.env.TOKENA_ADDRESS,
    process.env.TOKENS_ADDRESS < process.env.TOKENA_ADDRESS ? process.env.TOKENA_ADDRESS : process.env.TOKENS_ADDRESS,
    3000, 60, ethers.ZeroAddress
  ];
  const poolId = getPoolId(poolKey);
  const isTokenSFirst = poolKey[0].toLowerCase() === process.env.TOKENS_ADDRESS.toLowerCase();

  console.log("\n📋 Pool: TOKENS/TOKENA");
  console.log("   Token0:", poolKey[0].substring(0, 10) + "...");
  console.log("   Token1:", poolKey[1].substring(0, 10) + "...");

  // STEP 1: Initialize pool
  console.log("\n" + "=".repeat(80));
  console.log("STEP 1: INITIALIZE POOL");
  console.log("=".repeat(80));

  try {
    const slot0 = await stateView.getSlot0(poolId);
    if (slot0[0] > 0n) {
      console.log("✅ Pool already initialized");
    }
  } catch (e) {
    const sqrtPrice = getSqrtPriceX96(isTokenSFirst ? 10 : 0.1);
    console.log("Initializing at sqrtPrice:", sqrtPrice.toString());
    const tx = await poolManager.initialize(poolKey, sqrtPrice, "0x", { gasLimit: 5000000 });
    await tx.wait();
    console.log("✅ Pool initialized!");
    await sleep(500);
  }

  // STEP 2: Approve tokens
  console.log("\n" + "=".repeat(80));
  console.log("STEP 2: APPROVE TOKENS");
  console.log("=".repeat(80));

  let tx = await tokenS.approve(swapRouter.target, ethers.MaxUint256, { gasLimit: 100000 });
  await tx.wait();
  console.log("✅ TOKENS approved");
  await sleep(500);

  tx = await tokenA.approve(swapRouter.target, ethers.MaxUint256, { gasLimit: 100000 });
  await tx.wait();
  console.log("✅ TOKENA approved");
  await sleep(500);

  // STEP 3: Add liquidity
  console.log("\n" + "=".repeat(80));
  console.log("STEP 3: ADD LIQUIDITY");
  console.log("=".repeat(80));

  const liquidityBefore = await stateView.getLiquidity(poolId);
  console.log("Liquidity before:", liquidityBefore.toString());

  // Transfer tokens to router
  tx = await (isTokenSFirst ? tokenS : tokenA).transfer(liquidityRouter.target, ethers.parseEther("1000"), { gasLimit: 100000 });
  await tx.wait();
  await sleep(500);

  tx = await (isTokenSFirst ? tokenA : tokenS).transfer(liquidityRouter.target, ethers.parseEther("1000"), { gasLimit: 100000 });
  await tx.wait();
  await sleep(500);
  console.log("✅ Tokens transferred to router");

  try {
    tx = await liquidityRouter.addLiquidity(poolKey, -600, 600, ethers.parseEther("100"), { gasLimit: 5000000 });
    await tx.wait();
    console.log("✅ Liquidity added!");
    await sleep(500);

    const liquidityAfter = await stateView.getLiquidity(poolId);
    console.log("Liquidity after:", liquidityAfter.toString());
    console.log("Increase:", (liquidityAfter - liquidityBefore).toString());
  } catch (error) {
    console.log("❌", error.message.substring(0, 100));
  }

  // STEP 4: Swap
  console.log("\n" + "=".repeat(80));
  console.log("STEP 4: SWAP TOKENS");
  console.log("=".repeat(80));

  const balanceS1 = await tokenS.balanceOf(wallet.address);
  const balanceA1 = await tokenA.balanceOf(wallet.address);
  console.log("Before: TOKENS =", ethers.formatEther(balanceS1), "| TOKENA =", ethers.formatEther(balanceA1));

  try {
    const swapAmount = ethers.parseEther("10");
    const zeroForOne = isTokenSFirst;
    
    tx = await swapRouter.swap(
      poolKey,
      { zeroForOne, amountSpecified: -swapAmount, sqrtPriceLimitX96: zeroForOne ? MIN_PRICE : MAX_PRICE },
      { gasLimit: 5000000 }
    );
    await tx.wait();
    console.log("✅ Swap executed!");
    await sleep(500);

    const balanceS2 = await tokenS.balanceOf(wallet.address);
    const balanceA2 = await tokenA.balanceOf(wallet.address);
    console.log("After: TOKENS =", ethers.formatEther(balanceS2), "| TOKENA =", ethers.formatEther(balanceA2));
    console.log("Result: Spent", ethers.formatEther(balanceS1 - balanceS2), "TOKENS, Got", ethers.formatEther(balanceA2 - balanceA1), "TOKENA");
  } catch (error) {
    console.log("❌", error.message.substring(0, 150));
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅ TEST COMPLETE!");
  console.log("=".repeat(80));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
