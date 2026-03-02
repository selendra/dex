import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../../../.env') });

import blockchainService from './services/blockchain';
import {
  swapRoutes,
  liquidityRoutes,
  poolRoutes,
  tokenRoutes,
  oracleRoutes,
  protocolFeesRoutes
} from './routes';

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Initialize blockchain service on startup
blockchainService.initialize().then(() => {
  console.log('✅ Blockchain service ready');
}).catch((err: Error) => {
  console.error('❌ Failed to initialize blockchain service:', err.message);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/swap', swapRoutes);
app.use('/api/liquidity', liquidityRoutes);
app.use('/api/pool', poolRoutes);
app.use('/api/token', tokenRoutes);
app.use('/api/oracle', oracleRoutes);
app.use('/api/protocol-fees', protocolFeesRoutes);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'DEX API is running' });
});

// Error handling middleware
interface ErrorWithReason extends Error {
  reason?: string;
}

app.use((err: ErrorWithReason, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
    details: err.reason || err.toString()
  });
});

// Start server
const startServer = (): void => {
  app.listen(PORT, () => {
    console.log(`🚀 DEX API server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`💱 Swap endpoint: http://localhost:${PORT}/api/swap`);
    console.log(`💧 Liquidity endpoint: http://localhost:${PORT}/api/liquidity`);
    console.log(`🏊 Pool endpoint: http://localhost:${PORT}/api/pool`);
    console.log(`🪙 Token endpoint: http://localhost:${PORT}/api/token`);
    console.log(`📈 Oracle endpoint: http://localhost:${PORT}/api/oracle`);
    console.log(`💰 Protocol Fees endpoint: http://localhost:${PORT}/api/protocol-fees`);
  });
};

export { app, startServer };
export default app;
