const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const adminAddress = "0xA16a61B250081A9Afe5A8029d69af0d5C7323628";
  
  // Get deployer (token owner)
  const [deployer] = await ethers.getSigners();
  console.log("Transferring tokens from:", deployer.address);
  console.log("To admin:", adminAddress);
  
  // Token addresses on Selendra
  const tokens = [
    { name: "TUSD", address: process.env.SELENDRA_TUSD_ADDRESS },
    { name: "TBROWN", address: process.env.SELENDRA_TBROWN_ADDRESS },
    { name: "TSMART", address: process.env.SELENDRA_TSMART_ADDRESS },
    { name: "TZANDO", address: process.env.SELENDRA_TZANDO_ADDRESS },
  ];
  
  // Amount to transfer (100,000 tokens each)
  const transferAmount = ethers.parseEther("100000");
  
  // ERC20 ABI for transfer
  const erc20Abi = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
    "function symbol() view returns (string)"
  ];
  
  for (const token of tokens) {
    console.log(`\n--- ${token.name} ---`);
    const contract = new ethers.Contract(token.address, erc20Abi, deployer);
    
    // Check deployer balance
    const deployerBalance = await contract.balanceOf(deployer.address);
    console.log(`Deployer balance: ${ethers.formatEther(deployerBalance)} ${token.name}`);
    
    // Check admin balance before
    const adminBalanceBefore = await contract.balanceOf(adminAddress);
    console.log(`Admin balance before: ${ethers.formatEther(adminBalanceBefore)} ${token.name}`);
    
    // Transfer
    console.log(`Transferring ${ethers.formatEther(transferAmount)} ${token.name}...`);
    const tx = await contract.transfer(adminAddress, transferAmount);
    await tx.wait();
    
    // Check admin balance after
    const adminBalanceAfter = await contract.balanceOf(adminAddress);
    console.log(`Admin balance after: ${ethers.formatEther(adminBalanceAfter)} ${token.name}`);
    console.log(`✅ Transfer complete!`);
  }
  
  console.log("\n🎉 All tokens transferred to admin successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
