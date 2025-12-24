# Production REST API

Production-ready REST API for the Uniswap V4 DEX with enhanced security, monitoring, and scalability.

## Features

- ✅ **Production Security** - Helmet, CORS, rate limiting, API keys
- ✅ **Authentication** - JWT & API key support
- ✅ **Validation** - Request validation with express-validator
- ✅ **Rate Limiting** - Redis-backed rate limiting
- ✅ **Logging** - Winston logger with file rotation
- ✅ **Error Handling** - Centralized error handling
- ✅ **Monitoring** - Health checks, metrics, Sentry integration
- ✅ **Caching** - Redis caching for quotes and prices
- ✅ **Docker Support** - Containerized deployment
- ✅ **PM2 Clustering** - Multi-process support
- ✅ **Compression** - Gzip compression
- ✅ **Graceful Shutdown** - Proper cleanup on shutdown

## Quick Start

### 1. Installation

```bash
cd rest-api
npm install
```

### 2. Configuration

```bash
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:
- `RPC_URL` - Your Ethereum RPC endpoint
- `CHAIN_ID` - Network chain ID (1 for mainnet)
- `POOL_MANAGER_ADDRESS` - PoolManager contract address
- `SWAP_ROUTER_ADDRESS` - SwapRouter contract address
- `JWT_SECRET` - Secret for JWT tokens
- `VALID_API_KEYS` - Comma-separated API keys

### 3. Run Development

```bash
npm run dev
```

### 4. Run Production

```bash
npm start
```

### 5. Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop
docker-compose down
```

### 6. PM2 Deployment

```bash
# Start with PM2
npm run pm2:start

# View logs
npm run pm2:logs

# Restart
npm run pm2:restart

# Stop
npm run pm2:stop
```

## API Endpoints

### Base URL
```
Production: https://api.yourdomain.com/api/v1
Development: http://localhost:3000/api/v1
```

### Health Check
```
GET /health
GET /health/ready  (Kubernetes readiness probe)
GET /health/live   (Kubernetes liveness probe)
```

### Swap Endpoints
```
POST /api/v1/swap/quote       - Get swap quote
POST /api/v1/swap/execute     - Execute swap (requires auth)
POST /api/v1/swap/route       - Find optimal route
```

### Liquidity Endpoints
```
POST /api/v1/liquidity/add/quote     - Get liquidity quote
POST /api/v1/liquidity/add           - Add liquidity (requires auth)
POST /api/v1/liquidity/remove/quote  - Get remove quote
POST /api/v1/liquidity/remove        - Remove liquidity (requires auth)
```

### Pool Endpoints
```
GET /api/v1/pools                    - List pools
GET /api/v1/pools/:poolId            - Get pool details
GET /api/v1/pools/search             - Search pools
```

### Token Endpoints
```
GET /api/v1/tokens/:address          - Get token info
GET /api/v1/tokens/:address/balance/:owner - Get balance
GET /api/v1/tokens/:address/price    - Get token price
```

### Price Endpoints
```
POST /api/v1/price/quote             - Get price quote
GET /api/v1/price/pool               - Get pool price
```

## Authentication

### API Key (Recommended for Production)

```bash
curl -H "X-API-Key: your-api-key-here" \
  https://api.yourdomain.com/api/v1/swap/quote
```

### JWT Token

```bash
# Get token (implement login endpoint)
curl -X POST https://api.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass"}'

# Use token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.yourdomain.com/api/v1/swap/execute
```

## Rate Limiting

Rate limits per IP address:
- Global: 100 requests / 15 minutes
- Swap execution: 10 requests / minute
- Liquidity operations: 5 requests / minute
- Quotes: 100 requests / minute

## Monitoring

### Health Checks
- `/health` - Overall health status
- `/health/ready` - Readiness for traffic
- `/health/live` - Application is alive

### Logging
Logs are written to:
- Console (formatted with colors in development)
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

### Metrics (if enabled)
- Request count
- Response times
- Error rates
- Gas usage

## Deployment

### Environment Setup

1. **Production Server**
   - Ubuntu 20.04+ or similar
   - Node.js 18+
   - Redis (optional but recommended)
   - Nginx (for reverse proxy)
   - SSL certificate

2. **Cloud Platforms**
   - AWS: EC2, ECS, or Lambda
   - Google Cloud: Cloud Run or Compute Engine
   - Azure: App Service or Container Instances
   - Heroku, Railway, Render, etc.

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL Setup (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

## Security Best Practices

1. **Never commit sensitive data**
   - Use environment variables
   - Add `.env` to `.gitignore`

2. **Use API keys or JWT**
   - Require authentication for write operations
   - Rotate keys regularly

3. **Enable rate limiting**
   - Protect against DDoS
   - Use Redis for distributed rate limiting

4. **Monitor and log**
   - Set up alerts for errors
   - Track unusual patterns

5. **Keep dependencies updated**
   ```bash
   npm audit
   npm update
   ```

## Scaling

### Horizontal Scaling
- Use PM2 cluster mode for multiple processes
- Deploy multiple instances behind a load balancer
- Use Redis for shared state

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Add caching layers

### Caching Strategy
- Cache swap quotes (5 minutes)
- Cache token prices (1 minute)
- Cache pool data (30 seconds)

## Troubleshooting

### Check Logs
```bash
# PM2 logs
pm2 logs dex-api

# Docker logs
docker-compose logs -f api

# File logs
tail -f logs/combined.log
```

### Common Issues

1. **Connection refused**
   - Check if server is running: `pm2 status`
   - Verify port is open: `netstat -an | grep 3000`

2. **Rate limit exceeded**
   - Wait for rate limit window to reset
   - Use different IP or API key

3. **Transaction failures**
   - Check gas price settings
   - Verify contract addresses
   - Check wallet balance

## Development

### Project Structure
```
rest-api/
├── src/
│   ├── config/          # Configuration
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utilities
│   └── server.js        # Main server
├── logs/                # Log files
├── Dockerfile           # Docker image
├── docker-compose.yml   # Docker compose
├── ecosystem.config.js  # PM2 configuration
└── package.json         # Dependencies
```

### Adding New Endpoints

1. Create route file in `src/routes/`
2. Add validation in `src/middleware/validator.js`
3. Implement logic in `src/services/`
4. Register route in `src/server.js`

## License

MIT

## Support

For issues and questions:
- GitHub Issues: [your-repo]/issues
- Documentation: [your-docs-url]
- Email: support@yourdomain.com
