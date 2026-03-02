import { Router, Request, Response, NextFunction } from 'express';
import blockchainService from '../services/blockchain';
import { ApiResponse, LiquidityAddRequest, LiquidityRemoveRequest } from '../types';

const router = Router();

interface TokenParams {
  token0: string;
  token1: string;
}

interface CollectFeesRequest {
  token0: string;
  token1: string;
  privateKey: string;
  fee?: number;
  tickLower?: number;
  tickUpper?: number;
}

/**
 * POST /api/liquidity/add
 * Add liquidity to a pool
 */
router.post('/add', async (req: Request<{}, ApiResponse, LiquidityAddRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { token0, token1, amount0, amount1, privateKey, tickLower, tickUpper } = req.body;

    if (!token0 || !token1 || !amount0 || !amount1 || !privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Required: token0, token1, amount0, amount1, privateKey'
      });
    }

    const userWallet = blockchainService.createWalletFromPrivateKey(privateKey);

    const result = await blockchainService.addLiquidityWithWallet(
      userWallet,
      token0,
      token1,
      parseFloat(amount0),
      parseFloat(amount1),
      tickLower || null,
      tickUpper || null
    );

    res.json({
      success: true,
      message: 'Liquidity added successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/liquidity/remove
 * Remove liquidity from a pool
 */
router.post('/remove', async (req: Request<{}, ApiResponse, LiquidityRemoveRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { token0, token1, liquidityAmount, privateKey, tickLower, tickUpper } = req.body;

    if (!token0 || !token1 || !liquidityAmount || !privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Required: token0, token1, liquidityAmount, privateKey'
      });
    }

    const userWallet = blockchainService.createWalletFromPrivateKey(privateKey);

    const result = await blockchainService.removeLiquidity(
      token0,
      token1,
      parseFloat(liquidityAmount),
      tickLower || null,
      tickUpper || null,
      privateKey
    );

    res.json({
      success: true,
      message: 'Liquidity removed successfully',
      data: {
        ...result,
        caller: userWallet.address
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/liquidity/:token0/:token1
 * Get liquidity information for a specific pool
 */
router.get('/:token0/:token1', async (req: Request<TokenParams>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { token0, token1 } = req.params;

    const poolInfo = await blockchainService.getPoolInfo(token0, token1);

    res.json({
      success: true,
      data: poolInfo
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/liquidity/user-position/:userAddress/:token0/:token1
 * Get LP position info for a specific user
 */
router.get('/user-position/:userAddress/:token0/:token1', async (req: Request<{ userAddress: string; token0: string; token1: string }>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { userAddress, token0, token1 } = req.params;
    const fee = parseInt(req.query.fee as string) || 3000;
    const tickLower = req.query.tickLower ? parseInt(req.query.tickLower as string) : null;
    const tickUpper = req.query.tickUpper ? parseInt(req.query.tickUpper as string) : null;

    const position = await blockchainService.getPositionFromContract(
      userAddress,
      token0,
      token1,
      fee,
      tickLower,
      tickUpper
    );

    res.json({
      success: true,
      data: {
        userAddress,
        token0,
        token1,
        fee,
        ...position,
        liquidityFormatted: position.liquidity ? (Number(position.liquidity) / 1e18).toFixed(18) : '0'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/liquidity/position/:token0/:token1
 * Get LP position info including uncollected fees
 */
router.get('/position/:token0/:token1', async (req: Request<TokenParams>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { token0, token1 } = req.params;
    const fee = parseInt(req.query.fee as string) || 3000;
    const tickLower = req.query.tickLower ? parseInt(req.query.tickLower as string) : null;
    const tickUpper = req.query.tickUpper ? parseInt(req.query.tickUpper as string) : null;

    const positionInfo = await blockchainService.getLPPositionInfo(
      token0,
      token1,
      fee,
      tickLower,
      tickUpper
    );

    res.json({
      success: true,
      data: positionInfo
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/liquidity/collect-fees
 * Collect LP fees for a position without removing liquidity
 */
router.post('/collect-fees', async (req: Request<{}, ApiResponse, CollectFeesRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { token0, token1, privateKey, fee, tickLower, tickUpper } = req.body;

    if (!token0 || !token1 || !privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Required: token0, token1, privateKey'
      });
    }

    const result = await blockchainService.collectLPFees(
      privateKey,
      token0,
      token1,
      fee || 3000,
      tickLower || null,
      tickUpper || null
    );

    res.json({
      success: true,
      message: 'LP fees collected successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

export default router;
