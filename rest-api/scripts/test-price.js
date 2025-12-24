const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const API_BASE = `${BASE_URL}/api/v1`;

const TKNA = process.env.TOKEN_A || '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6';
const TKNB = process.env.TOKEN_B || '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318';

async function testPriceRoutes() {
  console.log('💰 Testing Price Routes...\n');
  
  try {
    // Test 1: Get price quote
    console.log('1. Testing POST /api/v1/price/quote');
    const quotePayload = {
      tokenIn: TKNA,
      tokenOut: TKNB,
      amountIn: '1000000000000000000',
      fee: 3000
    };
    
    const quoteResponse = await axios.post(`${API_BASE}/price/quote`, quotePayload);
    console.log('   ✅ Quote received:');
    console.log('      Token In:', quoteResponse.data.data.tokenIn);
    console.log('      Token Out:', quoteResponse.data.data.tokenOut);
    console.log('      Amount In:', quoteResponse.data.data.amountIn);
    console.log('      Amount Out:', quoteResponse.data.data.amountOut);
    console.log('      Price:', quoteResponse.data.data.price);
    console.log('      Price Impact:', quoteResponse.data.data.priceImpact, '%');
    console.log('      Fee:', quoteResponse.data.data.fee);
    console.log('      Pool ID:', quoteResponse.data.data.poolId);
    console.log('      Expires At:', quoteResponse.data.meta.expiresAt);
    console.log();
    
    // Test 2: Get pool price
    console.log('2. Testing GET /api/v1/price/pool');
    const poolPriceResponse = await axios.get(`${API_BASE}/price/pool`, {
      params: {
        tokenA: TKNA,
        tokenB: TKNB,
        fee: 3000
      }
    });
    console.log('   ✅ Pool price info:');
    console.log('      Token A:', poolPriceResponse.data.data.tokenA);
    console.log('      Token B:', poolPriceResponse.data.data.tokenB);
    console.log('      Fee:', poolPriceResponse.data.data.fee);
    console.log('      Price:', poolPriceResponse.data.data.price);
    console.log('      Inverse Price:', poolPriceResponse.data.data.inversePrice);
    console.log('      Liquidity:', poolPriceResponse.data.data.liquidity);
    console.log('      Tick:', poolPriceResponse.data.data.tick);
    console.log();
    
    // Test 3: Test multiple amount quotes
    console.log('3. Testing price quotes for different amounts');
    const amounts = [
      '100000000000000000',    // 0.1 token
      '1000000000000000000',   // 1 token
      '10000000000000000000',  // 10 tokens
    ];
    
    for (const amount of amounts) {
      const response = await axios.post(`${API_BASE}/price/quote`, {
        tokenIn: TKNA,
        tokenOut: TKNB,
        amountIn: amount,
        fee: 3000
      });
      const amountInFormatted = (parseFloat(amount) / 1e18).toFixed(2);
      const amountOutFormatted = (parseFloat(response.data.data.amountOut) / 1e18).toFixed(6);
      console.log(`   ✅ ${amountInFormatted} TKNA → ${amountOutFormatted} TKNB (Impact: ${response.data.data.priceImpact}%)`);
    }
    console.log();
    
    // Test 4: Test different fee tiers
    console.log('4. Testing price for different fee tiers');
    const fees = [500, 3000, 10000];
    for (const fee of fees) {
      const response = await axios.get(`${API_BASE}/price/pool`, {
        params: {
          tokenA: TKNA,
          tokenB: TKNB,
          fee
        }
      });
      console.log(`   ✅ Fee ${fee/10000}%: Price = ${response.data.data.price}`);
    }
    console.log();
    
    // Test 5: Reverse direction
    console.log('5. Testing reverse direction quote');
    const reverseQuote = await axios.post(`${API_BASE}/price/quote`, {
      tokenIn: TKNB,
      tokenOut: TKNA,
      amountIn: '1000000000000000000',
      fee: 3000
    });
    console.log('   ✅ Reverse quote:');
    console.log('      1 TKNB →', (parseFloat(reverseQuote.data.data.amountOut) / 1e18).toFixed(6), 'TKNA');
    console.log('      Price:', reverseQuote.data.data.price);
    console.log();
    
    // Test 6: Invalid token address
    console.log('6. Testing POST /api/v1/price/quote with invalid address');
    try {
      await axios.post(`${API_BASE}/price/quote`, {
        tokenIn: 'invalid',
        tokenOut: TKNB,
        amountIn: '1000000000000000000',
        fee: 3000
      });
      console.log('   ❌ Should have failed validation\n');
      return false;
    } catch (error) {
      console.log('   ✅ Validation error caught:', error.response?.data?.message || error.message);
      console.log('   ✅ Status code:', error.response?.status);
      console.log();
    }
    
    // Test 7: Test rate limiting
    console.log('7. Testing rate limiting');
    let requestCount = 0;
    let rateLimited = false;
    
    for (let i = 0; i < 15; i++) {
      try {
        await axios.post(`${API_BASE}/price/quote`, quotePayload);
        requestCount++;
      } catch (error) {
        if (error.response?.status === 429) {
          rateLimited = true;
          console.log(`   ✅ Rate limited after ${requestCount} requests`);
          console.log('   ✅ Retry-After:', error.response.headers['retry-after']);
          break;
        }
      }
    }
    
    if (!rateLimited && requestCount >= 15) {
      console.log(`   ⚠️  No rate limiting detected after ${requestCount} requests`);
    }
    console.log();
    
    // Test 8: Test caching
    console.log('8. Testing cache performance');
    const start1 = Date.now();
    await axios.get(`${API_BASE}/price/pool`, {
      params: { tokenA: TKNA, tokenB: TKNB, fee: 3000 }
    });
    const time1 = Date.now() - start1;
    
    const start2 = Date.now();
    await axios.get(`${API_BASE}/price/pool`, {
      params: { tokenA: TKNA, tokenB: TKNB, fee: 3000 }
    });
    const time2 = Date.now() - start2;
    
    console.log('   ✅ First request:', time1, 'ms');
    console.log('   ✅ Cached request:', time2, 'ms');
    console.log('   ✅ Speed improvement:', Math.round((1 - time2/time1) * 100), '%');
    console.log();
    
    console.log('✅ All price route tests passed!\n');
    return true;
  } catch (error) {
    console.error('❌ Price route test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

if (require.main === module) {
  testPriceRoutes()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { testPriceRoutes };
