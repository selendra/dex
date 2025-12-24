require('dotenv').config();

module.exports = {
  // Server
  env: process.env.NODE_ENV || 'production',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiVersion: process.env.API_VERSION || 'v1',
  baseUrl: process.env.API_BASE_URL || '/api/v1',

  // Blockchain
  rpcUrl: process.env.RPC_URL,
  chainId: parseInt(process.env.CHAIN_ID, 10) || 1,
  networkName: process.env.NETWORK_NAME || 'mainnet',

  // Contracts
  contracts: {
    poolManager: process.env.POOL_MANAGER_ADDRESS,
    positionManager: process.env.POSITION_MANAGER_ADDRESS,
    swapRouter: process.env.SWAP_ROUTER_ADDRESS,
    stateView: process.env.STATE_VIEW_ADDRESS,
    liquidityManager: process.env.LIQUIDITY_MANAGER_ADDRESS,
  },

  // Wallet
  privateKey: process.env.PRIVATE_KEY,

  // Security
  jwt: {
    secret: process.env.JWT_SECRET,
    expiration: process.env.JWT_EXPIRATION || '24h',
  },
  apiKeyHeader: process.env.API_KEY_HEADER || 'X-API-Key',

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    swap: parseInt(process.env.SWAP_RATE_LIMIT, 10) || 10,
    liquidity: parseInt(process.env.LIQUIDITY_RATE_LIMIT, 10) || 5,
    quote: parseInt(process.env.QUOTE_RATE_LIMIT, 10) || 100,
  },

  // Redis
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    cacheTtl: parseInt(process.env.CACHE_TTL, 10) || 300,
  },

  // Database
  database: {
    url: process.env.DATABASE_URL,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE,
  },

  // Monitoring
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    datadogApiKey: process.env.DATADOG_API_KEY,
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // Gas
  gas: {
    priceBuffer: parseFloat(process.env.GAS_PRICE_BUFFER) || 1.1,
    maxGasPriceGwei: parseInt(process.env.MAX_GAS_PRICE_GWEI, 10) || 500,
    estimationBuffer: parseFloat(process.env.GAS_ESTIMATION_BUFFER) || 1.2,
  },

  // Feature Flags
  features: {
    adminEndpoints: process.env.ENABLE_ADMIN_ENDPOINTS === 'true',
    swapExecution: process.env.ENABLE_SWAP_EXECUTION === 'true',
    liquidityManagement: process.env.ENABLE_LIQUIDITY_MANAGEMENT === 'true',
    metrics: process.env.ENABLE_METRICS === 'true',
  },

  // External Services
  external: {
    coingeckoApiKey: process.env.COINGECKO_API_KEY,
    etherscanApiKey: process.env.ETHERSCAN_API_KEY,
  },

  // Webhooks
  webhook: {
    url: process.env.WEBHOOK_URL,
    secret: process.env.WEBHOOK_SECRET,
  },
};
