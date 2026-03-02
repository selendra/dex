const { ethers } = require("ethers");
const RPC_URL = "https://rpc.selendra.org";
const TUSD = "0x8C771AB14EE8f9e1Cd2576767aF8E6aC9B6a017C";
const TBROWN = "0x485Da38cf11718c857cE00438B52795BC3b1A956";
const WALLET = "0x2Be029eD2e54a661d36f9dBBD34AE4e744dE6E78";
const LIQ_MANAGER = "0x9bF44bb20d84795F9804104494068B479e7D43f3";

async function check() {
  const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, {
    staticNetwork: true,
    batchMaxCount: 1
  });
  
  console.log("Checking TUSD token:", TUSD);
  const code = await provider.getCode(TUSD);
  console.log("Contract code exists:", code.length > 2);
  
  const erc20 = new ethers.Contract(TUSD, [
    "function balanceOf(address) view returns (uint256)",
    "function owner() view returns (address)",
    "function admin() view returns (address)",
    "function name() view returns (string)",
    "function symbol() view returns (string)"
  ], provider);
  
  try {
    const name = await erc20.name();
    console.log("Name:", name);
  } catch(e) { console.log("name error:", e.shortMessage || e.message); }
  
  try {
    const symbol = await erc20.symbol();
    console.log("Symbol:", symbol);
  } catch(e) { console.log("symbol error:", e.shortMessage || e.message); }
  
  try {
    const balance = await erc20.balanceOf(WALLET);
    console.log("Balance:", ethers.formatEther(balance));
  } catch(e) { console.log("balanceOf error:", e.shortMessage || e.message); }
  
  try {
    const owner = await erc20.owner();
    console.log("Owner:", owner);
  } catch(e) { console.log("No owner function"); }
  
  try {
    const admin = await erc20.admin();
    console.log("Admin:", admin);
  } catch(e) { console.log("No admin function"); }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
