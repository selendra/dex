const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  const tokens = [
    ["TUSD", "0xA9233751245AFB7420B6AE108dF94E63418aD4d9"],
    ["TBROWN", "0x0e96A9D425bedEC3807CEb0aaA0825Aab5cF7Ea4"],
    ["TSMART", "0x3F35Ff1a1C3AbfBc916dECde3DC08b2bFFFe8900"],
    ["TZANDO", "0x2c0832A61271eA2E989B90202219ffB630c00901"]
  ];
  
  const abi = ["function balanceOf(address) view returns (uint256)"];
  
  console.log("\n--- DEPLOYER BALANCES (used by backend) ---");
  for (const [name, addr] of tokens) {
    const c = new ethers.Contract(addr, abi, deployer);
    const bal = await c.balanceOf(deployer.address);
    console.log(`${name}: ${ethers.formatEther(bal)}`);
  }
  
  const adminAddr = "0xA16a61B250081A9Afe5A8029d69af0d5C7323628";
  console.log("\n--- ADMIN BALANCES (shown in frontend) ---");
  for (const [name, addr] of tokens) {
    const c = new ethers.Contract(addr, abi, deployer);
    const bal = await c.balanceOf(adminAddr);
    console.log(`${name}: ${ethers.formatEther(bal)}`);
  }
}

main().then(() => process.exit(0)).catch(console.error);
