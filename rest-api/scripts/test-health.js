const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

async function testHealthRoutes() {
  console.log('🏥 Testing Health Routes...\n');
  
  try {
    // Test 1: Basic health check
    console.log('1. Testing GET /health');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('   ✅ Status:', healthResponse.data.status);
    console.log('   ✅ Timestamp:', healthResponse.data.timestamp);
    console.log('   ✅ Uptime:', healthResponse.data.uptime, 'seconds\n');
    
    // Test 2: Detailed health check
    console.log('2. Testing GET /health/detailed');
    const detailedResponse = await axios.get(`${BASE_URL}/health/detailed`);
    console.log('   ✅ Status:', detailedResponse.data.status);
    console.log('   ✅ Services:', JSON.stringify(detailedResponse.data.services, null, 2));
    console.log('   ✅ Memory:', JSON.stringify(detailedResponse.data.memory, null, 2));
    console.log('   ✅ Network:', detailedResponse.data.network, '\n');
    
    // Test 3: Ready check
    console.log('3. Testing GET /health/ready');
    const readyResponse = await axios.get(`${BASE_URL}/health/ready`);
    console.log('   ✅ Ready:', readyResponse.data.ready);
    console.log('   ✅ Message:', readyResponse.data.message, '\n');
    
    console.log('✅ All health route tests passed!\n');
    return true;
  } catch (error) {
    console.error('❌ Health route test failed:', error.response?.data || error.message);
    return false;
  }
}

if (require.main === module) {
  testHealthRoutes()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { testHealthRoutes };
