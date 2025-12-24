#!/bin/bash

# Quick setup and test script for REST API

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   REST API - Setup and Test Script            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found${NC}"
    echo -e "${YELLOW}Please run this script from the rest-api directory${NC}"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo -e "${GREEN}Creating .env from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env with your configuration${NC}"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${GREEN}📦 Installing dependencies...${NC}"
    npm install
fi

# Check if server is already running
if curl -s http://localhost:4000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is already running${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠️  Server is not running${NC}"
    echo -e "${BLUE}Starting server in background...${NC}"
    npm start > logs/server.log 2>&1 &
    SERVER_PID=$!
    echo -e "${GREEN}Server PID: $SERVER_PID${NC}"
    
    # Wait for server to start
    echo -e "${BLUE}Waiting for server to be ready...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:4000/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Server is ready!${NC}"
            echo ""
            break
        fi
        sleep 1
        echo -n "."
    done
    echo ""
fi

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Run tests
echo -e "${BLUE}🧪 Running API tests...${NC}"
echo ""

npm test

TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✅ All tests passed successfully!            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
else
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║   ❌ Some tests failed                         ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════╝${NC}"
fi

exit $TEST_EXIT_CODE
