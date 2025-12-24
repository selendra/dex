#!/bin/bash

echo "╔════════════════════════════════════════════════════════╗"
echo "║     DEX REST API - Deployment & Setup Script          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the api directory."
    exit 1
fi

echo "Step 1: Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_status "Node.js is installed: $NODE_VERSION"
else
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo ""
echo "Step 2: Installing dependencies..."
if npm install; then
    print_status "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

echo ""
echo "Step 3: Checking environment configuration..."
if [ -f ".env" ]; then
    print_status ".env file exists"
    
    # Display contract addresses
    echo ""
    echo "Contract Addresses:"
    echo "-------------------"
    grep "POOL_MANAGER_ADDRESS" .env
    grep "POSITION_MANAGER_ADDRESS" .env
    grep "SWAP_ROUTER_ADDRESS" .env
    grep "STATE_VIEW_ADDRESS" .env
else
    print_warning ".env file not found. Please create one from .env.example"
fi

echo ""
echo "Step 4: Starting API server..."
print_status "Server will start on port ${PORT:-3000}"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
npm start
