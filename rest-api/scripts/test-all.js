#!/usr/bin/env node

/**
 * Master test runner for all API routes
 * Runs comprehensive tests on all endpoints
 */

const { testHealthRoutes } = require('./test-health');
const { testSwapRoutes } = require('./test-swap');
const { testPoolRoutes } = require('./test-pool');
const { testTokenRoutes } = require('./test-token');
const { testPriceRoutes } = require('./test-price');
const { testLiquidityRoutes } = require('./test-liquidity');

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function printBanner() {
  console.log(`
${colors.cyan}╔════════════════════════════════════════════════╗
║                                                ║
║       DEX REST API - Test Suite Runner        ║
║                                                ║
╚════════════════════════════════════════════════╝${colors.reset}

Testing API at: ${colors.bright}${BASE_URL}${colors.reset}
Started at: ${new Date().toISOString()}

`);
}

function printSeparator() {
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

async function runTest(name, testFn) {
  console.log(`${colors.bright}${colors.cyan}Running: ${name}${colors.reset}`);
  printSeparator();
  
  const startTime = Date.now();
  
  try {
    const success = await testFn();
    const duration = Date.now() - startTime;
    
    if (success) {
      console.log(`${colors.green}✅ ${name} - PASSED${colors.reset} (${duration}ms)\n`);
      return { name, success: true, duration };
    } else {
      console.log(`${colors.red}❌ ${name} - FAILED${colors.reset} (${duration}ms)\n`);
      return { name, success: false, duration };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`${colors.red}❌ ${name} - ERROR: ${error.message}${colors.reset} (${duration}ms)\n`);
    return { name, success: false, duration, error: error.message };
  }
}

async function runAllTests() {
  printBanner();
  
  const tests = [
    { name: 'Health Routes', fn: testHealthRoutes },
    { name: 'Swap Routes', fn: testSwapRoutes },
    { name: 'Pool Routes', fn: testPoolRoutes },
    { name: 'Token Routes', fn: testTokenRoutes },
    { name: 'Price Routes', fn: testPriceRoutes },
    { name: 'Liquidity Routes', fn: testLiquidityRoutes },
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await runTest(test.name, test.fn);
    results.push(result);
    printSeparator();
  }
  
  // Print summary
  console.log(`${colors.bright}${colors.cyan}
╔════════════════════════════════════════════════╗
║              TEST SUITE SUMMARY                ║
╚════════════════════════════════════════════════╝${colors.reset}
`);
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    const color = result.success ? colors.green : colors.red;
    console.log(`${color}${icon} ${result.name.padEnd(30)} ${result.duration}ms${colors.reset}`);
  });
  
  console.log(`
${colors.blue}${'='.repeat(60)}${colors.reset}
${colors.bright}Total Tests:${colors.reset}     ${total}
${colors.green}Passed:${colors.reset}          ${passed}
${colors.red}Failed:${colors.reset}          ${failed}
${colors.bright}Total Duration:${colors.reset}  ${totalDuration}ms
${colors.blue}${'='.repeat(60)}${colors.reset}
`);
  
  if (failed === 0) {
    console.log(`${colors.green}${colors.bright}🎉 All tests passed! API is working correctly.${colors.reset}\n`);
    return 0;
  } else {
    console.log(`${colors.red}${colors.bright}⚠️  ${failed} test suite(s) failed. Check logs above for details.${colors.reset}\n`);
    return 1;
  }
}

// Check if server is running
async function checkServer() {
  const axios = require('axios');
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Cannot connect to API server at ${BASE_URL}${colors.reset}`);
    console.error(`${colors.yellow}Please ensure the server is running:${colors.reset}`);
    console.error(`   cd rest-api && npm start\n`);
    return false;
  }
}

// Main execution
(async () => {
  try {
    // Check if server is running
    const serverRunning = await checkServer();
    if (!serverRunning) {
      process.exit(1);
    }
    
    // Run all tests
    const exitCode = await runAllTests();
    process.exit(exitCode);
  } catch (error) {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  }
})();
