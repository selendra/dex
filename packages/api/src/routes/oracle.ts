import { Router, Request, Response, NextFunction } from 'express';
import blockchainService from '../services/blockchain';
import { ApiResponse } from '../types';

const router = Router();

interface TokenPairParams {
  token0: string;
  token1: string;
}

interface AccountParams {
  account: string;
}

interface FeedPriceRequest {
  privateKey: string;
  token0: string;
  token1: string;
  price: string | number;
}

interface FeedBatchRequest {
  privateKey: string;
  pairs: Array<{ token0: string; token1: string; price: string | number }>;
}

interface ObserveRequest {
  privateKey: string;
  token0: string;
  token1: string;
}

interface AuthorizeFeederRequest {
  privateKey: string;
  account: string;
  authorized: boolean;
}

interface AdminTransferRequest {
  privateKey: string;
  newAdmin: string;
}

interface SetFeeRequest {
  privateKey: string;
  fee: number;
}

interface SetTickSpacingRequest {
  privateKey: string;
  tickSpacing: number;
}

interface InvalidatePriceRequest {
  privateKey: string;
  token0: string;
  token1: string;
}

/**
 * GET /oracle/price/:token0/:token1
 * Get price for a token pair (pool or external feed)
 */
router.get('/price/:token0/:token1', async (req: Request<TokenPairParams>, res: Response<ApiResponse>, _next: NextFunction) => {
  try {
    const { token0, token1 } = req.params;

    const priceInfo = await blockchainService.getPrice(token0, token1);

    res.json({
      success: true,
      data: priceInfo
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /oracle/pool-price/:token0/:token1
 * Get price from on-chain pool only
 */
router.get('/pool-price/:token0/:token1', async (req: Request<TokenPairParams>, res: Response<ApiResponse>, _next: NextFunction) => {
  try {
    const { token0, token1 } = req.params;

    const priceData = await blockchainService.getPoolPrice(token0, token1);

    res.json({
      success: true,
      data: priceData
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /oracle/external-price/:token0/:token1
 * Get external price feed only
 */
router.get('/external-price/:token0/:token1', async (req: Request<TokenPairParams>, res: Response<ApiResponse>, _next: NextFunction) => {
  try {
    const { token0, token1 } = req.params;

    const priceData = await blockchainService.getExternalPrice(token0, token1);

    res.json({
      success: true,
      data: priceData
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /oracle/twap/:token0/:token1
 * Get TWAP for a token pair
 */
router.get('/twap/:token0/:token1', async (req: Request<TokenPairParams>, res: Response<ApiResponse>, _next: NextFunction) => {
  try {
    const { token0, token1 } = req.params;

    const twapData = await blockchainService.getTWAP(token0, token1);

    res.json({
      success: true,
      data: twapData
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /oracle/feed
 * Feed price for a token pair (authorized feeder only)
 */
router.post('/feed', async (req: Request<{}, ApiResponse, FeedPriceRequest>, res: Response<ApiResponse>, _next: NextFunction) => {
  try {
    const { privateKey, token0, token1, price } = req.body;

    if (!privateKey || !token0 || !token1 || price === undefined) {
      return res.status(400).json({
        success: false,
        error: 'privateKey, token0, token1, and price are required'
      });
    }

    const result = await blockchainService.feedPrice(privateKey, token0, token1, price);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /oracle/feed-batch
 * Feed multiple prices at once (authorized feeder only)
 */
router.post('/feed-batch', async (req: Request<{}, ApiResponse, FeedBatchRequest>, res: Response<ApiResponse>, _next: NextFunction) => {
  try {
    const { privateKey, pairs } = req.body;

    if (!privateKey || !pairs || !Array.isArray(pairs)) {
      return res.status(400).json({
        success: false,
        error: 'privateKey and pairs array are required'
      });
    }

    const result = await blockchainService.feedPricesBatch(privateKey, pairs);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /oracle/observe
 * Observe current pool price (updates TWAP)
 */
router.post('/observe', async (req: Request<{}, ApiResponse, ObserveRequest>, res: Response<ApiResponse>, _next: NextFunction) => {
  try {
    const { privateKey, token0, token1 } = req.body;

    if (!privateKey || !token0 || !token1) {
      return res.status(400).json({
        success: false,
        error: 'privateKey, token0, and token1 are required'
      });
    }

    const result = await blockchainService.observePoolPrice(token0, token1, privateKey);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /oracle/observations/:token0/:token1
 * Get observation count for a pair
 */
router.get('/observations/:token0/:token1', async (req: Request<TokenPairParams>, res: Response<ApiResponse>, _next: NextFunction) => {
  try {
    const { token0, token1 } = req.params;

    const result = await blockchainService.getObservationCount(token0, token1);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /oracle/invalidate
 * Invalidate an external price feed (authorized feeder only)
 */
router.post('/invalidate', async (req: Request<{}, ApiResponse, InvalidatePriceRequest>, res: Response<ApiResponse>, _next: NextFunction) => {
  try {
    const { privateKey, token0, token1 } = req.body;

    if (!privateKey || !token0 || !token1) {
      return res.status(400).json({
        success: false,
        error: 'privateKey, token0, and token1 are required'
      });
    }

    const result = await blockchainService.invalidatePrice(privateKey, token0, token1);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /oracle/config
 * Get oracle configuration
 */
router.get('/config', async (_req: Request, res: Response<ApiResponse>, _next: NextFunction) => {
  try {
    const config = await blockchainService.getOracleConfig();

    res.json({
      success: true,
      data: config
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============== ADMIN ROUTES ==============

/**
 * GET /oracle/admin/feeder/:account
 * Check if an address is an authorized feeder
 */
router.get('/admin/feeder/:account', async (req: Request<AccountParams>, res: Response<ApiResponse>, _next: NextFunction) => {
  try {
    const { account } = req.params;

    const isAuthorized = await blockchainService.isAuthorizedFeeder(account);

    res.json({
      success: true,
      data: {
        account,
        isAuthorized
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /oracle/admin/authorize
 * Authorize or revoke a price feeder (admin only)
 */
router.post('/admin/authorize', async (req: Request<{}, ApiResponse, AuthorizeFeederRequest>, res: Response<ApiResponse>, _next: NextFunction) => {
  try {
    const { privateKey, account, authorized } = req.body;

    if (!privateKey || !account || authorized === undefined) {
      return res.status(400).json({
        success: false,
        error: 'privateKey, account, and authorized are required'
      });
    }

    const result = await blockchainService.setAuthorizedFeeder(privateKey, account, authorized);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /oracle/admin
 * Get oracle admin address
 */
router.get('/admin', async (_req: Request, res: Response<ApiResponse>, _next: NextFunction) => {
  try {
    const admin = await blockchainService.getOracleAdmin();

    res.json({
      success: true,
      data: {
        admin
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /oracle/admin/transfer
 * Transfer oracle admin role (admin only)
 */
router.post('/admin/transfer', async (req: Request<{}, ApiResponse, AdminTransferRequest>, res: Response<ApiResponse>, _next: NextFunction) => {
  try {
    const { privateKey, newAdmin } = req.body;

    if (!privateKey || !newAdmin) {
      return res.status(400).json({
        success: false,
        error: 'privateKey and newAdmin are required'
      });
    }

    const result = await blockchainService.transferOracleAdmin(privateKey, newAdmin);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /oracle/admin/set-fee
 * Set default fee for pool lookups (admin only)
 */
router.post('/admin/set-fee', async (req: Request<{}, ApiResponse, SetFeeRequest>, res: Response<ApiResponse>, _next: NextFunction) => {
  try {
    const { privateKey, fee } = req.body;

    if (!privateKey || fee === undefined) {
      return res.status(400).json({
        success: false,
        error: 'privateKey and fee are required'
      });
    }

    const result = await blockchainService.setDefaultFee(privateKey, fee);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /oracle/admin/set-tick-spacing
 * Set default tick spacing for pool lookups (admin only)
 */
router.post('/admin/set-tick-spacing', async (req: Request<{}, ApiResponse, SetTickSpacingRequest>, res: Response<ApiResponse>, _next: NextFunction) => {
  try {
    const { privateKey, tickSpacing } = req.body;

    if (!privateKey || tickSpacing === undefined) {
      return res.status(400).json({
        success: false,
        error: 'privateKey and tickSpacing are required'
      });
    }

    const result = await blockchainService.setDefaultTickSpacing(privateKey, tickSpacing);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
