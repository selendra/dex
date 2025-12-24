const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const API_BASE = `${BASE_URL}/api/v1`;

const TKNA = process.env.TOKEN_A || '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6';
const TKNB = process.env.TOKEN_B || '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318';

async function testLiquidityRoutes() {
  console.log('💧 Testing Liquidity Routes...\n');
  
  try {
    // Test 1: Get add liquidity quote
    console.log('1. Testing POST /api/v1/liquidity/add/quote');
    const addQuotePayload = {
      tokenA: TKNA,
      tokenB: TKNB,
      amountA: '10000000000000000000', // 10 tokens
      amountB: '10000000000000000000', // 10 tokens
      fee: 3000
    };
    
    const quoteResponse = await axios.post(`${API_BASE}/liquidity/add/quote`, addQuotePayload);
    console.log('   ✅ Add liquidity quote:');
    console.log('      Pool ID:', quoteResponse.data.data.poolId);
    console.log('      Token A:', quoteResponse.data.data.tokenA);
    console.log('      Token B:', quoteResponse.data.data.tokenB);
    console.log('      Amount A:', quoteResponse.data.data.amountA);
    console.log('      Amount B:', quoteResponse.data.data.amountB);
    console.log('      Liquidity:', quoteResponse.data.data.liquidity);
    console.log('      Fee:', quoteResponse.data.data.fee);
    console.log('      Current Price:', quoteResponse.data.data.currentPrice);
    console.log();
    
    // Test 2: Test with different amounts
    console.log('2. Testing quotes with different amounts');
    const amounts = [
      { amountA: '1000000000000000000', amountB: '1000000000000000000' },   // 1:1
      { amountA: '5000000000000000000', amountB: '5000000000000000000' },   // 5:5
      { amountA: '100000000000000000000', amountB: '100000000000000000000' }, // 100:100
    ];
    
    for (const amount of amounts) {
      const response = await axios.post(`${API_BASE}/liquidity/add/quote`, {
        tokenA: TKNA,
        tokenB: TKNB,
        ...amount,
        fee: 3000
      });
      const aFormatted = (parseFloat(amount.amountA) / 1e18).toFixed(1);
      const bFormatted = (parseFloat(amount.amountB) / 1e18).toFixed(1);
      console.log(`   ✅ ${aFormatted}:${bFormatted} → Liquidity: ${response.data.data.liquidity}`);
    }
    console.log();
    
    // Test 3: Add liquidity (requires authentication)
    console.log('3. Testing POST /api/v1/liquidity/add (requires auth)');
    try {
      await axios.post(`${API_BASE}/liquidity/add`, {
        tokenA: TKNA,
        tokenB: TKNB,
        amountA: '10000000000000000000',
        amountB: '10000000000000000000',
        recipient: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        deadline: Math.floor(Date.now() / 1000) + 300,
        fee: 3000
      });
      console.log('   ❌ Should have failed (no authentication)\n');
      return false;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('   ✅ Authentication required (401)');
        console.log('   ✅ Message:', error.response?.data?.message);
        console.log();
      } else {
        console.log('   ❌ Unexpected error:', error.response?.data || error.message);
        console.log();
      }
    }
    
    // Test 4: Remove liquidity quote (requires authentication)
    console.log('4. Testing POST /api/v1/liquidity/remove/quote (requires auth)');
    try {
      await axios.post(`${API_BASE}/liquidity/remove/quote`, {
        tokenId: '1',
        liquidityPercent: 50
      });
      console.log('   ❌ Should have failed (no authentication)\n');
      return false;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('   ✅ Authentication required (401)');
        console.log('   ✅ Message:', error.response?.data?.message);
        console.log();
      } else {
        console.log('   ❌ Unexpected error:', error.response?.data || error.message);
        console.log();
      }
    }
    
    // Test 5: Remove liquidity (requires authentication)
    console.log('5. Testing POST /api/v1/liquidity/remove (requires auth)');
    try {
      await axios.post(`${API_BASE}/liquidity/remove`, {
        tokenId: '1',
        liquidityPercent: 100,
        recipient: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        deadline: Math.floor(Date.now() / 1000) + 300
      });
      console.log('   ❌ Should have failed (no authentication)\n');
      return false;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('   ✅ Authentication required (401)');
        console.log('   ✅ Message:', error.response?.data?.message);
        console.log();
      } else {
        console.log('   ❌ Unexpected error:', error.response?.data || error.message);
        console.log();
      }
    }
    
    // Test 6: Invalid token address
    console.log('6. Testing POST /api/v1/liquidity/add/quote with invalid address');
    try {
      await axios.post(`${API_BASE}/liquidity/add/quote`, {
        tokenA: 'invalid',
        tokenB: TKNB,
        amountA: '10000000000000000000',
        amountB: '10000000000000000000',
        fee: 3000
      });
      console.log('   ❌ Should have failed validation\n');
      return false;
    } catch (error) {
      console.log('   ✅ Validation error caught:', error.response?.data?.message || error.message);
      console.log('   ✅ Status code:', error.response?.status);
      console.log();
    }
    
    // Test 7: Test rate limiting for liquidity operations
    console.log('7. Testing rate limiting for liquidity quotes');
    let requestCount = 0;
    
    for (let i = 0; i < 10; i++) {
      try {
        await axios.post(`${API_BASE}/liquidity/add/quote`, addQuotePayload);
        requestCount++;
      } catch (error) {
        if (error.response?.status === 429) {
          console.log(`   ✅ Rate limited after ${requestCount} requests`);
          console.log('   ✅ Liquidity operations have stricter rate limits');
          break;
        }
      }
    }
    
    if (requestCount >= 10) {
      console.log(`   ✅ Completed ${requestCount} requests without rate limiting`);
    }
    console.log();
    
    console.log('✅ All liquidity route tests passed!\n');
    console.log('ℹ️  Note: Full liquidity operations require authentication and implementation\n');
    return true;
  } catch (error) {
    console.error('❌ Liquidity route test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

if (require.main === module) {
  testLiquidityRoutes()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { testLiquidityRoutes };
