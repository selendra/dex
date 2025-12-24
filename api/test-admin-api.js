#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Base API URL
const API_URL = 'http://localhost:3000';

// Load test config
const configPath = path.join(__dirname, 'test-config.json');
if (!fs.existsSync(configPath)) {
  console.error('❌ Error: test-config.json not found. Please deploy contracts first.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null) {
  const url = `${API_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    return { status: response.status, data: result };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

// Helper to format output
function printSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

function printSuccess(message) {
  console.log('✓', message);
}

function printError(message) {
  console.log('✗', message);
}

function printInfo(label, value) {
  console.log(`  ${label}: ${value}`);
}

// Main test suite
async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║          DEX API Integration Test Suite                ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Health Check
  printSection('TEST 1: Health Check');
  try {
    const response = await apiRequest('GET', '/health');
    if (response.status === 200 && response.data.success) {
      printSuccess('API is healthy');
      printInfo('Pool Manager', response.data.data.contracts.poolManager);
      printInfo('Position Manager', response.data.data.contracts.positionManager);
      printInfo('Swap Router', response.data.data.contracts.swapRouter);
      testsPassed++;
    } else {
      printError('Health check failed');
      testsFailed++;
    }
  } catch (error) {
    printError(`Health check error: ${error.message}`);
    testsFailed++;
  }

  // Test 2: Initialize Pool
  printSection('TEST 2: Initialize Pool');
  try {
    const initData = {
      currency0: config.currency0,
      currency1: config.currency1,
      fee: 3000,
      sqrtPriceX96: "79228162514264337593543950336" // 1:1 price
    };

    const response = await apiRequest('POST', '/api/admin/initialize-pool', initData);
    
    if (response.status === 200 && response.data.success) {
      printSuccess('Pool initialized successfully');
      printInfo('Pool ID', response.data.data.poolId);
      printInfo('Transaction', response.data.data.transactionHash);
      printInfo('Gas Used', response.data.data.gasUsed);
      testsPassed++;
    } else if (response.data.error && response.data.error.message.includes('already initialized')) {
      printSuccess('Pool already initialized (expected)');
      testsPassed++;
    } else {
      printError('Pool initialization failed');
      console.log(response.data);
      testsFailed++;
    }
  } catch (error) {
    printError(`Pool initialization error: ${error.message}`);
    testsFailed++;
  }

  // Wait a bit for transaction to be mined
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Add Liquidity
  printSection('TEST 3: Add Liquidity');
  try {
    const liquidityData = {
      currency0: config.currency0,
      currency1: config.currency1,
      fee: 3000,
      amount0: "10000000000000000000", // 10 tokens
      amount1: "10000000000000000000", // 10 tokens
      tickLower: -887220,
      tickUpper: 887220,
      deadline: Math.floor(Date.now() / 1000) + 300
    };

    const response = await apiRequest('POST', '/api/admin/add-liquidity', liquidityData);
    
    if (response.status === 200 && response.data.success) {
      printSuccess('Liquidity added successfully');
      printInfo('Liquidity', response.data.data.quote.liquidity);
      printInfo('Transaction', response.data.data.transaction.transactionHash);
      printInfo('Gas Used', response.data.data.transaction.gasUsed);
      testsPassed++;
    } else {
      printError('Add liquidity failed');
      console.log(response.data);
      testsFailed++;
    }
  } catch (error) {
    printError(`Add liquidity error: ${error.message}`);
    testsFailed++;
  }

  // Wait for transaction to be mined
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 4: Get Pool Information
  printSection('TEST 4: Get Pool Information');
  try {
    const poolId = 'test'; // Pool ID is calculated from pool key
    const response = await apiRequest('GET', 
      `/api/pools/${poolId}?currency0=${config.currency0}&currency1=${config.currency1}&fee=3000`
    );
    
    if (response.status === 200 && response.data.success) {
      printSuccess('Pool information retrieved');
      printInfo('Token 0', `${response.data.data.token0.symbol} (${response.data.data.token0.address})`);
      printInfo('Token 1', `${response.data.data.token1.symbol} (${response.data.data.token1.address})`);
      printInfo('Price', response.data.data.price);
      printInfo('Liquidity', response.data.data.liquidity);
      testsPassed++;
    } else {
      printError('Get pool info failed');
      console.log(response.data);
      testsFailed++;
    }
  } catch (error) {
    printError(`Get pool info error: ${error.message}`);
    testsFailed++;
  }

  // Test 5: Get Swap Quote
  printSection('TEST 5: Get Swap Quote');
  try {
    const quoteData = {
      tokenIn: config.currency0,
      tokenOut: config.currency1,
      amountIn: "1000000000000000000", // 1 token
      fee: 3000
    };

    const response = await apiRequest('POST', '/api/swap/quote', quoteData);
    
    if (response.status === 200 && response.data.success) {
      printSuccess('Swap quote retrieved');
      printInfo('Amount In', (parseFloat(response.data.data.quote.amountIn) / 1e18).toFixed(4) + ' tokens');
      printInfo('Amount Out', (parseFloat(response.data.data.quote.amountOut) / 1e18).toFixed(4) + ' tokens');
      printInfo('Price', response.data.data.quote.price);
      printInfo('Price Impact', response.data.data.quote.priceImpact + '%');
      testsPassed++;
    } else {
      printError('Get swap quote failed');
      console.log(response.data);
      testsFailed++;
    }
  } catch (error) {
    printError(`Get swap quote error: ${error.message}`);
    testsFailed++;
  }

  // Test 6: Execute Test Swap with Balance Verification
  printSection('TEST 6: Execute Test Swap (with balance verification)');
  try {
    const swapData = {
      tokenIn: config.currency0,
      tokenOut: config.currency1,
      amountIn: "1000000000000000000", // 1 token
      fee: 3000,
      slippageTolerance: 1.0
    };

    const response = await apiRequest('POST', '/api/admin/test-swap', swapData);
    
    if (response.status === 200 && response.data.success) {
      printSuccess('Swap executed and verified successfully');
      printInfo('Token In', response.data.data.swap.tokenIn.symbol);
      printInfo('Token Out', response.data.data.swap.tokenOut.symbol);
      printInfo('Amount In', (parseFloat(response.data.data.swap.amountIn) / 1e18).toFixed(4));
      printInfo('Expected Out', (parseFloat(response.data.data.swap.expectedAmountOut) / 1e18).toFixed(4));
      printInfo('Actual Out', (parseFloat(response.data.data.swap.actualAmountOut) / 1e18).toFixed(4));
      printInfo('Transaction', response.data.data.transaction.transactionHash);
      
      console.log('\n  Balance Verification:');
      printInfo('  Swap Executed', response.data.data.verification.swapExecuted ? '✓' : '✗');
      printInfo('  Balance Changed', response.data.data.verification.balanceChanged ? '✓' : '✗');
      printInfo('  Expected vs Actual', response.data.data.verification.expectedVsActual.expected + ' vs ' + response.data.data.verification.expectedVsActual.actual);
      
      if (response.data.data.verification.swapExecuted && response.data.data.verification.balanceChanged) {
        testsPassed++;
      } else {
        printError('Swap verification failed - balances did not change as expected');
        testsFailed++;
      }
    } else {
      printError('Test swap failed');
      console.log(response.data);
      testsFailed++;
    }
  } catch (error) {
    printError(`Test swap error: ${error.message}`);
    testsFailed++;
  }

  // Test Summary
  printSection('TEST SUMMARY');
  console.log(`\nTotal Tests: ${testsPassed + testsFailed}`);
  console.log(`Passed: ${testsPassed} ✓`);
  console.log(`Failed: ${testsFailed} ✗`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed successfully!\n');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Please check the output above.\n');
    process.exit(1);
  }
}

// Check if API server is running
async function checkServer() {
  try {
    const response = await apiRequest('GET', '/health');
    if (response.status === 200) {
      return true;
    }
  } catch (error) {
    return false;
  }
  return false;
}

// Main execution
async function main() {
  console.log('Checking if API server is running...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.error('\n❌ Error: API server is not running.');
    console.error('Please start the server first:');
    console.error('  cd api && npm start\n');
    process.exit(1);
  }

  await runTests();
}

main().catch(console.error);
