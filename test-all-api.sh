#!/bin/bash

# Comprehensive API Test Script - Fixed JSON escaping
# Run from project root: bash test-all-api.sh

cd /root/project/dex/api-v2

# Get addresses from .env
export TOKENA=$(grep TOKENA_ADDRESS .env | cut -d= -f2 | tr -d '"' | tr -d '\r')
export TOKENB=$(grep TOKENB_ADDRESS .env | cut -d= -f2 | tr -d '"' | tr -d '\r')
export SWAP_ROUTER=$(grep SWAP_ROUTER_ADDRESS .env | cut -d= -f2 | tr -d '"' | tr -d '\r')
export LIQUIDITY_ROUTER=$(grep LIQUIDITY_ROUTER_ADDRESS .env | cut -d= -f2 | tr -d '"' | tr -d '\r')
export OWNER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       COMPREHENSIVE API TEST - FROM SCRATCH                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📍 Using Contract Addresses:"
echo "   TOKENA: $TOKENA"
echo "   TOKENB: $TOKENB"
echo "   SwapRouter: $SWAP_ROUTER"
echo "   LiquidityRouter: $LIQUIDITY_ROUTER"
echo ""

# Test 1: Health
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESULT=$(curl -s http://localhost:3000/health)
echo "$RESULT" | jq .
if echo "$RESULT" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "✅ PASSED"
else
  echo "❌ FAILED"
fi
sleep 1

# Test 2: Token Info
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Get Token Info (TOKENA)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESULT=$(curl -s "http://localhost:3000/tokens/$TOKENA")
echo "$RESULT" | jq .
if echo "$RESULT" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "✅ PASSED"
else
  echo "❌ FAILED"
fi
sleep 1

# Test 3: Token Balance
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: Token Balance"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESULT=$(curl -s "http://localhost:3000/tokens/$TOKENA/balance/$OWNER")
echo "$RESULT" | jq .
if echo "$RESULT" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "✅ PASSED"
else
  echo "❌ FAILED"
fi
sleep 1

# Test 4: Encode Pool Key
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 4: Encode Pool Key"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESULT=$(curl -s -X POST http://localhost:3000/utils/encode-pool-key \
  -H "Content-Type: application/json" \
  -d '{"token0":"'"$TOKENA"'","token1":"'"$TOKENB"'","fee":3000}')
echo "$RESULT" | jq .
if echo "$RESULT" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "✅ PASSED"
else
  echo "❌ FAILED"
fi
sleep 1

# Test 5: Calculate Pool ID
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 5: Calculate Pool ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESULT=$(curl -s -X POST http://localhost:3000/utils/calculate-pool-id \
  -H "Content-Type: application/json" \
  -d '{"currency0":"'"$TOKENA"'","currency1":"'"$TOKENB"'","fee":3000,"tickSpacing":60,"hooks":"0x0000000000000000000000000000000000000000"}')
echo "$RESULT" | jq .
if echo "$RESULT" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "✅ PASSED"
else
  echo "❌ FAILED"
fi
sleep 1

# Test 6-9: Approvals
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 6: Approve TOKENA for SwapRouter"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESULT=$(curl -s -X POST http://localhost:3000/tokens/approve \
  -H "Content-Type: application/json" \
  -d '{"tokenAddress":"'"$TOKENA"'","spenderAddress":"'"$SWAP_ROUTER"'","amount":"max"}')
echo "$RESULT" | jq .
if echo "$RESULT" | jq -e '.success == true' > /dev/null 2>&1; then
  TX=$(echo "$RESULT" | jq -r '.data.txHash')
  echo "✅ PASSED (tx: $TX)"
else
  echo "❌ FAILED"
fi
sleep 2

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 7: Approve TOKENB for SwapRouter"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESULT=$(curl -s -X POST http://localhost:3000/tokens/approve \
  -H "Content-Type: application/json" \
  -d '{"tokenAddress":"'"$TOKENB"'","spenderAddress":"'"$SWAP_ROUTER"'","amount":"max"}')
echo "$RESULT" | jq .
if echo "$RESULT" | jq -e '.success == true' > /dev/null 2>&1; then
  TX=$(echo "$RESULT" | jq -r '.data.txHash')
  echo "✅ PASSED (tx: $TX)"
else
  echo "❌ FAILED"
fi
sleep 2

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 8: Approve TOKENA for LiquidityRouter"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESULT=$(curl -s -X POST http://localhost:3000/tokens/approve \
  -H "Content-Type: application/json" \
  -d '{"tokenAddress":"'"$TOKENA"'","spenderAddress":"'"$LIQUIDITY_ROUTER"'","amount":"max"}')
echo "$RESULT" | jq .
if echo "$RESULT" | jq -e '.success == true' > /dev/null 2>&1; then
  TX=$(echo "$RESULT" | jq -r '.data.txHash')
  echo "✅ PASSED (tx: $TX)"
else
  echo "❌ FAILED"
fi
sleep 2

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 9: Approve TOKENB for LiquidityRouter"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESULT=$(curl -s -X POST http://localhost:3000/tokens/approve \
  -H "Content-Type: application/json" \
  -d '{"tokenAddress":"'"$TOKENB"'","spenderAddress":"'"$LIQUIDITY_ROUTER"'","amount":"max"}')
echo "$RESULT" | jq .
if echo "$RESULT" | jq -e '.success == true' > /dev/null 2>&1; then
  TX=$(echo "$RESULT" | jq -r '.data.txHash')
  echo "✅ PASSED (tx: $TX)"
else
  echo "❌ FAILED"
fi
sleep 2

# Test 10: Add Liquidity ⭐
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 10: Add Liquidity ⭐ CRITICAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESULT=$(curl -s -X POST http://localhost:3000/liquidity/add \
  -H "Content-Type: application/json" \
  -d '{"token0":"'"$TOKENA"'","token1":"'"$TOKENB"'","fee":3000,"tickLower":-887220,"tickUpper":887220,"liquidityDelta":"3000000000000000000"}')
echo "$RESULT" | jq .
if echo "$RESULT" | jq -e '.success == true' > /dev/null 2>&1; then
  TX=$(echo "$RESULT" | jq -r '.data.txHash')
  GAS=$(echo "$RESULT" | jq -r '.data.gasUsed')
  echo "✅ PASSED (tx: $TX, gas: $GAS)"
else
  echo "❌ FAILED"
fi
sleep 2

# Test 11: Forward Swap ⭐
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 11: Execute Swap (Forward) ⭐ CRITICAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESULT=$(curl -s -X POST http://localhost:3000/swaps/execute \
  -H "Content-Type: application/json" \
  -d '{"token0":"'"$TOKENA"'","token1":"'"$TOKENB"'","fee":3000,"zeroForOne":true,"amountSpecified":"1000000000000000000"}')
echo "$RESULT" | jq .
if echo "$RESULT" | jq -e '.success == true' > /dev/null 2>&1; then
  TX=$(echo "$RESULT" | jq -r '.data.txHash')
  GAS=$(echo "$RESULT" | jq -r '.data.gasUsed')
  echo "✅ PASSED (tx: $TX, gas: $GAS)"
else
  echo "❌ FAILED"
fi
sleep 2

# Test 12: Reverse Swap ⭐
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 12: Execute Swap (Reverse) ⭐ CRITICAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESULT=$(curl -s -X POST http://localhost:3000/swaps/execute \
  -H "Content-Type: application/json" \
  -d '{"token0":"'"$TOKENA"'","token1":"'"$TOKENB"'","fee":3000,"zeroForOne":false,"amountSpecified":"500000000000000000"}')
echo "$RESULT" | jq .
if echo "$RESULT" | jq -e '.success == true' > /dev/null 2>&1; then
  TX=$(echo "$RESULT" | jq -r '.data.txHash')
  GAS=$(echo "$RESULT" | jq -r '.data.gasUsed')
  echo "✅ PASSED (tx: $TX, gas: $GAS)"
else
  echo "❌ FAILED"
fi
sleep 2

# Test 13: Remove Liquidity ⭐
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 13: Remove Liquidity ⭐ CRITICAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESULT=$(curl -s -X POST http://localhost:3000/liquidity/remove \
  -H "Content-Type: application/json" \
  -d '{"token0":"'"$TOKENA"'","token1":"'"$TOKENB"'","fee":3000,"tickLower":-887220,"tickUpper":887220,"liquidityDelta":"1500000000000000000"}')
echo "$RESULT" | jq .
if echo "$RESULT" | jq -e '.success == true' > /dev/null 2>&1; then
  TX=$(echo "$RESULT" | jq -r '.data.txHash')
  GAS=$(echo "$RESULT" | jq -r '.data.gasUsed')
  echo "✅ PASSED (tx: $TX, gas: $GAS)"
else
  echo "❌ FAILED"
fi
sleep 2

# Test 14: Final Balances
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 14: Final Token Balances"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TOKENA:"
curl -s "http://localhost:3000/tokens/$TOKENA/balance/$OWNER" | jq .
echo ""
echo "TOKENB:"
curl -s "http://localhost:3000/tokens/$TOKENB/balance/$OWNER" | jq .

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              ALL TESTS COMPLETED                             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
