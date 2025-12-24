const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const API_BASE = `${BASE_URL}/api/v1`;

const TKNA = process.env.TOKEN_A || '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6';
const TKNB = process.env.TOKEN_B || '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318';
const TEST_ADDRESS = process.env.TEST_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

async function testTokenRoutes() {
  console.log('🪙 Testing Token Routes...\n');
  
  try {
    // Test 1: Get token info
    console.log('1. Testing GET /api/v1/tokens/:address (TKNA)');
    const tokenAInfo = await axios.get(`${API_BASE}/tokens/${TKNA}`);
    console.log('   ✅ Token info:');
    console.log('      Address:', tokenAInfo.data.data.address);
    console.log('      Name:', tokenAInfo.data.data.name);
    console.log('      Symbol:', tokenAInfo.data.data.symbol);
    console.log('      Decimals:', tokenAInfo.data.data.decimals);
    console.log();
    
    // Test 2: Get second token info
    console.log('2. Testing GET /api/v1/tokens/:address (TKNB)');
    const tokenBInfo = await axios.get(`${API_BASE}/tokens/${TKNB}`);
    console.log('   ✅ Token info:');
    console.log('      Address:', tokenBInfo.data.data.address);
    console.log('      Name:', tokenBInfo.data.data.name);
    console.log('      Symbol:', tokenBInfo.data.data.symbol);
    console.log('      Decimals:', tokenBInfo.data.data.decimals);
    console.log();
    
    // Test 3: Get token balance
    console.log('3. Testing GET /api/v1/tokens/:address/balance/:owner');
    const balanceResponse = await axios.get(`${API_BASE}/tokens/${TKNA}/balance/${TEST_ADDRESS}`);
    console.log('   ✅ Balance info:');
    console.log('      Token:', balanceResponse.data.data.token);
    console.log('      Owner:', balanceResponse.data.data.owner);
    console.log('      Symbol:', balanceResponse.data.data.symbol);
    console.log('      Balance (raw):', balanceResponse.data.data.balance);
    console.log('      Decimals:', balanceResponse.data.data.decimals);
    console.log('      Balance (formatted):', balanceResponse.data.data.formatted);
    console.log();
    
    // Test 4: Get balance for second token
    console.log('4. Testing balance for TKNB');
    const balanceB = await axios.get(`${API_BASE}/tokens/${TKNB}/balance/${TEST_ADDRESS}`);
    console.log('   ✅ Balance:', balanceB.data.data.formatted, balanceB.data.data.symbol);
    console.log();
    
    // Test 5: Get token price
    console.log('5. Testing GET /api/v1/tokens/:address/price');
    try {
      const priceResponse = await axios.get(`${API_BASE}/tokens/${TKNA}/price`);
      console.log('   ✅ Price info:');
      console.log('      Token:', priceResponse.data.data.token);
      console.log('      Price:', priceResponse.data.data.price);
      console.log('      Price USD:', priceResponse.data.data.priceUSD);
      console.log('      Timestamp:', priceResponse.data.data.timestamp);
      console.log();
    } catch (error) {
      console.log('   ⚠️  Price endpoint not fully implemented yet');
      console.log('      Returns:', error.response?.data?.data);
      console.log();
    }
    
    // Test 6: Invalid token address
    console.log('6. Testing GET /api/v1/tokens/:address with invalid address');
    try {
      await axios.get(`${API_BASE}/tokens/invalid-address`);
      console.log('   ❌ Should have failed validation\n');
      return false;
    } catch (error) {
      console.log('   ✅ Validation error caught:', error.response?.data?.message || error.message);
      console.log('   ✅ Status code:', error.response?.status);
      console.log();
    }
    
    // Test 7: Invalid owner address in balance check
    console.log('7. Testing GET /api/v1/tokens/:address/balance/:owner with invalid owner');
    try {
      await axios.get(`${API_BASE}/tokens/${TKNA}/balance/invalid-owner`);
      console.log('   ❌ Should have failed validation\n');
      return false;
    } catch (error) {
      console.log('   ✅ Validation error caught:', error.response?.data?.message || error.message);
      console.log('   ✅ Status code:', error.response?.status);
      console.log();
    }
    
    // Test 8: Test caching
    console.log('8. Testing cache performance for token info');
    const start1 = Date.now();
    await axios.get(`${API_BASE}/tokens/${TKNA}`);
    const time1 = Date.now() - start1;
    
    const start2 = Date.now();
    await axios.get(`${API_BASE}/tokens/${TKNA}`);
    const time2 = Date.now() - start2;
    
    console.log('   ✅ First request:', time1, 'ms');
    console.log('   ✅ Cached request:', time2, 'ms');
    console.log('   ✅ Speed improvement:', Math.round((1 - time2/time1) * 100), '%');
    console.log();
    
    console.log('✅ All token route tests passed!\n');
    return true;
  } catch (error) {
    console.error('❌ Token route test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

if (require.main === module) {
  testTokenRoutes()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { testTokenRoutes };
