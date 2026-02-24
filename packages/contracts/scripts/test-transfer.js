const { ethers } = require("ethers");

const PRIVATE_KEY = "0x5aa589e3adf3b85988353cd7276f1957fb9a2b1b989816d4a67d6cef9f5fe9db";
const RPC_URL = "https://rpc.selendra.org";
const TUSD = "0x8C771AB14EE8f9e1Cd2576767aF8E6aC9B6a017C";
const LIQ_MANAGER = "0x9bF44bb20d84795F9804104494068B479e7D43f3";

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)"
];

async function test() {
  const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, {
    staticNetwork: true,
    batchMaxCount: 1
  });
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log("Wallet:", wallet.address);
  
  const token = new ethers.Contract(TUSD, ERC20_ABI, wallet);
  const symbol = await token.symbol();
  const balance = await token.balanceOf(wallet.address);
  
  console.log(`Token: ${symbol}`);
  console.log(`Balance: ${ethers.formatEther(balance)}`);
  
  const amount = ethers.parseEther("100");
  
  // Try static call first to see if it would succeed
  console.log("\nTrying staticCall for transfer...");
  try {
    const result = await token.transfer.staticCall(LIQ_MANAGER, amount);
    console.log("Static call result:", result);
  } catch (e) {
    console.log("Static call failed:", e.shortMessage || e.message);
    return;
  }
  
  // If static call succeeded, try actual transfer
  console.log("\nSending actual transfer...");
  try {
    const tx = await token.transfer(LIQ_MANAGER, amount, { gasLimit: 100000 });
    console.log("TX hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("Status:", receipt.status === 1 ? "Success" : "Failed");
    console.log("Gas used:", receipt.gasUsed.toString());
  } catch (e) {
    console.log("Transfer failed:", e.shortMessage || e.message);
  }
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
