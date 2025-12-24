const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');

const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
  "function totalSupply() external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

/**
 * GET /api/tokens/:address
 * Get token information
 */
router.get('/:address', async (req, res, next) => {
  try {
    const { address } = req.params;

    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ADDRESS',
          message: 'Invalid token address'
        }
      });
    }

    const token = new ethers.Contract(address, ERC20_ABI, provider);

    const [name, symbol, decimals, totalSupply] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply()
    ]);

    res.json({
      success: true,
      data: {
        address,
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: totalSupply.toString()
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tokens/:address/balance/:account
 * Get token balance for an account
 */
router.get('/:address/balance/:account', async (req, res, next) => {
  try {
    const { address, account } = req.params;

    if (!ethers.isAddress(address) || !ethers.isAddress(account)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ADDRESS',
          message: 'Invalid address'
        }
      });
    }

    const token = new ethers.Contract(address, ERC20_ABI, provider);
    const [balance, decimals, symbol] = await Promise.all([
      token.balanceOf(account),
      token.decimals(),
      token.symbol()
    ]);

    res.json({
      success: true,
      data: {
        token: address,
        account,
        balance: balance.toString(),
        balanceFormatted: ethers.formatUnits(balance, decimals),
        decimals: Number(decimals),
        symbol
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tokens/:address/allowance/:owner/:spender
 * Get token allowance
 */
router.get('/:address/allowance/:owner/:spender', async (req, res, next) => {
  try {
    const { address, owner, spender } = req.params;

    if (!ethers.isAddress(address) || !ethers.isAddress(owner) || !ethers.isAddress(spender)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ADDRESS',
          message: 'Invalid address'
        }
      });
    }

    const token = new ethers.Contract(address, ERC20_ABI, provider);
    const [allowance, decimals, symbol] = await Promise.all([
      token.allowance(owner, spender),
      token.decimals(),
      token.symbol()
    ]);

    res.json({
      success: true,
      data: {
        token: address,
        owner,
        spender,
        allowance: allowance.toString(),
        allowanceFormatted: ethers.formatUnits(allowance, decimals),
        isUnlimited: allowance === ethers.MaxUint256,
        decimals: Number(decimals),
        symbol
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tokens/:address/approve
 * Approve token spending
 */
router.post('/:address/approve', async (req, res, next) => {
  try {
    const { address } = req.params;
    const { spender, amount } = req.body;

    if (!ethers.isAddress(address) || !ethers.isAddress(spender)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ADDRESS',
          message: 'Invalid address'
        }
      });
    }

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Amount is required'
        }
      });
    }

    const token = new ethers.Contract(address, ERC20_ABI, signer);
    const tx = await token.approve(spender, amount);
    const receipt = await tx.wait();

    res.json({
      success: true,
      data: {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        token: address,
        spender,
        amount: amount.toString()
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
