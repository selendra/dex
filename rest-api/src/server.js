const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const config = require('./config');
const logger = require('./config/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiter');

// Import routes
const swapRoutes = require('./routes/swap.routes');
const liquidityRoutes = require('./routes/liquidity.routes');
const poolRoutes = require('./routes/pool.routes');
const tokenRoutes = require('./routes/token.routes');
const priceRoutes = require('./routes/price.routes');
const healthRoutes = require('./routes/health.routes');

// Import services for initialization
const blockchainService = require('./services/blockchain.service');
const cacheService = require('./services/cache.service');

const app = express();

// Fix BigInt serialization
BigInt.prototype.toJSON = function() { return this.toString(); };

// Trust proxy (for Nginx, Load Balancer, etc.)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
}));

// CORS
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', config.apiKeyHeader],
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Logging
if (config.env === 'production') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.http(message.trim())
    }
  }));
} else {
  app.use(morgan('dev'));
}

// Rate limiting
app.use(globalLimiter);

// Health check (before rate limiting)
app.use('/health', healthRoutes);

// API routes
const apiRouter = express.Router();
apiRouter.use('/swap', swapRoutes);
apiRouter.use('/liquidity', liquidityRoutes);
apiRouter.use('/pools', poolRoutes);
apiRouter.use('/tokens', tokenRoutes);
apiRouter.use('/price', priceRoutes);

app.use(config.baseUrl, apiRouter);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Initialize services and start server
const PORT = config.port;
let server;

const startServer = async () => {
  try {
    // Initialize services before starting server
    logger.info('Initializing services...');
    await blockchainService.initialize();
    await cacheService.initialize();
    logger.info('Services initialized successfully');

    // Start server
    server = app.listen(PORT, () => {
      logger.info(`
╔════════════════════════════════════════════╗
║   DEX Production API Server                ║
╠════════════════════════════════════════════╣
║   Environment: ${config.env.padEnd(28)} ║
║   Port: ${PORT.toString().padEnd(35)} ║
║   Network: ${config.networkName.padEnd(31)} ║
║   Chain ID: ${config.chainId.toString().padEnd(30)} ║
╠════════════════════════════════════════════╣
║   API Base: ${config.baseUrl.padEnd(30)} ║
║   Features:                                ║
║   - Swap Execution: ${config.features.swapExecution.toString().padEnd(17)} ║
║   - Liquidity Mgmt: ${config.features.liquidityManagement.toString().padEnd(17)} ║
║   - Admin Endpoints: ${config.features.adminEndpoints.toString().padEnd(16)} ║
║   - Metrics: ${config.features.metrics.toString().padEnd(25)} ║
╚════════════════════════════════════════════╝
      `);
      logger.info(`API Documentation: http://localhost:${PORT}${config.baseUrl}/docs`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
