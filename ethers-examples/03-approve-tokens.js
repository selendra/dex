/**
 * Pure Ethers.js Example - Approve and Check Balances
 * 
 * Check token balances and approve tokens for trading
 * 
 * Install: npm install ethers dotenv
 * Run: node ethers-examples/03-approve-tokens.js
 */

const { ethers } = require("ethers");
require("dotenv").config();

// ERC20 ABI
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount) external" // For test tokens
];

async function main() {
  console.log("=".repeat(60));
  console.log("Pure Ethers.js - Approve Tokens");
  console.log("=".repeat(60));

  // ============================================================================
  // Step 1: Setup Provider and Wallet
  // ============================================================================
  console.log("\n📡 Connecting...");
  
  const provider = new ethers.JsonRpcProvider(
    process.env.RPC_URL || "http://localhost:8545"
  );
  
  const wallet = new ethers.Wallet(
    process.env.PRIVATE_KEY || 
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    provider
  );
  
  console.log("✅ Wallet:", wallet.address);
  console.log("✅ ETH Balance:", ethers.formatEther(await provider.getBalance(wallet.address)));

  // ============================================================================
  // Step 2: Get Token Addresses
  // ============================================================================
  const token0Address = process.env.TOKEN0_ADDRESS;
  const token1Address = process.env.TOKEN1_ADDRESS;
  
  if (!token0Address || !token1Address) {
    console.log("\n❌ TOKEN0_ADDRESS and TOKEN1_ADDRESS required in .env");
    process.exit(1);
  }

  console.log("\n🪙 Tokens:");
  console.log("Token0:", token0Address);
  console.log("Token1:", token1Address);

  // ============================================================================
  // Step 3: Connect to Token Contracts
  // ============================================================================
  const token0 = new ethers.Contract(token0Address, ERC20_ABI, wallet);
  const token1 = new ethers.Contract(token1Address, ERC20_ABI, wallet);
  
  // Get token info
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
  
  console.log(`\n${symbol0}: ${name0} (${decimals0} decimals)`);
  console.log(`${symbol1}: ${name1} (${decimals1} decimals)`);

  // ============================================================================
  // Step 4: Check Balances
  // ============================================================================
  console.log("\n💰 Checking Balances...");
  
  const balance0 = await token0.balanceOf(wallet.address);
  const balance1 = await token1.balanceOf(wallet.address);
  
  console.log(`${symbol0}:`, ethers.formatUnits(balance0, decimals0));
  console.log(`${symbol1}:`, ethers.formatUnits(balance1, decimals1));

  // Mint tokens if balance is low
  if (balance0 === 0n) {
    console.log(`\n🪙 Minting ${symbol0}...`);
    try {
      const mintAmount = ethers.parseUnits("1000", decimals0);
      const tx = await token0.mint(wallet.address, mintAmount);
      await tx.wait();
      console.log(`✅ Minted 1000 ${symbol0}`);
    } catch (error) {
      console.log(`⚠️  Could not mint ${symbol0}:`, error.message);
    }
  }
  
  if (balance1 === 0n) {
    console.log(`\n🪙 Minting ${symbol1}...`);
    try {
      const mintAmount = ethers.parseUnits("1000", decimals1);
      const tx = await token1.mint(wallet.address, mintAmount);
      await tx.wait();
      console.log(`✅ Minted 1000 ${symbol1}`);
    } catch (error) {
      console.log(`⚠️  Could not mint ${symbol1}:`, error.message);
    }
  }

  // ============================================================================
  // Step 5: Check Allowances
  // ============================================================================
  console.log("\n🔐 Checking Allowances...");
  
  const poolManagerAddress = process.env.POOL_MANAGER_ADDRESS ||
    "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
  
  const positionManagerAddress = process.env.POSITION_MANAGER_ADDRESS ||
    "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82";
  
  console.log("Spenders:");
  console.log("  - PoolManager:", poolManagerAddress);
  console.log("  - PositionManager:", positionManagerAddress);
  
  const allowance0PM = await token0.allowance(wallet.address, poolManagerAddress);
  const allowance1PM = await token1.allowance(wallet.address, poolManagerAddress);
  const allowance0PosM = await token0.allowance(wallet.address, positionManagerAddress);
  const allowance1PosM = await token1.allowance(wallet.address, positionManagerAddress);
  
  console.log(`\n${symbol0} Allowances:`);
  console.log("  - PoolManager:", ethers.formatUnits(allowance0PM, decimals0));
  console.log("  - PositionManager:", ethers.formatUnits(allowance0PosM, decimals0));
  
  console.log(`\n${symbol1} Allowances:`);
  console.log("  - PoolManager:", ethers.formatUnits(allowance1PM, decimals1));
  console.log("  - PositionManager:", ethers.formatUnits(allowance1PosM, decimals1));

  // ============================================================================
  // Step 6: Approve Tokens
  // ============================================================================
  console.log("\n✅ Approving Tokens...");
  
  const maxApproval = ethers.MaxUint256;
  
  // Approve to PoolManager
  if (allowance0PM < ethers.parseUnits("1000", decimals0)) {
    console.log(`\n📝 Approving ${symbol0} to PoolManager...`);
    const tx0 = await token0.approve(poolManagerAddress, maxApproval);
    console.log("Transaction:", tx0.hash);
    await tx0.wait();
    console.log("✅ Approved");
  } else {
    console.log(`\n✅ ${symbol0} already approved to PoolManager`);
  }
  
  if (allowance1PM < ethers.parseUnits("1000", decimals1)) {
    console.log(`\n📝 Approving ${symbol1} to PoolManager...`);
    const tx1 = await token1.approve(poolManagerAddress, maxApproval);
    console.log("Transaction:", tx1.hash);
    await tx1.wait();
    console.log("✅ Approved");
  } else {
    console.log(`\n✅ ${symbol1} already approved to PoolManager`);
  }
  
  // Approve to PositionManager
  if (allowance0PosM < ethers.parseUnits("1000", decimals0)) {
    console.log(`\n📝 Approving ${symbol0} to PositionManager...`);
    const tx0 = await token0.approve(positionManagerAddress, maxApproval);
    await tx0.wait();
    console.log("✅ Approved");
  } else {
    console.log(`\n✅ ${symbol0} already approved to PositionManager`);
  }
  
  if (allowance1PosM < ethers.parseUnits("1000", decimals1)) {
    console.log(`\n📝 Approving ${symbol1} to PositionManager...`);
    const tx1 = await token1.approve(positionManagerAddress, maxApproval);
    await tx1.wait();
    console.log("✅ Approved");
  } else {
    console.log(`\n✅ ${symbol1} already approved to PositionManager`);
  }

  // ============================================================================
  // Step 7: Final Balance Check
  // ============================================================================
  console.log("\n💰 Final Balances:");
  
  const finalBalance0 = await token0.balanceOf(wallet.address);
  const finalBalance1 = await token1.balanceOf(wallet.address);
  
  console.log(`${symbol0}:`, ethers.formatUnits(finalBalance0, decimals0));
  console.log(`${symbol1}:`, ethers.formatUnits(finalBalance1, decimals1));

  console.log("\n" + "=".repeat(60));
  console.log("✅ Complete!");
  console.log("=".repeat(60));
  
  console.log("\n💡 Next Steps:");
  console.log("  - Add liquidity to the pool");
  console.log("  - Execute swaps");
  console.log("  - Check pool state");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });
