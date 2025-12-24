const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const liquidityRoutes = require('./routes/liquidity');
const swapRoutes = require('./routes/swap');
const priceRoutes = require('./routes/price');
const poolRoutes = require('./routes/pools');
const adminRoutes = require('./routes/admin');
const tokenRoutes = require('./routes/tokens');
const dexRoutes = require('./routes/dex');

const app = express();
const PORT = process.env.PORT || 3000;

// Fix BigInt serialization
BigInt.prototype.toJSON = function() { return this.toString(); };

// Security middleware
app.use(helmet());
app.use(cors());

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      contracts: {
        poolManager: process.env.POOL_MANAGER_ADDRESS,
        positionManager: process.env.POSITION_MANAGER_ADDRESS,
        swapRouter: process.env.SWAP_ROUTER_ADDRESS,
        stateView: process.env.STATE_VIEW_ADDRESS
      }
    }
  });
});

// API routes
app.use('/api/liquidity', liquidityRoutes);
app.use('/api/swap', swapRoutes);
app.use('/api/price', priceRoutes);
app.use('/api/pools', poolRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/dex', dexRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
      details: err.details || {}
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`╔════════════════════════════════════════════╗`);
  console.log(`║   DEX REST API Server                      ║`);
  console.log(`╠════════════════════════════════════════════╣`);
  console.log(`║   Port: ${PORT}                              ║`);
  console.log(`║   Environment: ${process.env.NODE_ENV || 'development'}              ║`);
  console.log(`║   Network: ${process.env.RPC_URL || 'localhost'}   ║`);
  console.log(`╠════════════════════════════════════════════╣`);
  console.log(`║   Contracts Loaded:                        ║`);
  console.log(`║   - PoolManager: ${process.env.POOL_MANAGER_ADDRESS ? '✓' : '✗'}                    ║`);
  console.log(`║   - PositionManager: ${process.env.POSITION_MANAGER_ADDRESS ? '✓' : '✗'}                ║`);
  console.log(`║   - SwapRouter: ${process.env.SWAP_ROUTER_ADDRESS ? '✓' : '✗'}                     ║`);
  console.log(`╚════════════════════════════════════════════╝`);
});

module.exports = app;
