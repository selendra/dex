const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const adminAddr = "0xA16a61B250081A9Afe5A8029d69af0d5C7323628";
  
  // Check native balance
  const balance = await deployer.provider.getBalance(adminAddr);
  console.log(`Admin native balance: ${ethers.formatEther(balance)} SEL`);
  
  // If balance is low, send some SEL for gas
  if (balance < ethers.parseEther("1")) {
    console.log("Sending 10 SEL for gas fees...");
    const tx = await deployer.sendTransaction({
      to: adminAddr,
      value: ethers.parseEther("10")
    });
    await tx.wait();
    const newBalance = await deployer.provider.getBalance(adminAddr);
    console.log(`New admin balance: ${ethers.formatEther(newBalance)} SEL`);
  } else {
    console.log("Admin has enough SEL for gas");
  }
}

main().then(() => process.exit(0)).catch(console.error);
