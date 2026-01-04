const hre = require("hardhat");
const authService = require("../api/services/auth");
require('dotenv').config();

async function main() {
  console.log("=".repeat(70));
  console.log("TRANSFER TOKENS TO ADMIN ACCOUNT");
  console.log("=".repeat(70));

  // Get deployer account (first Hardhat account with PRIVATE_KEY from .env)
  const [deployer] = await hre.ethers.getSigners();
  console.log("\nDeployer address:", deployer.address);
  console.log("Deployer ETH balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");

  // Get admin address from database
  const users = authService.getAllUsers();
  const adminUser = users.find(u => u.role === 'admin');
  
  if (!adminUser) {
    console.error("❌ Admin user not found in database!");
    console.log("Please register an admin account first using the admin secret.");
    process.exit(1);
  }

  const adminAddress = adminUser.address;
  console.log("\nAdmin address:", adminAddress);
  console.log("Admin ETH balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(adminAddress)), "ETH");

  // Check if token addresses are in .env
  const tokens = {
    TOKENS: process.env.TOKENS_ADDRESS,
    TOKENA: process.env.TOKENA_ADDRESS,
    TOKENB: process.env.TOKENB_ADDRESS,
    TOKENC: process.env.TOKENC_ADDRESS,
  };

  console.log("\n" + "=".repeat(70));
  console.log("TOKEN ADDRESSES");
  console.log("=".repeat(70));
  
  for (const [name, address] of Object.entries(tokens)) {
    if (!address) {
      console.error(`❌ ${name} address not found in .env!`);
      console.log("Please run: npm run deploy:tokens");
      process.exit(1);
    }
    console.log(`${name}: ${address}`);
  }

  // Amount to transfer (50,000 of each token)
  const transferAmount = hre.ethers.parseEther("50000");
  console.log("\n" + "=".repeat(70));
  console.log("TRANSFERRING TOKENS");
  console.log("Amount per token: 50,000");
  console.log("=".repeat(70));

  // Transfer each token
  for (const [name, address] of Object.entries(tokens)) {
    try {
      console.log(`\n${name}:`);
      
      const token = await hre.ethers.getContractAt("TestToken", address, deployer);
      
      // Check deployer balance
      const deployerBalance = await token.balanceOf(deployer.address);
      console.log(`  Deployer balance: ${hre.ethers.formatEther(deployerBalance)}`);
      
      if (deployerBalance < transferAmount) {
        console.log(`  ⚠️  Insufficient balance, transferring all available: ${hre.ethers.formatEther(deployerBalance)}`);
        if (deployerBalance > 0) {
          const tx = await token.transfer(adminAddress, deployerBalance);
          await tx.wait();
          console.log(`  ✅ Transferred ${hre.ethers.formatEther(deployerBalance)} ${name}`);
        } else {
          console.log(`  ⚠️  No tokens to transfer`);
        }
      } else {
        const tx = await token.transfer(adminAddress, transferAmount);
        await tx.wait();
        console.log(`  ✅ Transferred 50,000 ${name}`);
      }
      
      // Check new balances
      const adminBalance = await token.balanceOf(adminAddress);
      console.log(`  Admin new balance: ${hre.ethers.formatEther(adminBalance)}`);
      
    } catch (error) {
      console.error(`  ❌ Error transferring ${name}:`, error.message);
    }
  }

  // Transfer some ETH for gas fees
  console.log("\n" + "=".repeat(70));
  console.log("TRANSFERRING ETH FOR GAS FEES");
  console.log("=".repeat(70));
  
  const ethAmount = hre.ethers.parseEther("10"); // 10 ETH
  try {
    const tx = await deployer.sendTransaction({
      to: adminAddress,
      value: ethAmount
    });
    await tx.wait();
    console.log(`✅ Transferred 10 ETH for gas fees`);
    
    const adminEthBalance = await hre.ethers.provider.getBalance(adminAddress);
    console.log(`Admin ETH balance: ${hre.ethers.formatEther(adminEthBalance)} ETH`);
  } catch (error) {
    console.error(`❌ Error transferring ETH:`, error.message);
  }

  // Final summary
  console.log("\n" + "=".repeat(70));
  console.log("TRANSFER COMPLETE");
  console.log("=".repeat(70));
  
  console.log("\nAdmin Account Summary:");
  console.log("Address:", adminAddress);
  
  for (const [name, address] of Object.entries(tokens)) {
    try {
      const token = await hre.ethers.getContractAt("TestToken", address);
      const balance = await token.balanceOf(adminAddress);
      console.log(`${name}: ${hre.ethers.formatEther(balance)}`);
    } catch (error) {
      console.log(`${name}: Error reading balance`);
    }
  }
  
  const finalEthBalance = await hre.ethers.provider.getBalance(adminAddress);
  console.log(`ETH: ${hre.ethers.formatEther(finalEthBalance)}`);
  
  console.log("\n✅ Admin account is now funded and ready to use!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
