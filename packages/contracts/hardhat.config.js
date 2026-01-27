require("@nomicfoundation/hardhat-toolbox");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1
          },
          evmVersion: "istanbul",
          viaIR: true
        }
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1  // Optimize for smallest deployment size
          },
          evmVersion: "shanghai",
          viaIR: true
        }
      },
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1
          },
          evmVersion: "shanghai",
          viaIR: true
        }
      },
      {
        version: "0.8.26",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1
          },
          evmVersion: "cancun",
          viaIR: true
        }
      }
    ]
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    selendra: {
      url: process.env.SELENDRA_RPC_URL || "https://rpc.selendra.org",
      chainId: 1961,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 10000000000 // 10 gwei
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};