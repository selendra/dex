/**
 * Advanced SDK Usage Example - Swap Execution
 *
 * Run with: npx ts-node examples/swap-example.ts
 */

import 'dotenv/config';
import { createSDK } from '../src';

async function main() {
  console.log('🔄 DEX SDK Swap Example\n');

  // Create and initialize SDK
  const sdk = createSDK({});
  await sdk.initialize();

  // Token addresses
  const TUSD = process.env.SELENDRA_TUSD_ADDRESS!;
  const TBROWN = process.env.SELENDRA_TBROWN_ADDRESS!;

  // Create wallet
  const wallet = sdk.createWallet(process.env.PRIVATE_KEY!);
  console.log('👤 Wallet:', wallet.address);

  // Check balances before
  console.log('\n📊 Balances Before:');
  const tusdBefore = await sdk.token.getBalance(TUSD, wallet.address);
  const tbrownBefore = await sdk.token.getBalance(TBROWN, wallet.address);
  console.log(`  TUSD: ${tusdBefore}`);
  console.log(`  TBROWN: ${tbrownBefore}`);

  // Get swap quote
  const amountIn = '10';
  console.log(`\n💱 Getting quote for ${amountIn} TUSD -> TBROWN...`);
  
  const quote = await sdk.swap.getQuote(TUSD, TBROWN, amountIn);
  console.log(`  Expected output: ${quote.estimatedAmountOut} TBROWN`);
  console.log(`  Price: ${quote.price}`);
  console.log(`  Price impact: ${quote.priceImpact}`);

  // Calculate minimum output with 1% slippage
  const minOutput = parseFloat(quote.estimatedAmountOut) * 0.99;
  console.log(`  Min output (1% slippage): ${minOutput.toFixed(18)}`);

  // Execute swap
  console.log('\n🔄 Executing swap...');
  try {
    const result = await sdk.swap.swap(
      wallet,
      TUSD,
      TBROWN,
      amountIn,
      minOutput
    );

    console.log('\n✅ Swap successful!');
    console.log(`  TX Hash: ${result.txHash}`);
    console.log(`  Amount In: ${result.amountIn}`);
    console.log(`  Amount Out: ${result.amountOut}`);
    console.log(`  Gas Used: ${result.gasUsed}`);

    // Check balances after
    console.log('\n📊 Balances After:');
    const tusdAfter = await sdk.token.getBalance(TUSD, wallet.address);
    const tbrownAfter = await sdk.token.getBalance(TBROWN, wallet.address);
    console.log(`  TUSD: ${tusdAfter} (${parseFloat(tusdAfter) - parseFloat(tusdBefore)} change)`);
    console.log(`  TBROWN: ${tbrownAfter} (+${parseFloat(tbrownAfter) - parseFloat(tbrownBefore)} received)`);

  } catch (e: any) {
    console.log('\n❌ Swap failed:', e.message);
  }
}

main().catch(console.error);
