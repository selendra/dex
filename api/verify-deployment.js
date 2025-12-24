const { ethers } = require('ethers');
require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function verifyContractDeployment() {
  log('\n╔════════════════════════════════════════════════════════╗', colors.cyan);
  log('║        DEX Contract Deployment Verification            ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════╝\n', colors.cyan);

  try {
    // Connect to provider
    log('➤ Connecting to blockchain...', colors.blue);
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const network = await provider.getNetwork();
    log(`  ✓ Connected to network: ${network.name} (chainId: ${network.chainId})`, colors.green);

    // Check signer balance
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const balance = await provider.getBalance(signer.address);
    log(`  ✓ Signer address: ${signer.address}`, colors.green);
    log(`  ✓ Balance: ${ethers.formatEther(balance)} ETH\n`, colors.green);

    // Contract addresses
    const contracts = {
      'PoolManager': process.env.POOL_MANAGER_ADDRESS,
      'PositionManager': process.env.POSITION_MANAGER_ADDRESS,
      'SwapRouter': process.env.SWAP_ROUTER_ADDRESS,
      'StateView': process.env.STATE_VIEW_ADDRESS
    };

    log('➤ Verifying contract deployments...\n', colors.blue);

    let allDeployed = true;

    for (const [name, address] of Object.entries(contracts)) {
      if (!address) {
        log(`  ✗ ${name}: NOT CONFIGURED`, colors.red);
        allDeployed = false;
        continue;
      }

      try {
        const code = await provider.getCode(address);
        
        if (code === '0x') {
          log(`  ✗ ${name}: No code at address ${address}`, colors.red);
          allDeployed = false;
        } else {
          const codeSize = (code.length - 2) / 2; // Remove '0x' and divide by 2 for bytes
          log(`  ✓ ${name}:`, colors.green);
          log(`    Address: ${address}`, colors.green);
          log(`    Code size: ${codeSize} bytes`, colors.green);
        }
      } catch (error) {
        log(`  ✗ ${name}: Error checking address - ${error.message}`, colors.red);
        allDeployed = false;
      }
    }

    log('\n' + '─'.repeat(60), colors.cyan);

    if (allDeployed) {
      log('\n✓ All contracts are deployed and verified!', colors.green);
      log('\n➤ Ready to start API server with:', colors.blue);
      log('  npm start', colors.yellow);
    } else {
      log('\n✗ Some contracts are not deployed properly!', colors.red);
      log('\n➤ To deploy contracts, run from the project root:', colors.yellow);
      log('  npm run node          # Start Hardhat node', colors.yellow);
      log('  npm run deploy:local  # Deploy contracts', colors.yellow);
    }

    log('\n' + '─'.repeat(60) + '\n', colors.cyan);

    return allDeployed;

  } catch (error) {
    log(`\n✗ Error: ${error.message}`, colors.red);
    return false;
  }
}

// Run verification
verifyContractDeployment().then(success => {
  process.exit(success ? 0 : 1);
});
