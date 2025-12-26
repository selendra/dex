const { ethers } = require("ethers");

async function main() {
  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  
  const poolManager = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const tokenS = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
  const tokenA = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";
  
  console.log("Checking contract code...\n");
  
  const pmCode = await provider.getCode(poolManager);
  console.log("PoolManager code length:", pmCode.length);
  console.log("PoolManager has code:", pmCode !== "0x");
  
  const tsCode = await provider.getCode(tokenS);
  console.log("\nTokenS code length:", tsCode.length);
  console.log("TokenS has code:", tsCode !== "0x");
  
  const taCode = await provider.getCode(tokenA);
  console.log("\nTokenA code length:", taCode.length);
  console.log("TokenA has code:", taCode !== "0x");
  
  // Try to call a simple view function on PoolManager
  const ERC20_ABI = ["function symbol() view returns (string)", "function balanceOf(address) view returns (uint256)"];
  const tokenSContract = new ethers.Contract(tokenS, ERC20_ABI, provider);
  
  try {
    const symbol = await tokenSContract.symbol();
    console.log("\n✅ TokenS symbol:", symbol);
  } catch (e) {
    console.log("\n❌ TokenS call failed:", e.message.substring(0, 60));
  }
  
  try {
    const balance = await tokenSContract.balanceOf("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    console.log("✅ TokenS balance:", ethers.formatEther(balance));
  } catch (e) {
    console.log("❌ TokenS balanceOf failed:", e.message.substring(0, 60));
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
