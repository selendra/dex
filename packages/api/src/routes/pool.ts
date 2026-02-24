import { Router, Request, Response, NextFunction } from 'express';
import blockchainService from '../services/blockchain';
import { ApiResponse, PoolInitRequest } from '../types';

const router = Router();

interface TokenParams {
  token0: string;
  token1: string;
}

interface TokenAddressParams {
  tokenAddress: string;
}

interface TokenBalanceParams {
  tokenAddress: string;
  accountAddress: string;
}

interface AccountParams {
  account: string;
}

interface AuthorizeRequest {
  account: string;
  authorized: boolean;
  privateKey: string;
}

interface AdminTransferRequest {
  newAdmin: string;
  privateKey: string;
}

interface PoolListRequest {
  tokens: string[];
}

/**
 * POST /api/pool/initialize
 * Initialize a new pool
 */
router.post('/initialize', async (req: Request<{}, ApiResponse, PoolInitRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { token0, token1, priceRatio, privateKey } = req.body;

    if (!token0 || !token1 || !privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Required: token0, token1, privateKey'
      });
    }

    const userWallet = blockchainService.createWalletFromPrivateKey(privateKey);

    if (priceRatio !== undefined && priceRatio !== null && priceRatio <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid price ratio',
        details: 'Price ratio must be greater than 0'
      });
    }

    const result = await blockchainService.initializePoolWithWallet(
      userWallet,
      token0,
      token1,
      priceRatio ?? null
    );

    res.json({
      success: true,
      message: 'Pool initialized successfully',
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
 * GET /api/pool/:token0/:token1
 * Get pool information
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
 * POST /api/pool/list
 * Get information for multiple pools
 */
router.post('/list', async (req: Request<{}, ApiResponse, PoolListRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { tokens } = req.body;

    if (!tokens || !Array.isArray(tokens) || tokens.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tokens array',
        details: 'Required: Array of at least 2 token addresses'
      });
    }

    const pools = await blockchainService.getAllPoolsInfo(tokens);

    res.json({
      success: true,
      data: {
        pools,
        count: pools.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pool/token/:tokenAddress/balance
 * Get token balance for default signer
 */
router.get('/token/:tokenAddress/balance', async (req: Request<TokenAddressParams>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { tokenAddress } = req.params;

    const balance = await blockchainService.getTokenBalance(tokenAddress, null);

    res.json({
      success: true,
      data: {
        tokenAddress,
        accountAddress: 'default signer',
        balance
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pool/token/:tokenAddress/balance/:accountAddress
 * Get token balance for specific account
 */
router.get('/token/:tokenAddress/balance/:accountAddress', async (req: Request<TokenBalanceParams>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { tokenAddress, accountAddress } = req.params;

    const balance = await blockchainService.getTokenBalance(
      tokenAddress,
      accountAddress
    );

    res.json({
      success: true,
      data: {
        tokenAddress,
        accountAddress,
        balance
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/pool/admin/authorize
 * Authorize an address to initialize pools (admin only)
 */
router.post('/admin/authorize', async (req: Request<{}, ApiResponse, AuthorizeRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { account, authorized, privateKey } = req.body;

    if (!account || authorized === undefined || !privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Required: account, authorized, privateKey'
      });
    }

    const result = await blockchainService.setAuthorizedInitializer(privateKey, account, authorized);

    res.json({
      success: true,
      message: `Address ${authorized ? 'authorized' : 'revoked'} successfully`,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pool/admin/check/:account
 * Check if an address is authorized to initialize pools
 */
router.get('/admin/check/:account', async (req: Request<AccountParams>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { account } = req.params;

    const isAuthorized = await blockchainService.isAuthorizedInitializer(account);
    const admin = await blockchainService.getPoolAdmin();

    res.json({
      success: true,
      data: {
        account,
        isAuthorized,
        isAdmin: account.toLowerCase() === admin.toLowerCase(),
        admin
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/pool/admin/transfer
 * Transfer admin role to a new address (admin only)
 */
router.post('/admin/transfer', async (req: Request<{}, ApiResponse, AdminTransferRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { newAdmin, privateKey } = req.body;

    if (!newAdmin || !privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Required: newAdmin, privateKey'
      });
    }

    const result = await blockchainService.transferPoolAdmin(privateKey, newAdmin);

    res.json({
      success: true,
      message: 'Admin transferred successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

export default router;
