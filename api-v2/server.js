const express = require('express');
const cors = require('cors');
require('dotenv').config();

const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const healthRoute = require('./routes/health');
const poolsRoute = require('./routes/pools');
const tokensRoute = require('./routes/tokens');
const utilsRoute = require('./routes/utils');
const swapsRoute = require('./routes/swaps');
const liquidityRoute = require('./routes/liquidity');const swapRoutes = require('./routes/swaps');
const liquidityRoutes = require('./routes/liquidity');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Routes
app.use('/health', healthRoute);
app.use('/pools', poolsRoute);
app.use('/tokens', tokensRoute);
app.use('/utils', utilsRoute);
app.use('/swaps', swapsRoute);
app.use('/liquidity', liquidityRoute);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'DEX API - Phase 1',
      version: '2.0.0',
      phase: 'Phase 2 - Trading Features',
      endpoints: {
        health: 'GET /health',
        pools: {
          initialize: 'POST /pools/initialize',
          info: 'GET /pools/:poolId',
          price: 'GET /pools/:poolId/price',
        },
        tokens: {
          info: 'GET /tokens/:address',
          approve: 'POST /tokens/approve',
          balance: 'GET /tokens/:address/balance/:owner',
        },
        utils: {
          encodePoolKey: 'POST /utils/encode-poolkey',
          calculatePoolId: 'POST /utils/calculate-poolid',
          priceToSqrt: 'POST /utils/price-to-sqrt',
          sqrtToPrice: 'POST /utils/sqrt-to-price',
        },
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀 DEX API Server running on port ${PORT}`);
  console.log(`📡 Network: ${process.env.RPC_URL}`);
  console.log(`📝 Endpoints: http://localhost:${PORT}/\n`);
});

module.exports = app;
