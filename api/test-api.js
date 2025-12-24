const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

// ANSI color codes for console output
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

function printSection(title) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`  ${title}`, colors.cyan);
  log('='.repeat(60), colors.cyan);
}

async function testEndpoint(name, method, url, data = null) {
  try {
    log(`\n➤ Testing: ${name}`, colors.blue);
    log(`  ${method} ${url}`, colors.yellow);
    
    if (data) {
      log(`  Request Body:`, colors.yellow);
      console.log(JSON.stringify(data, null, 2));
    }
    
    const config = {
      method,
      url: `${API_BASE_URL}${url}`,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    
    log(`  ✓ Status: ${response.status}`, colors.green);
    log(`  Response:`, colors.green);
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    log(`  ✗ Error: ${error.message}`, colors.red);
    if (error.response) {
      log(`  Status: ${error.response.status}`, colors.red);
      console.log(JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

async function runTests() {
  log('\n╔════════════════════════════════════════════════════════╗', colors.cyan);
  log('║          DEX REST API - Integration Tests              ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════╝', colors.cyan);
  
  // Sample token addresses (replace with actual deployed tokens)
  const TOKEN_A = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  const TOKEN_B = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
  const RECIPIENT = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // Hardhat default account
  
  printSection('1. Health Check');
  await testEndpoint(
    'API Health Check',
    'GET',
    '/health'
  );
  
  printSection('2. Price Endpoints');
  
  await testEndpoint(
    'Get Price Quote',
    'POST',
    '/api/price/quote',
    {
      tokenIn: TOKEN_A,
      tokenOut: TOKEN_B,
      amountIn: '1000000000000000000',
      fee: 3000
    }
  );
  
  await testEndpoint(
    'Get Pool Price',
    'GET',
    `/api/price/test-pool?currency0=${TOKEN_A}&currency1=${TOKEN_B}&fee=3000`
  );
  
  printSection('3. Swap Endpoints');
  
  await testEndpoint(
    'Get Swap Quote',
    'POST',
    '/api/swap/quote',
    {
      tokenIn: TOKEN_A,
      tokenOut: TOKEN_B,
      amountIn: '1000000000000000000',
      fee: 3000
    }
  );
  
  await testEndpoint(
    'Find Optimal Route',
    'POST',
    '/api/swap/route',
    {
      tokenIn: TOKEN_A,
      tokenOut: TOKEN_B,
      amountIn: '1000000000000000000'
    }
  );
  
  // Uncomment to test actual swap execution (requires setup)
  // await testEndpoint(
  //   'Execute Swap',
  //   'POST',
  //   '/api/swap/execute',
  //   {
  //     tokenIn: TOKEN_A,
  //     tokenOut: TOKEN_B,
  //     amountIn: '1000000000000000000',
  //     amountOutMinimum: '990000000000000000',
  //     recipient: RECIPIENT,
  //     fee: 3000,
  //     slippageTolerance: 0.5
  //   }
  // );
  
  printSection('4. Liquidity Endpoints');
  
  await testEndpoint(
    'Add Liquidity Quote',
    'POST',
    '/api/liquidity/add/quote',
    {
      currency0: TOKEN_A,
      currency1: TOKEN_B,
      fee: 3000,
      tickLower: -887220,
      tickUpper: 887220,
      amount0Desired: '1000000000000000000',
      amount1Desired: '1000000000000000000'
    }
  );
  
  await testEndpoint(
    'Remove Liquidity Quote',
    'POST',
    '/api/liquidity/remove/quote',
    {
      tokenId: 1,
      liquidityPercentage: 100
    }
  );
  
  // Uncomment to test actual liquidity operations (requires setup and approvals)
  // await testEndpoint(
  //   'Add Liquidity',
  //   'POST',
  //   '/api/liquidity/add',
  //   {
  //     currency0: TOKEN_A,
  //     currency1: TOKEN_B,
  //     fee: 3000,
  //     tickLower: -887220,
  //     tickUpper: 887220,
  //     liquidity: '1000000000000000000',
  //     amount0Max: '1100000000000000000',
  //     amount1Max: '1100000000000000000',
  //     recipient: RECIPIENT,
  //     deadline: Math.floor(Date.now() / 1000) + 1800
  //   }
  // );
  
  printSection('5. Pool Endpoints');
  
  await testEndpoint(
    'Get Pool Details',
    'GET',
    `/api/pools/test-pool?currency0=${TOKEN_A}&currency1=${TOKEN_B}&fee=3000`
  );
  
  await testEndpoint(
    'List Pools',
    'GET',
    '/api/pools?limit=10&offset=0'
  );
  
  log('\n╔════════════════════════════════════════════════════════╗', colors.cyan);
  log('║                   Tests Complete                       ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════╝', colors.cyan);
  log('\nNote: Some endpoints require actual pool setup and token approvals.', colors.yellow);
  log('Uncomment the execution tests after setting up pools and tokens.\n', colors.yellow);
}

// Run tests
runTests().catch(error => {
  log(`\nFatal Error: ${error.message}`, colors.red);
  process.exit(1);
});
