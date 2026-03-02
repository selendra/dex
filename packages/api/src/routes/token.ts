import { Router, Request, Response, NextFunction } from 'express';
import blockchainService from '../services/blockchain';
import { ApiResponse, TokenTransferRequest, TokenApproveRequest } from '../types';

const router = Router();

interface TokenAddressParams {
  tokenAddress: string;
}

interface TokenBalanceParams {
  tokenAddress: string;
  accountAddress: string;
}

interface AllowanceParams {
  tokenAddress: string;
  ownerAddress: string;
  spenderAddress: string;
}

interface TransferFromRequest {
  tokenAddress: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  privateKey: string;
}

interface BurnRequest {
  tokenAddress: string;
  amount: string;
  privateKey: string;
}

interface BurnFromRequest {
  tokenAddress: string;
  fromAddress: string;
  amount: string;
  privateKey: string;
}

interface MintRequest {
  tokenAddress: string;
  toAddress: string;
  amount: string;
  privateKey: string;
}

interface BalancesRequest {
  privateKey?: string;
  accountAddress?: string;
  tokens?: string[];
}

/**
 * GET /api/token/:tokenAddress/info
 * Get token metadata (name, symbol, decimals, totalSupply)
 */
router.get('/:tokenAddress/info', async (req: Request<TokenAddressParams>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { tokenAddress } = req.params;

    const info = await blockchainService.getTokenInfo(tokenAddress);

    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/token/:tokenAddress/balance/:accountAddress
 * Get token balance for a specific account
 */
router.get('/:tokenAddress/balance/:accountAddress', async (req: Request<TokenBalanceParams>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { tokenAddress, accountAddress } = req.params;

    const balance = await blockchainService.getTokenBalance(tokenAddress, accountAddress);

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
 * GET /api/token/:tokenAddress/allowance/:ownerAddress/:spenderAddress
 * Get token allowance
 */
router.get('/:tokenAddress/allowance/:ownerAddress/:spenderAddress', async (req: Request<AllowanceParams>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { tokenAddress, ownerAddress, spenderAddress } = req.params;

    const result = await blockchainService.getAllowance(tokenAddress, ownerAddress, spenderAddress);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/token/transfer
 * Transfer tokens to another address
 */
router.post('/transfer', async (req: Request<{}, ApiResponse, TokenTransferRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { tokenAddress, toAddress, amount, privateKey } = req.body;

    if (!tokenAddress || !toAddress || !amount || !privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Required: tokenAddress, toAddress, amount, privateKey'
      });
    }

    const userWallet = blockchainService.createWalletFromPrivateKey(privateKey);

    const result = await blockchainService.transferToken(
      userWallet,
      tokenAddress,
      toAddress,
      parseFloat(amount)
    );

    res.json({
      success: true,
      message: 'Transfer successful',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/token/approve
 * Approve spender to spend tokens
 */
router.post('/approve', async (req: Request<{}, ApiResponse, TokenApproveRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { tokenAddress, spenderAddress, amount, privateKey } = req.body;

    if (!tokenAddress || !spenderAddress || !amount || !privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Required: tokenAddress, spenderAddress, amount, privateKey'
      });
    }

    const userWallet = blockchainService.createWalletFromPrivateKey(privateKey);

    const result = await blockchainService.approveToken(
      userWallet,
      tokenAddress,
      spenderAddress,
      parseFloat(amount)
    );

    res.json({
      success: true,
      message: 'Approval successful',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/token/transferFrom
 * Transfer tokens from another address (requires allowance)
 */
router.post('/transferFrom', async (req: Request<{}, ApiResponse, TransferFromRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { tokenAddress, fromAddress, toAddress, amount, privateKey } = req.body;

    if (!tokenAddress || !fromAddress || !toAddress || !amount || !privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Required: tokenAddress, fromAddress, toAddress, amount, privateKey'
      });
    }

    const userWallet = blockchainService.createWalletFromPrivateKey(privateKey);

    const result = await blockchainService.transferFromToken(
      userWallet,
      tokenAddress,
      fromAddress,
      toAddress,
      parseFloat(amount)
    );

    res.json({
      success: true,
      message: 'TransferFrom successful',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/token/burn
 * Burn tokens from your own balance
 */
router.post('/burn', async (req: Request<{}, ApiResponse, BurnRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { tokenAddress, amount, privateKey } = req.body;

    if (!tokenAddress || !amount || !privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Required: tokenAddress, amount, privateKey'
      });
    }

    const userWallet = blockchainService.createWalletFromPrivateKey(privateKey);

    const result = await blockchainService.burnToken(
      userWallet,
      tokenAddress,
      parseFloat(amount)
    );

    res.json({
      success: true,
      message: 'Tokens burned successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/token/burnFrom
 * Burn tokens from another address (requires allowance)
 */
router.post('/burnFrom', async (req: Request<{}, ApiResponse, BurnFromRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { tokenAddress, fromAddress, amount, privateKey } = req.body;

    if (!tokenAddress || !fromAddress || !amount || !privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Required: tokenAddress, fromAddress, amount, privateKey'
      });
    }

    const userWallet = blockchainService.createWalletFromPrivateKey(privateKey);

    const result = await blockchainService.burnFromToken(
      userWallet,
      tokenAddress,
      fromAddress,
      parseFloat(amount)
    );

    res.json({
      success: true,
      message: 'Tokens burned from address successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/token/mint
 * Mint new tokens (TestToken specific - no access control)
 */
router.post('/mint', async (req: Request<{}, ApiResponse, MintRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { tokenAddress, toAddress, amount, privateKey } = req.body;

    if (!tokenAddress || !toAddress || !amount || !privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Required: tokenAddress, toAddress, amount, privateKey'
      });
    }

    const userWallet = blockchainService.createWalletFromPrivateKey(privateKey);

    const result = await blockchainService.mintToken(
      userWallet,
      tokenAddress,
      toAddress,
      parseFloat(amount)
    );

    res.json({
      success: true,
      message: 'Tokens minted successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/token/balances
 * Get multiple token balances for an address
 */
router.post('/balances', async (req: Request<{}, ApiResponse, BalancesRequest>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { privateKey, accountAddress, tokens } = req.body;

    if (!privateKey && !accountAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Required: privateKey OR accountAddress'
      });
    }

    let address: string;
    if (privateKey) {
      address = blockchainService.getAddressFromPrivateKey(privateKey);
    } else {
      address = accountAddress!;
    }

    const tokenAddresses = tokens || [];
    const balances = await blockchainService.getUserBalances(address, tokenAddresses);

    res.json({
      success: true,
      data: {
        address,
        ...balances
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
