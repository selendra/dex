import { Router, Request, Response, NextFunction } from 'express';
import blockchainService from '../services/blockchain';
import { ApiResponse, SwapRequest, QuoteRequest } from '../types';

const router = Router();

interface BalancesRequest {
  privateKey: string;
  tokens?: string[];
}

interface AdminRequest {
  privateKey: string;
  newAdmin?: string;
}

/**
 * POST /api/swap
 * Execute a token swap
 */
router.post('/', async (req: Request<{}, ApiResponse, SwapRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { tokenIn, tokenOut, amountIn, minAmountOut, privateKey } = req.body;

    if (!tokenIn || !tokenOut || !amountIn || !privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Required: tokenIn, tokenOut, amountIn, privateKey'
      });
    }

    const userWallet = blockchainService.createWalletFromPrivateKey(privateKey);

    const balancesBefore = await blockchainService.getUserBalances(
      userWallet.address,
      [tokenIn, tokenOut]
    );

    const userBalance = parseFloat(balancesBefore.tokens[tokenIn]);
    const requiredAmount = parseFloat(amountIn);
    if (userBalance < requiredAmount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        details: `Required: ${requiredAmount}, Available: ${userBalance}, Token: ${tokenIn}`
      });
    }

    const result = await blockchainService.executeSwap(
      tokenIn,
      tokenOut,
      parseFloat(amountIn),
      minAmountOut ? parseFloat(minAmountOut) : 0,
      userWallet
    );

    const balancesAfter = await blockchainService.getUserBalances(
      userWallet.address,
      [tokenIn, tokenOut]
    );

    res.json({
      success: true,
      message: 'Swap executed successfully',
      data: {
        ...result,
        balances: {
          before: balancesBefore,
          after: balancesAfter
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/swap/quote
 * Get swap quote (without executing)
 */
router.post('/quote', async (req: Request<{}, ApiResponse, QuoteRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { tokenIn, tokenOut, amountIn, privateKey } = req.body;

    if (!tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Required: tokenIn, tokenOut, amountIn'
      });
    }

    const quote = await blockchainService.getSwapQuote(tokenIn, tokenOut, parseFloat(amountIn));

    let userBalances = null;
    if (privateKey) {
      try {
        const wallet = blockchainService.createWalletFromPrivateKey(privateKey);
        userBalances = await blockchainService.getUserBalances(
          wallet.address,
          [tokenIn, tokenOut]
        );
      } catch {
        // Ignore invalid private key for quote
      }
    }

    res.json({
      success: true,
      message: 'Quote calculated',
      data: {
        ...quote,
        userBalances
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/swap/balances
 * Get user's token and native balances
 */
router.post('/balances', async (req: Request<{}, ApiResponse, BalancesRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { privateKey, tokens } = req.body;

    if (!privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Required: privateKey'
      });
    }

    const wallet = blockchainService.createWalletFromPrivateKey(privateKey);
    const tokenAddresses = tokens || [];

    const balances = await blockchainService.getUserBalances(
      wallet.address,
      tokenAddresses
    );

    res.json({
      success: true,
      message: 'Balances retrieved',
      data: {
        address: wallet.address,
        ...balances
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/swap/admin/pause
 * Pause swaps (admin only)
 */
router.post('/admin/pause', async (req: Request<{}, ApiResponse, AdminRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { privateKey } = req.body;

    if (!privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Required: privateKey'
      });
    }

    const result = await blockchainService.pauseSwaps(privateKey);

    res.json({
      success: true,
      message: 'Swaps paused successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/swap/admin/unpause
 * Unpause swaps (admin only)
 */
router.post('/admin/unpause', async (req: Request<{}, ApiResponse, AdminRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { privateKey } = req.body;

    if (!privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Required: privateKey'
      });
    }

    const result = await blockchainService.unpauseSwaps(privateKey);

    res.json({
      success: true,
      message: 'Swaps unpaused successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/swap/admin/status
 * Get swap router status (paused state and admin)
 */
router.get('/admin/status', async (_req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const paused = await blockchainService.isSwapsPaused();
    const admin = await blockchainService.getSwapAdmin();

    res.json({
      success: true,
      data: {
        paused,
        admin
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/swap/admin/transfer
 * Transfer swap router admin role (admin only)
 */
router.post('/admin/transfer', async (req: Request<{}, ApiResponse, AdminRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { newAdmin, privateKey } = req.body;

    if (!newAdmin || !privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Required: newAdmin, privateKey'
      });
    }

    const result = await blockchainService.transferSwapAdmin(privateKey, newAdmin);

    res.json({
      success: true,
      message: 'Swap admin transferred successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

export default router;
