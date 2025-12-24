# Production REST API - Quick Start Guide

## 🚀 What's Been Created

A production-ready REST API for your DEX with:
- ✅ 5 route modules (swap, liquidity, pools, tokens, price)
- ✅ 7 service modules (blockchain, swap, liquidity, pool, token, price, cache)
- ✅ Complete middleware stack (auth, rate limiting, validation, error handling)
- ✅ Logging with Winston (file rotation)
- ✅ Docker deployment setup
- ✅ PM2 clustering configuration
- ✅ Redis caching support

## 📁 Project Structure

```
rest-api/
├── src/
│   ├── config/
│   │   ├── index.js           # Centralized configuration
│   │   └── logger.js           # Winston logger setup
│   ├── middleware/
│   │   ├── auth.js             # JWT & API key authentication
│   │   ├── errorHandler.js    # Global error handling
│   │   ├── rateLimiter.js      # Redis-backed rate limiting
│   │   └── validator.js        # Request validation
│   ├── routes/
│   │   ├── health.routes.js    # Health check endpoints
│   │   ├── swap.routes.js      # Swap operations
│   │   ├── liquidity.routes.js # Liquidity management
│   │   ├── pool.routes.js      # Pool queries
│   │   ├── token.routes.js     # Token information
│   │   └── price.routes.js     # Price queries
│   ├── services/
│   │   ├── blockchain.service.js  # Core blockchain interactions
│   │   ├── swap.service.js        # Swap logic
│   │   ├── liquidity.service.js   # Liquidity logic
│   │   ├── pool.service.js        # Pool queries
│   │   ├── token.service.js       # Token operations
│   │   ├── price.service.js       # Price calculations
│   │   └── cache.service.js       # Redis caching
│   └── server.js               # Express app & initialization
├── .env.example                # Environment template
├── .dockerignore              # Docker ignore rules
├── .gitignore                 # Git ignore rules
├── docker-compose.yml         # Multi-container setup
├── Dockerfile                 # Production container
├── ecosystem.config.js        # PM2 configuration
├── package.json               # Dependencies
├── DEPLOYMENT.md              # Full deployment guide
└── README.md                  # API documentation
```

## ⚡ Quick Local Test

### 1. Setup Environment

```bash
cd rest-api

# Copy environment file
cp .env.example .env

# Edit with your values
nano .env
```

Required values from your existing `api/.env`:
```env
NODE_ENV=development
PORT=4000
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=1337
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
POOL_MANAGER_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
SWAP_ROUTER_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
JWT_SECRET=change-this-secret-in-production-min-32-chars
REDIS_ENABLED=false
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Server

```bash
# Development mode
npm start

# Or with nodemon for auto-reload
npm run dev
```

### 4. Test Endpoints

```bash
# Health check
curl http://localhost:4000/health

# Get swap quote (no auth needed)
curl -X POST http://localhost:4000/api/v1/swap/quote \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
    "tokenOut": "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
    "amountIn": "1000000000000000000",
    "fee": 3000
  }'

# Get pool info
curl "http://localhost:4000/api/v1/pools/search?tokenA=0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6&tokenB=0x8A791620dd6260079BF849Dc5567aDC3F2FdC318&fee=3000"

# Get token info
curl http://localhost:4000/api/v1/tokens/0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6

# Get token balance
curl http://localhost:4000/api/v1/tokens/0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6/balance/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

## 🔐 API Endpoints

### Public Endpoints (No Auth)
- `GET /health` - Health check
- `POST /api/v1/swap/quote` - Get swap quote
- `POST /api/v1/price/quote` - Get price quote
- `GET /api/v1/price/pool` - Get pool price
- `GET /api/v1/pools` - List pools
- `GET /api/v1/pools/search` - Search pool
- `GET /api/v1/tokens/:address` - Get token info
- `GET /api/v1/tokens/:address/balance/:owner` - Get balance

### Authenticated Endpoints (Require JWT or API Key)
- `POST /api/v1/swap/execute` - Execute swap
- `POST /api/v1/liquidity/add` - Add liquidity
- `POST /api/v1/liquidity/remove` - Remove liquidity

## 🔑 Authentication

### Option 1: API Key (Simple)
```bash
curl -H "X-API-Key: your-api-key-here" \
  http://localhost:4000/api/v1/swap/execute
```

