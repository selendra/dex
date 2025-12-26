const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  console.log("\n🚀 COMPLETE 4-TOKEN DEX WORKFLOW TEST\n");

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const poolManager = new ethers.Contract(process.env.POOL_MANAGER_ADDRESS, ['function initialize((address,address,uint24,int24,address), uint160) returns (int24)'], wallet);
  const liquidityRouter = new ethers.Contract(process.env.LIQUIDITY_ROUTER_ADDRESS, ['function addLiquidity((address,address,uint24,int24,address), int24, int24, int256)', 'function removeLiquidity((address,address,uint24,int24,address), int24, int24, int256)'], wallet);
  const swapRouter = new ethers.Contract(process.env.SWAP_ROUTER_ADDRESS, ['function swap((address,address,uint24,int24,address), (bool,int256,uint160))'], wallet);
  const stateView = new ethers.Contract(process.env.STATE_VIEW_ADDRESS, ['function getSlot0(bytes32) view returns (uint160,int24,uint24,uint24)', 'function getLiquidity(bytes32) view returns (uint128)'], provider);
  
  const tokenS = new ethers.Contract(process.env.TOKENS_ADDRESS, ['function symbol() view returns (string)', 'function balanceOf(address) view returns (uint256)', 'function approve(address,uint256)', 'function transfer(address,uint256)'], wallet);
  const tokenA = new ethers.Contract(process.env.TOKENA_ADDRESS, ['function symbol() view returns (string)', 'function balanceOf(address) view returns (uint256)', 'function approve(address,uint256)', 'function transfer(address,uint256)'], wallet);
  const tokenB = new ethers.Contract(process.env.TOKENB_ADDRESS, ['function symbol() view returns (string)', 'function balanceOf(address) view returns (uint256)', 'function approve(address,uint256)', 'function transfer(address,uint256)'], wallet);
  const tokenC = new ethers.Contract(process.env.TOKENC_ADDRESS, ['function symbol() view returns (string)', 'function balanceOf(address) view returns (uint256)', 'function approve(address,uint256)', 'function transfer(address,uint256)'], wallet);

  const pools = [
    { name: "TOKENA/TOKENS (10:1)", token0: tokenA, token1: tokenS, addr0: process.env.TOKENA_ADDRESS, addr1: process.env.TOKENS_ADDRESS, sqrtPrice: BigInt(Math.floor(Math.sqrt(10) * Number(2n ** 96n))) },
    { name: "TOKENB/TOKENS (20:1)", token0: tokenB, token1: tokenS, addr0: process.env.TOKENB_ADDRESS, addr1: process.env.TOKENS_ADDRESS, sqrtPrice: BigInt(Math.floor(Math.sqrt(20) * Number(2n ** 96n))) },
    { name: "TOKENC/TOKENS (1:1)", token0: tokenC, token1: tokenS, addr0: process.env.TOKENC_ADDRESS, addr1: process.env.TOKENS_ADDRESS, sqrtPrice: BigInt(Math.floor(Math.sqrt(1) * Number(2n ** 96n))) }
  ];

  // STEP 1: Initialize Pools
  console.log("=".repeat(80));
  console.log("STEP 1: INITIALIZE POOLS");
  console.log("=".repeat(80) + "\n");
  
  let nonce = await wallet.getNonce();
  for (const pool of pools) {
    // Sort tokens for PoolKey (currency0 < currency1)
    const [currency0, currency1] = pool.addr0 < pool.addr1 ? [pool.addr0, pool.addr1] : [pool.addr1, pool.addr0];
    const poolKey = [currency0, currency1, 3000, 60, ethers.ZeroAddress];
    pool.poolKey = poolKey;
    pool.poolId = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['tuple(address,address,uint24,int24,address)'], [poolKey]));
    
    // Store sorted tokens for swap logic
    pool.sortedToken0 = currency0;
    pool.sortedToken1 = currency1;
    
    console.log(`Initializing ${pool.name}...`);
    try {
      const tx = await poolManager.initialize(poolKey, pool.sqrtPrice, { nonce: nonce++ });
      await tx.wait();
      console.log(`✅ ${pool.name} initialized!\n`);
    } catch (error) {
      if (error.message.includes("PoolAlreadyInitialized") || error.message.includes("0x7983c051")) {
        console.log(`✅ ${pool.name} already initialized\n`);
        nonce--;  // Revert nonce increment if pool already existed
      } else {
        console.log(`❌ ${pool.name}: ${error.shortMessage}\n`);
        throw error;
      }
    }
  }

  // STEP 2: Approve Tokens
  console.log("=".repeat(80));
  console.log("STEP 2: APPROVE TOKENS");
  console.log("=".repeat(80) + "\n");
  
  nonce = await wallet.getNonce();
  let tx = await tokenS.approve(swapRouter.target, ethers.MaxUint256, { nonce: nonce++ });
  await tx.wait();
  console.log(`✅ TOKENS approved`);
  
  tx = await tokenA.approve(swapRouter.target, ethers.MaxUint256, { nonce: nonce++ });
  await tx.wait();
  console.log(`✅ TOKENA approved`);
  
  tx = await tokenB.approve(swapRouter.target, ethers.MaxUint256, { nonce: nonce++ });
  await tx.wait();
  console.log(`✅ TOKENB approved`);
  
  tx = await tokenC.approve(swapRouter.target, ethers.MaxUint256, { nonce: nonce++ });
  await tx.wait();
  console.log(`✅ TOKENC approved\n`);

  // STEP 3: Add Liquidity
  console.log("=".repeat(80));
  console.log("STEP 3: ADD LIQUIDITY");
  console.log("=".repeat(80) + "\n");
  
  nonce = await wallet.getNonce();
  for (const pool of pools) {
    console.log(`${pool.name}:`);
    const liquidityBefore = await stateView.getLiquidity(pool.poolId);
    console.log(`  Liquidity before: ${liquidityBefore.toString()}`);
    
    try {
      tx = await liquidityRouter.addLiquidity(pool.poolKey, -600, 600, ethers.parseEther('100'), { nonce: nonce++ });
      await tx.wait();
      
      const liquidityAfter = await stateView.getLiquidity(pool.poolId);
      console.log(`  Liquidity after: ${liquidityAfter.toString()}`);
      console.log(`  ✅ Added ${(liquidityAfter - liquidityBefore).toString()}\n`);
    } catch (error) {
      console.log(`  ❌ Add failed: ${error.shortMessage || error.message.substring(0, 60)}\n`);
    }
  }

  // STEP 4: Execute Swaps
  console.log("=".repeat(80));
  console.log("STEP 4: EXECUTE SWAPS (OTHER -> TOKENS)");
  console.log("=".repeat(80) + "\n");

  nonce = await wallet.getNonce();
  
  for (const pool of pools) {
    const liquidity = await stateView.getLiquidity(pool.poolId);
    
    if (liquidity === 0n) {
      console.log(`⏭️  Skipping ${pool.name} - no liquidity\n`);
      continue;
    }
    
    console.log(`Swap on ${pool.name}:`);
    const tokenOther = pool.token0.target === tokenS.target ? pool.token1 : pool.token0;
    const symS = await tokenS.symbol();
    const symOther = await tokenOther.symbol();
    
    const balS = await tokenS.balanceOf(wallet.address);
    const balOther = await tokenOther.balanceOf(wallet.address);
    console.log(`  Before: ${ethers.formatEther(balS)} ${symS}, ${ethers.formatEther(balOther)} ${symOther}`);
    
    try {
      // Swap OTHER -> TOKENS (get TOKENS out)
      // Check if TOKENS is token0 or token1 in the SORTED poolKey
      const isTOKENStoken0 = pool.sortedToken0.toLowerCase() === tokenS.target.toLowerCase();
      const zeroForOne = !isTOKENStoken0;  // If TOKENS=token1, swap OTHER(0)->TOKENS(1), zeroForOne=true
      const exactOutput = ethers.parseEther("5");
      const priceLimit = zeroForOne ? "4295128740" : "1461446703485210103287273052203988822378723970342";
      
      console.log(`  Direction: ${isTOKENStoken0 ? 'token1->token0' : 'token0->token1'} (zeroForOne=${zeroForOne})`);
      
      tx = await swapRouter.swap(pool.poolKey, [zeroForOne, exactOutput, priceLimit], { nonce: nonce++, gasLimit: 1000000 });
      await tx.wait();
      
      const balS2 = await tokenS.balanceOf(wallet.address);
      const balOther2 = await tokenOther.balanceOf(wallet.address);
      console.log(`  After: ${ethers.formatEther(balS2)} ${symS}, ${ethers.formatEther(balOther2)} ${symOther}`);
      console.log(`  ✅ SUCCESS! Spent ${ethers.formatEther(balOther - balOther2)} ${symOther}, Got ${ethers.formatEther(balS2 - balS)} ${symS}\n`);
    } catch (error) {
      console.log(`  ❌ Swap failed: ${error.shortMessage || error.message.substring(0, 100)}\n`);
    }
  }

  console.log("=".repeat(80));
  console.log("✅✅✅ WORKFLOW COMPLETE! ✅✅✅");
  console.log("=".repeat(80));
}

main().catch(console.error);
