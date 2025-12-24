const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const API_BASE = `${BASE_URL}/api/v1`;

const TKNA = process.env.TOKEN_A || '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6';
const TKNB = process.env.TOKEN_B || '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318';

async function testPoolRoutes() {
  console.log('🏊 Testing Pool Routes...\n');
  
  try {
    // Test 1: List all pools
    console.log('1. Testing GET /api/v1/pools');
    const listResponse = await axios.get(`${API_BASE}/pools`);
    console.log('   ✅ Status:', listResponse.data.success);
    console.log('   ✅ Pools:', listResponse.data.data.pools.length);
    console.log('   ✅ Pagination:', JSON.stringify(listResponse.data.data.pagination));
    console.log();
    
    // Test 2: List with pagination
    console.log('2. Testing GET /api/v1/pools with pagination');
    const paginatedResponse = await axios.get(`${API_BASE}/pools`, {
      params: {
        page: 1,
        limit: 10,
        sortBy: 'liquidity',
        order: 'desc'
      }
    });
    console.log('   ✅ Page:', paginatedResponse.data.data.pagination.page);
    console.log('   ✅ Limit:', paginatedResponse.data.data.pagination.limit);
    console.log();
    
    // Test 3: Search for specific pool
    console.log('3. Testing GET /api/v1/pools/search');
    const searchResponse = await axios.get(`${API_BASE}/pools/search`, {
      params: {
        tokenA: TKNA,
        tokenB: TKNB,
        fee: 3000
      }
    });
    console.log('   ✅ Pool found:');
    console.log('      Pool ID:', searchResponse.data.data.poolId);
    console.log('      Token A:', searchResponse.data.data.tokenA);
    console.log('      Token B:', searchResponse.data.data.tokenB);
    console.log('      Fee:', searchResponse.data.data.fee);
    console.log('      Liquidity:', searchResponse.data.data.liquidity);
    console.log('      Current Price:', searchResponse.data.data.price);
    console.log('      Token0 Price:', searchResponse.data.data.token0Price);
    console.log('      Token1 Price:', searchResponse.data.data.token1Price);
    console.log('      Tick:', searchResponse.data.data.tick);
    console.log();
    
    // Test 4: Get pool by ID
    console.log('4. Testing GET /api/v1/pools/:poolId');
    const poolId = searchResponse.data.data.poolId;
    const poolResponse = await axios.get(`${API_BASE}/pools/${poolId}`);
    console.log('   ✅ Pool details:');
    console.log('      Pool ID:', poolResponse.data.data.poolId);
    console.log('      SqrtPriceX96:', poolResponse.data.data.sqrtPriceX96);
    console.log('      Tick:', poolResponse.data.data.tick);
    console.log('      Liquidity:', poolResponse.data.data.liquidity);
    console.log('      Protocol Fee:', poolResponse.data.data.protocolFee);
    console.log('      LP Fee:', poolResponse.data.data.lpFee);
    console.log();
    
    // Test 5: Invalid pool search
    console.log('5. Testing GET /api/v1/pools/search with invalid params');
    try {
      await axios.get(`${API_BASE}/pools/search`, {
        params: {
          tokenA: 'invalid',
          tokenB: TKNB,
          fee: 3000
        }
      });
      console.log('   ❌ Should have failed validation\n');
      return false;
    } catch (error) {
      console.log('   ✅ Validation error caught:', error.response?.data?.message || error.message);
      console.log('   ✅ Status code:', error.response?.status);
      console.log();
    }
    
    // Test 6: Test caching
    console.log('6. Testing cache performance');
    const start1 = Date.now();
    await axios.get(`${API_BASE}/pools/search`, {
      params: { tokenA: TKNA, tokenB: TKNB, fee: 3000 }
    });
    const time1 = Date.now() - start1;
    
    const start2 = Date.now();
    await axios.get(`${API_BASE}/pools/search`, {
      params: { tokenA: TKNA, tokenB: TKNB, fee: 3000 }
    });
    const time2 = Date.now() - start2;
    
    console.log('   ✅ First request:', time1, 'ms');
    console.log('   ✅ Cached request:', time2, 'ms');
    console.log('   ✅ Speed improvement:', Math.round((1 - time2/time1) * 100), '%');
    console.log();
    
    console.log('✅ All pool route tests passed!\n');
    return true;
  } catch (error) {
    console.error('❌ Pool route test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

if (require.main === module) {
  testPoolRoutes()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { testPoolRoutes };
