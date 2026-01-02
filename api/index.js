const blockchainService = require('./services/blockchain');

async function startServer() {
  try {
    console.log('🚀 Starting DEX API Server...\n');
    
    // Initialize blockchain service first
    console.log('📡 Connecting to blockchain...');
    await blockchainService.initialize();
    
    console.log('\n✅ Blockchain service ready\n');
    
    // Start Express server
    require('./server');
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
