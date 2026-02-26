/**
 * Basic SDK Usage Example
 *
 * Run with: npx ts-node examples/basic-usage.ts
 */

import 'dotenv/config';
import { createSDK } from '../src';

async function main() {
  console.log('🚀 DEX SDK Basic Usage Example\n');

  // Create SDK instance (reads from environment variables)
  const sdk = createSDK({});

  // Initialize SDK
  await sdk.initialize();
  console.log('✅ SDK initialized');
  console.log('Contract addresses:', sdk.getContractAddresses());
  console.log();

  // Token addresses from environment
  const TUSD = process.env.SELENDRA_TUSD_ADDRESS!;
  const TBROWN = process.env.SELENDRA_TBROWN_ADDRESS!;
  const TSMART = process.env.SELENDRA_TSMART_ADDRESS!;
  const TZANDO = process.env.SELENDRA_TZANDO_ADDRESS!;

  // Create wallet from private key
  const wallet = sdk.createWallet(process.env.PRIVATE_KEY!);
  console.log('👤 Wallet address:', wallet.address);
  console.log();

  // Get native balance
  const nativeBalance = await sdk.getNativeBalance(wallet.address);
  console.log('💰 Native balance:', nativeBalance, 'SEL');
  console.log();

  // Get token info
  console.log('📊 Token Info:');
  const tokens = [TUSD, TBROWN, TSMART, TZANDO];
  for (const token of tokens) {
    try {
      const info = await sdk.token.getInfo(token);
      const balance = await sdk.token.getBalance(token, wallet.address);
      console.log(`  ${info.symbol}: ${balance} (${info.name})`);
    } catch (e: any) {
      console.log(`  ${token}: Error - ${e.message}`);
    }
  }
  console.log();

  // Get pool info
  console.log('🏊 Pool Info:');
  try {
    const pool = await sdk.pool.getInfo(TUSD, TBROWN);
    console.log(`  TUSD/TBROWN Pool:`);
    console.log(`    Pool ID: ${pool.poolId.slice(0, 10)}...`);
    console.log(`    Price: ${pool.price}`);
    console.log(`    Liquidity: ${pool.liquidity}`);
    console.log(`    Tick: ${pool.tick}`);
  } catch (e: any) {
    console.log(`  Error getting pool info: ${e.message}`);
  }
  console.log();

  // Get swap quote
  console.log('💱 Swap Quote:');
  try {
    const quote = await sdk.swap.getQuote(TUSD, TBROWN, '100');
    console.log(`  Swap 100 TUSD -> TBROWN:`);
    console.log(`    Expected output: ${quote.estimatedAmountOut}`);
    console.log(`    Price: ${quote.price}`);
    console.log(`    Price impact: ${quote.priceImpact}`);
    console.log(`    Fee: ${quote.fee}`);
  } catch (e: any) {
    console.log(`  Error getting quote: ${e.message}`);
  }
  console.log();

  // Get position info
  console.log('📈 LP Position Info:');
  try {
    const position = await sdk.liquidity.getPositionInfo(TUSD, TBROWN);
    console.log(`  TUSD/TBROWN Position:`);
    console.log(`    Liquidity: ${position.liquidityFormatted}`);
    console.log(`    Fees owed (token0): ${position.fees0OwedFormatted}`);
    console.log(`    Fees owed (token1): ${position.fees1OwedFormatted}`);
  } catch (e: any) {
    console.log(`  Error getting position: ${e.message}`);
  }
  console.log();

  console.log('✨ Example completed!');
}

main().catch(console.error);
