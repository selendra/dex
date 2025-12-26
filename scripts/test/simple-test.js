const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  console.log("=== SIMPLE 4-TOKEN TEST ===\n");
  
  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  const wallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
  
  const ERC20_ABI = ["function symbol() view returns (string)", "function balanceOf(address) view returns (uint256)", "function transfer(address, uint256) returns (bool)", "function mint(address, uint256)"];
  
  const tokenS = new ethers.Contract("0xa513E6E4b8f2a923D98304ec87F64353C4D5C853", ERC20_ABI, wallet);
  const tokenA = new ethers.Contract("0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6", ERC20_ABI, wallet);
  const tokenB = new ethers.Contract("0x8A791620dd6260079BF849Dc5567aDC3F2FdC318", ERC20_ABI, wallet);
  const tokenC = new ethers.Contract("0x610178dA211FEF7D417bC0e6FeD39F05609AD788", ERC20_ABI, wallet);
  
  console.log("1. Check token symbols:");
  console.log("  TOKENS:", await tokenS.symbol());
  console.log("  TOKENA:", await tokenA.symbol());
  console.log("  TOKENB:", await tokenB.symbol());
  console.log("  TOKENC:", await tokenC.symbol());
  
  console.log("\n2. Check balances:");
  console.log("  TOKENS:", ethers.formatEther(await tokenS.balanceOf(wallet.address)));
  console.log("  TOKENA:", ethers.formatEther(await tokenA.balanceOf(wallet.address)));
  console.log("  TOKENB:", ethers.formatEther(await tokenB.balanceOf(wallet.address)));
  console.log("  TOKENC:", ethers.formatEther(await tokenC.balanceOf(wallet.address)));
  
  console.log("\n3. Mint more tokens:");
  await (await tokenS.mint(wallet.address, ethers.parseEther("1000"))).wait();
  await (await tokenA.mint(wallet.address, ethers.parseEther("1000"))).wait();
  await (await tokenB.mint(wallet.address, ethers.parseEther("1000"))).wait();
  await (await tokenC.mint(wallet.address, ethers.parseEther("1000"))).wait();
  console.log("  ✅ Minted 1000 of each token");
  
  console.log("\n4. Final balances:");
  console.log("  TOKENS:", ethers.formatEther(await tokenS.balanceOf(wallet.address)));
  console.log("  TOKENA:", ethers.formatEther(await tokenA.balanceOf(wallet.address)));
  console.log("  TOKENB:", ethers.formatEther(await tokenB.balanceOf(wallet.address)));
  console.log("  TOKENC:", ethers.formatEther(await tokenC.balanceOf(wallet.address)));
  
  console.log("\n✅ TOKEN TEST SUCCESSFUL!");
  console.log("\nNext: Initialize pools and test swaps");
  console.log("Issue: PoolManager.initialize() is reverting");
  console.log("Possible causes:");
  console.log("  - PoolManager not compiled with correct settings");
  console.log("  - Invalid sqrtPriceX96 values");
  console.log("  - Pool already initialized");
  console.log("\nRecommendation: Use API endpoints for liquidity & swaps");
}

main().catch(e => console.error("Error:", e.message));