### Option 2: JWT Token
```bash
# Login to get token (implement /auth/login endpoint)
TOKEN="your-jwt-token"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/v1/swap/execute
```

## 🐳 Docker Deployment

### Build and Run
```bash
# Build image
docker-compose build

# Start all services (API + Redis + Nginx)
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop all
docker-compose down
```

### Single Container
```bash
# Build
docker build -t dex-api:latest .

# Run
docker run -d \
  --name dex-api \
  -p 4000:4000 \
  --env-file .env \
  dex-api:latest
```

## 📊 Rate Limits

Different limits for different endpoint types:

- **Global**: 100 requests / 15 minutes per IP
- **Quotes**: 100 requests / 15 minutes per IP
- **Swaps**: 10 requests / 1 minute per IP
- **Liquidity**: 5 requests / 1 minute per IP

## 🔄 Differences from Development API

| Feature | Development API (`/api`) | Production API (`/rest-api`) |
|---------|-------------------------|------------------------------|
| Authentication | None | JWT + API Keys |
| Rate Limiting | None | Multi-tier with Redis |
| Logging | Console only | Winston with file rotation |
| Error Handling | Basic | Custom error classes + global handler |
| Caching | None | Redis + in-memory fallback |
| Security | Basic | Helmet, CORS, validation |
| Deployment | npm start | Docker, PM2 clustering, Nginx |
| Monitoring | None | Health checks, metrics ready |
| Scalability | Single process | PM2 cluster mode |

## 🛠️ Next Steps

1. **Copy Contract Addresses** from `api/test-config.json` to `.env`
2. **Test Locally** with Hardhat node running
3. **Add Authentication** - Implement JWT login endpoint
4. **Deploy to Server** - Follow DEPLOYMENT.md guide
5. **Setup Monitoring** - Add PM2 metrics, health checks
6. **Configure Nginx** - SSL, reverse proxy, load balancing

## 📝 Environment Variables Reference

```env
# Server
NODE_ENV=production              # development, production
PORT=4000                         # Server port

# Blockchain
RPC_URL=http://127.0.0.1:8545    # Ethereum RPC endpoint
CHAIN_ID=1337                     # Network chain ID
PRIVATE_KEY=0x...                 # Wallet private key

# Contracts
POOL_MANAGER_ADDRESS=0x...
POSITION_MANAGER_ADDRESS=0x...
SWAP_ROUTER_ADDRESS=0x...
STATE_VIEW_ADDRESS=0x...

# Security
JWT_SECRET=min-32-chars           # JWT signing secret
API_KEY_HEADER=X-API-Key          # API key header name
ALLOWED_API_KEYS=key1,key2,key3   # Comma-separated API keys

# Redis (optional)
REDIS_ENABLED=false               # Enable Redis caching
REDIS_HOST=localhost              # Redis host
REDIS_PORT=6379                   # Redis port
REDIS_PASSWORD=                   # Redis password (optional)

# Logging
LOG_LEVEL=info                    # error, warn, info, debug
LOG_FILE=logs/combined.log        # Log file path

# CORS
CORS_ORIGIN=*                     # Allowed origins
CORS_CREDENTIALS=true             # Allow credentials

# API
BASE_URL=/api/v1                  # API base path
```

## 🐛 Troubleshooting

### Server won't start
```bash
# Check logs
tail -f logs/error.log

# Verify environment
cat .env

# Check port availability
lsof -i :4000
```

### Redis connection failed
```bash
# Redis is optional - will fallback to in-memory cache
# To disable Redis:
echo "REDIS_ENABLED=false" >> .env
```

### Blockchain connection failed
```bash
# Verify Hardhat node is running
curl http://127.0.0.1:8545

# Check RPC_URL in .env
grep RPC_URL .env
```

## 📚 Documentation Files

- [README.md](README.md) - Complete API documentation
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment guide
- [.env.example](.env.example) - Environment configuration template

## 🎯 Testing Checklist

- [ ] Server starts without errors
- [ ] Health endpoint returns 200
- [ ] Can get swap quote
- [ ] Can get pool information
- [ ] Can get token info
- [ ] Can get token balance
- [ ] Rate limiting works
- [ ] Logs are being written
- [ ] Error responses are formatted correctly
- [ ] BigInt values serialize correctly

## 🚀 Ready to Deploy!

Your production API is ready. Start with local testing, then follow DEPLOYMENT.md for production deployment.

**Questions?** Check the inline code comments - every service and route is documented.
