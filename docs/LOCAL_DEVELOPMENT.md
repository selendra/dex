# Hardhat Local Development Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Hardhat Node
Open a terminal and run:
```bash
npm run node
```

This will start a local Ethereum node at `http://127.0.0.1:8545` with:
- Chain ID: 1337
- 20 pre-funded accounts (10,000 ETH each)
- Instant mining (0s block time)

Keep this terminal running!

### 3. Show Available Accounts
In a new terminal:
```bash
npx hardhat run scripts/show-accounts.js --network localhost
```

### 4. Deploy Contracts
In another terminal:
```bash
npm run deploy:local
```

This will deploy the PoolManager contract to your local network.

### 5. View Deployments
```bash
npx hardhat run scripts/list-deployments.js
```

## Available Commands

### Node Management
```bash
npm run node              # Start local Hardhat node
```

### Deployment
```bash
npm run deploy:local      # Deploy to local node (localhost)
npm run deploy:testnet    # Deploy to Sepolia testnet
```

### Development
```bash
npm run compile           # Compile contracts
npm test                  # Run tests
npm run clean             # Clean artifacts and cache
```

### Utility Scripts
```bash
npx hardhat run scripts/show-accounts.js --network localhost
npx hardhat run scripts/list-deployments.js
```

## Network Configuration

### Local Network (Hardhat)
- URL: http://127.0.0.1:8545
- Chain ID: 1337
- Pre-funded accounts with 10,000 ETH each

### Testnet (Sepolia)
Configure in `.env` file:
```
SEPOLIA_RPC_URL=your_rpc_url
PRIVATE_KEY=your_private_key
```

## Connecting MetaMask to Local Node

1. Open MetaMask
2. Click network dropdown
3. Click "Add Network" → "Add a network manually"
4. Enter:
   - Network Name: Hardhat Local
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 1337
   - Currency Symbol: ETH

5. Import an account using a private key from the node output

## Contract Addresses

After deployment, contract addresses are saved in `deployments/` directory.
Each deployment creates a timestamped JSON file with:
- Network information
- Deployer address
- Contract addresses
- Deployment timestamp

## Troubleshooting

### "cannot estimate gas" error
- Make sure the local node is running
- Check if you have enough ETH in your account

### "nonce too high" error
Reset MetaMask account:
Settings → Advanced → Clear activity tab data

### Port already in use
Kill the process using port 8545:
```bash
# Windows
netstat -ano | findstr :8545
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :8545
kill -9 <PID>
```

## Project Structure

```
dex/
├── contracts/          # Solidity contracts
│   ├── core/          # Core protocol contracts
│   └── periphery/     # Peripheral contracts
├── scripts/           # Deployment and utility scripts
├── test/             # Test files
├── deployments/      # Deployment records
├── hardhat.config.js # Hardhat configuration
└── package.json      # NPM scripts
```

## Next Steps

1. Write tests in `test/` directory
2. Add more deployment scripts for other contracts
3. Create interaction scripts to test deployed contracts
4. Configure environment variables for testnet deployment
