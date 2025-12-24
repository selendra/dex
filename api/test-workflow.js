const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000';

// Load test configuration
const configPath = path.join(__dirname, 'test-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

async function testWorkflow() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║          DEX REST API - Workflow Test                 ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Health Check
    console.log('1. Testing Health Check...');
    const health = await axios.get(`${API_URL}/health`);
    console.log('   ✓ API is healthy');
    console.log(`   Contracts loaded: ${Object.keys(health.data.data.contracts).length}\n`);

    // 2. Get Token Info
    console.log('2. Getting Token Information...');
    const tokenAInfo = await axios.get(`${API_URL}/api/tokens/${config.tokenA}`);
    const tokenBInfo = await axios.get(`${API_URL}/api/tokens/${config.tokenB}`);
    console.log(`   ✓ Token A (${tokenAInfo.data.data.symbol}): ${config.tokenA}`);
    console.log(`   ✓ Token B (${tokenBInfo.data.data.symbol}): ${config.tokenB}\n`);

    // 3. Get Price Quote
    console.log('3. Testing Price Quote...');
    const priceQuote = await axios.post(`${API_URL}/api/price/quote`, {
      tokenIn: config.currency0,
      tokenOut: config.currency1,
      amountIn: '1000000000000000000', // 1 token
      fee: 3000
    });
    console.log(`   ✓ Price: ${priceQuote.data.data.price}`);
    console.log(`   ✓ Amount Out: ${priceQuote.data.data.amountOut}\n`);

    // 4. Get Liquidity Quote
    console.log('4. Testing Liquidity Add Quote...');
    const liquidityQuote = await axios.post(`${API_URL}/api/liquidity/add/quote`, {
      currency0: config.currency0,
      currency1: config.currency1,
      fee: 3000,
      tickLower: -887220,
      tickUpper: 887220,
      amount0Desired: '1000000000000000000',
      amount1Desired: '1000000000000000000'
    });
    console.log(`   ✓ Estimated Liquidity: ${liquidityQuote.data.data.quote.liquidity}`);
    console.log(`   ✓ Amount0: ${liquidityQuote.data.data.quote.amount0}`);
    console.log(`   ✓ Amount1: ${liquidityQuote.data.data.quote.amount1}\n`);

    // 5. Test Token Balance
    console.log('5. Checking Token Balances...');
    const balanceA = await axios.get(`${API_URL}/api/tokens/${config.tokenA}/balance/${config.deployer}`);
    const balanceB = await axios.get(`${API_URL}/api/tokens/${config.tokenB}/balance/${config.deployer}`);
    console.log(`   ✓ Token A Balance: ${balanceA.data.data.balance}`);
    console.log(`   ✓ Token B Balance: ${balanceB.data.data.balance}\n`);

    // 6. List Pools
    console.log('6. Listing Pools...');
    const pools = await axios.get(`${API_URL}/api/pools?limit=10`);
    console.log(`   ✓ Total Pools: ${pools.data.data.pagination.total}`);
    console.log(`   Note: ${pools.data.data.message || 'Pool listing available'}\n`);

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║                   Workflow Test PASSED                 ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📝 Test Summary:');
    console.log('   • API health check: ✓');
    console.log('   • Token information: ✓');
    console.log('   • Price quotes: ✓');
    console.log('   • Liquidity quotes: ✓');
    console.log('   • Token balances: ✓');
    console.log('   • Pool listing: ✓');

    console.log('\n💡 Next Steps:');
    console.log('   1. Initialize a pool using the admin API');
    console.log('   2. Add liquidity to the pool');
    console.log('   3. Execute swaps');
    console.log('   See USAGE_EXAMPLES.md for detailed instructions\n');

  } catch (error) {
    console.error('\n❌ Error during workflow test:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data.error?.message || error.message}`);
    } else {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

// Run the test
testWorkflow();
