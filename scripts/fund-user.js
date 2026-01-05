const { ethers } = require("hardhat");

async function main() {
  const userAddr = "0x9509b9AC8CA298BcA451e18888b3096EE74d61Ee";
  const tokenSAddr = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
  
  const [owner] = await ethers.getSigners();
  const token = await ethers.getContractAt("TestToken", tokenSAddr);
  
  const tx = await token.transfer(userAddr, ethers.parseEther("1000"));
  await tx.wait();
  
  console.log("Transferred 1000 TOKENS to", userAddr);
  const bal = await token.balanceOf(userAddr);
  console.log("Balance:", ethers.formatEther(bal));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
