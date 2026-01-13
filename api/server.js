const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const swapRoutes = require('./routes/swap');
const liquidityRoutes = require('./routes/liquidity');
const poolRoutes = require('./routes/pool');
const tokenRoutes = require('./routes/token');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/swap', swapRoutes);
app.use('/api/liquidity', liquidityRoutes);
app.use('/api/pool', poolRoutes);
app.use('/api/token', tokenRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'DEX API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
    details: err.reason || err.toString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DEX API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`💱 Swap endpoint: http://localhost:${PORT}/api/swap`);
  console.log(`💧 Liquidity endpoint: http://localhost:${PORT}/api/liquidity`);
  console.log(`🏊 Pool endpoint: http://localhost:${PORT}/api/pool`);
  console.log(`🪙 Token endpoint: http://localhost:${PORT}/api/token`);
});

module.exports = app;
