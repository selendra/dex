#!/bin/bash

# DEX API Phase 1 - Quick Test Script

API_URL="http://localhost:3000"

echo "=========================================="
echo "DEX API Phase 1 - Testing All Endpoints"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${BLUE}1. Health Check${NC}"
echo "GET $API_URL/health"
curl -s $API_URL/health | python3 -m json.tool
echo ""
echo ""

# Test 2: Get Token Info (TOKENS)
echo -e "${BLUE}2. Get Token Info (TOKENS)${NC}"
echo "GET $API_URL/tokens/0xa513E6E4b8f2a923D98304ec87F64353C4D5C853"
curl -s $API_URL/tokens/0xa513E6E4b8f2a923D98304ec87F64353C4D5C853 | python3 -m json.tool
echo ""
echo ""

# Test 3: Get Token Info (TOKENC)
echo -e "${BLUE}3. Get Token Info (TOKENC)${NC}"
echo "GET $API_URL/tokens/0x610178dA211FEF7D417bC0e6FeD39F05609AD788"
curl -s $API_URL/tokens/0x610178dA211FEF7D417bC0e6FeD39F05609AD788 | python3 -m json.tool
echo ""
echo ""

# Test 4: Get Token Balance
echo -e "${BLUE}4. Get Token Balance${NC}"
OWNER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo "GET $API_URL/tokens/0xa513E6E4b8f2a923D98304ec87F64353C4D5C853/balance/$OWNER"
curl -s "$API_URL/tokens/0xa513E6E4b8f2a923D98304ec87F64353C4D5C853/balance/$OWNER" | python3 -m json.tool
echo ""
echo ""

# Test 5: Encode PoolKey
echo -e "${BLUE}5. Encode PoolKey (TOKENC/TOKENS)${NC}"
echo "POST $API_URL/utils/encode-poolkey"
curl -s -X POST $API_URL/utils/encode-poolkey \
  -H "Content-Type: application/json" \
  -d '{
    "token0": "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
    "token1": "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
    "fee": 3000
  }' | python3 -m json.tool
echo ""
echo ""

# Test 6: Price to SqrtPriceX96 (1:1 ratio)
echo -e "${BLUE}6. Convert Price to SqrtPriceX96 (price=1.0)${NC}"
echo "POST $API_URL/utils/price-to-sqrt"
curl -s -X POST $API_URL/utils/price-to-sqrt \
  -H "Content-Type: application/json" \
  -d '{ "price": 1.0 }' | python3 -m json.tool
echo ""
echo ""

# Test 7: SqrtPriceX96 to Price
echo -e "${BLUE}7. Convert SqrtPriceX96 to Price${NC}"
echo "POST $API_URL/utils/sqrt-to-price"
curl -s -X POST $API_URL/utils/sqrt-to-price \
  -H "Content-Type: application/json" \
  -d '{ "sqrtPriceX96": "79228162514264337593543950336" }' | python3 -m json.tool
echo ""
echo ""

# Test 8: Get Pool Info (TOKENC/TOKENS pool)
echo -e "${BLUE}8. Get Pool Info (TOKENC/TOKENS)${NC}"
POOL_ID="0xf7e7d3ebef3c8f77e2437fec76d8e5cc1bbf5f4077c79eef7b97dde15cad1c34"
echo "GET $API_URL/pools/$POOL_ID"
curl -s "$API_URL/pools/$POOL_ID" | python3 -m json.tool
echo ""
echo ""

# Test 9: Get Pool Price
echo -e "${BLUE}9. Get Pool Price${NC}"
echo "GET $API_URL/pools/$POOL_ID/price"
curl -s "$API_URL/pools/$POOL_ID/price" | python3 -m json.tool
echo ""
echo ""

echo -e "${GREEN}=========================================="
echo "All Phase 1 Endpoints Tested!"
echo "==========================================${NC}"
