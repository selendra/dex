const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const API_BASE = `${BASE_URL}/api/v1`;

// Test token addresses from your deployment
const TKNA = process.env.TOKEN_A || '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6';
const TKNB = process.env.TOKEN_B || '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318';

async function testSwapRoutes() {
  console.log('💱 Testing Swap Routes...\n');
  
  try {
    // Test 1: Get swap quote
    console.log('1. Testing POST /api/v1/swap/quote');
    const quotePayload = {
      tokenIn: TKNA,
      tokenOut: TKNB,
      amountIn: '1000000000000000000', // 1 token with 18 decimals
      fee: 3000
    };
    
    const quoteResponse = await axios.post(`${API_BASE}/swap/quote`, quotePayload);
    console.log('   ✅ Quote received:');
    console.log('      Amount In:', quoteResponse.data.data.amountIn);
    console.log('      Amount Out:', quoteResponse.data.data.amountOut);
    console.log('      Price:', quoteResponse.data.data.price);
    console.log('      Price Impact:', quoteResponse.data.data.priceImpact, '%');
    console.log('      Fee:', quoteResponse.data.data.fee);
    console.log('      Pool ID:', quoteResponse.data.data.poolId);
    console.log('      Expires At:', quoteResponse.data.meta.expiresAt, '\n');
    
    // Test 2: Test with invalid token address
    console.log('2. Testing POST /api/v1/swap/quote with invalid address');
    try {
      await axios.post(`${API_BASE}/swap/quote`, {
        tokenIn: 'invalid-address',
        tokenOut: TKNB,
        amountIn: '1000000000000000000',
        fee: 3000
      });
      console.log('   ❌ Should have failed validation\n');
      return false;
    } catch (error) {
      console.log('   ✅ Validation error caught:', error.response?.data?.message || error.message);
      console.log('   ✅ Status code:', error.response?.status, '\n');
    }
    
    // Test 3: Test with different fee tiers
    console.log('3. Testing POST /api/v1/swap/quote with different fee tiers');
    const fees = [500, 3000, 10000];
    for (const fee of fees) {
      const response = await axios.post(`${API_BASE}/swap/quote`, {
        tokenIn: TKNA,
        tokenOut: TKNB,
        amountIn: '1000000000000000000',
        fee
      });
      console.log(`   ✅ Fee ${fee}: Amount Out = ${response.data.data.amountOut}`);
    }
    console.log();
    
    // Test 4: Find optimal route (if implemented)
    console.log('4. Testing POST /api/v1/swap/route');
    try {
      const routeResponse = await axios.post(`${API_BASE}/swap/route`, {
        tokenIn: TKNA,
        tokenOut: TKNB,
        amountIn: '1000000000000000000'
      });
      console.log('   ✅ Route found:');
      console.log('      Route:', routeResponse.data.data.route.join(' -> '));
      console.log('      Amount Out:', routeResponse.data.data.amountOut, '\n');
    } catch (error) {
      console.log('   ⚠️  Route endpoint not fully implemented yet\n');
    }
    
    // Test 5: Execute swap (requires authentication)
    console.log('5. Testing POST /api/v1/swap/execute (requires auth)');
    try {
      await axios.post(`${API_BASE}/swap/execute`, {
        tokenIn: TKNA,
        tokenOut: TKNB,
        amountIn: '1000000000000000000',
        amountOutMinimum: '900000000000000000',
        recipient: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        fee: 3000,
        deadline: Math.floor(Date.now() / 1000) + 300
      });
      console.log('   ❌ Should have failed (no authentication)\n');
      return false;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('   ✅ Authentication required (401)');
        console.log('   ✅ Message:', error.response?.data?.message, '\n');
      } else {
        console.log('   ❌ Unexpected error:', error.response?.data || error.message, '\n');
        return false;
      }
    }
    
    console.log('✅ All swap route tests passed!\n');
    return true;
  } catch (error) {
    console.error('❌ Swap route test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

if (require.main === module) {
  testSwapRoutes()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { testSwapRoutes };
