import { Router, Request, Response, NextFunction } from 'express';
import blockchainService from '../services/blockchain';
import { ApiResponse } from '../types';

const router = Router();

interface TokenAddressParams {
  tokenAddress: string;
}

interface TokenPairParams {
  token0: string;
  token1: string;
}

interface SetControllerRequest {
  privateKey: string;
  controllerAddress: string;
}

interface SetProtocolFeeRequest {
  privateKey: string;
  token0: string;
  token1: string;
  fee?: number;
  protocolFee?: number;
}

interface CollectFeesRequest {
  privateKey: string;
  recipient: string;
  tokenAddress: string;
  amount?: string;
}

interface AllAccruedRequest {
  tokenAddresses: string[];
}

/**
 * GET /protocol-fees/controller
 * Get protocol fee controller and PoolManager owner
 */
router.get('/controller', async (_req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const data = await blockchainService.getProtocolFeeController();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /protocol-fees/accrued/:tokenAddress
 * Get accrued protocol fees for a token
 */
router.get('/accrued/:tokenAddress', async (req: Request<TokenAddressParams>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { tokenAddress } = req.params;
    const data = await blockchainService.getProtocolFeesAccrued(tokenAddress);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /protocol-fees/pool/:token0/:token1
 * Get protocol fee info for a specific pool
 */
router.get('/pool/:token0/:token1', async (req: Request<TokenPairParams>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { token0, token1 } = req.params;
    const fee = parseInt(req.query.fee as string) || 3000;
    const data = await blockchainService.getPoolProtocolFee(token0, token1, fee);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /protocol-fees/set-controller
 * Set protocol fee controller (only PoolManager owner)
 */
router.post('/set-controller', async (req: Request<{}, ApiResponse, SetControllerRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { privateKey, controllerAddress } = req.body;

    if (!privateKey || !controllerAddress) {
      return res.status(400).json({
        success: false,
        error: 'privateKey and controllerAddress are required'
      });
    }

    const data = await blockchainService.setProtocolFeeController(privateKey, controllerAddress);
    res.json({
      success: true,
      message: 'Protocol fee controller updated',
      data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /protocol-fees/set-fee
 * Set protocol fee for a pool (only protocol fee controller)
 */
router.post('/set-fee', async (req: Request<{}, ApiResponse, SetProtocolFeeRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { privateKey, token0, token1, fee, protocolFee } = req.body;

    if (!privateKey || !token0 || !token1) {
      return res.status(400).json({
        success: false,
        error: 'privateKey, token0, and token1 are required'
      });
    }

    const poolFee = fee || 3000;
    const pFee = protocolFee || 0;

    const data = await blockchainService.setProtocolFee(privateKey, token0, token1, poolFee, pFee);
    res.json({
      success: true,
      message: 'Protocol fee set for pool',
      data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /protocol-fees/collect
 * Collect accrued protocol fees (only protocol fee controller)
 */
router.post('/collect', async (req: Request<{}, ApiResponse, CollectFeesRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { privateKey, recipient, tokenAddress, amount } = req.body;

    if (!privateKey || !recipient || !tokenAddress) {
      return res.status(400).json({
        success: false,
        error: 'privateKey, recipient, and tokenAddress are required'
      });
    }

    const data = await blockchainService.collectProtocolFees(
      privateKey,
      recipient,
      tokenAddress,
      amount || "0"
    );
    res.json({
      success: true,
      message: 'Protocol fees collected',
      data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /protocol-fees/all-accrued
 * Get accrued fees for all known tokens
 */
router.post('/all-accrued', async (req: Request<{}, ApiResponse, AllAccruedRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { tokenAddresses } = req.body;

    if (!tokenAddresses || !Array.isArray(tokenAddresses)) {
      return res.status(400).json({
        success: false,
        error: 'tokenAddresses array is required'
      });
    }

    const results = await Promise.all(
      tokenAddresses.map(addr => blockchainService.getProtocolFeesAccrued(addr))
    );

    res.json({
      success: true,
      data: {
        fees: results,
        totalTokens: results.length
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
