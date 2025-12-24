const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('./errorHandler');
const { ethers } = require('ethers');

/**
 * Validate Ethereum address
 */
const isEthereumAddress = (value) => {
  if (!ethers.isAddress(value)) {
    throw new Error('Invalid Ethereum address');
  }
  return true;
};

/**
 * Validate BigInt/BigNumber
 */
const isBigInt = (value) => {
  try {
    BigInt(value);
    return true;
  } catch {
    throw new Error('Invalid number format');
  }
};

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
    }));
    
    throw new ValidationError(JSON.stringify(errorMessages));
  }
  
  next();
};

/**
 * Swap validation rules
 */
const validateSwapQuote = [
  body('tokenIn').custom(isEthereumAddress),
  body('tokenOut').custom(isEthereumAddress),
  body('amountIn').custom(isBigInt),
  body('fee').optional().isInt({ min: 100, max: 10000 }),
  handleValidationErrors,
];

const validateSwapExecute = [
  body('tokenIn').custom(isEthereumAddress),
  body('tokenOut').custom(isEthereumAddress),
  body('amountIn').custom(isBigInt),
  body('amountOutMinimum').optional().custom(isBigInt),
  body('recipient').optional().custom(isEthereumAddress),
  body('deadline').optional().isInt(),
  body('fee').optional().isInt({ min: 100, max: 10000 }),
  body('slippageTolerance').optional().isFloat({ min: 0, max: 50 }),
  handleValidationErrors,
];

/**
 * Liquidity validation rules
 */
const validateAddLiquidity = [
  body('currency0').custom(isEthereumAddress),
  body('currency1').custom(isEthereumAddress),
  body('fee').optional().isInt({ min: 100, max: 10000 }),
  body('tickLower').isInt(),
  body('tickUpper').isInt(),
  body('liquidity').custom(isBigInt),
  body('amount0Max').custom(isBigInt),
  body('amount1Max').custom(isBigInt),
  body('recipient').optional().custom(isEthereumAddress),
  body('deadline').optional().isInt(),
  handleValidationErrors,
];

const validateRemoveLiquidity = [
  body('tokenId').isInt(),
  body('liquidityPercentage').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors,
];

/**
 * Pool validation rules
 */
const validatePoolQuery = [
  query('currency0').custom(isEthereumAddress),
  query('currency1').custom(isEthereumAddress),
  query('fee').optional().isInt({ min: 100, max: 10000 }),
  handleValidationErrors,
];

const validateInitializePool = [
  body('currency0').custom(isEthereumAddress),
  body('currency1').custom(isEthereumAddress),
  body('fee').optional().isInt({ min: 100, max: 10000 }),
  body('sqrtPriceX96').custom(isBigInt),
  handleValidationErrors,
];

/**
 * Token validation rules
 */
const validateTokenAddress = [
  param('address').custom(isEthereumAddress),
  handleValidationErrors,
];

const validateTokenBalance = [
  param('address').custom(isEthereumAddress),
  param('owner').custom(isEthereumAddress),
  handleValidationErrors,
];

/**
 * Pagination validation
 */
const validatePagination = [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  handleValidationErrors,
];

module.exports = {
  validateSwapQuote,
  validateSwapExecute,
  validateAddLiquidity,
  validateRemoveLiquidity,
  validatePoolQuery,
  validateInitializePool,
  validateTokenAddress,
  validateTokenBalance,
  validatePagination,
  handleValidationErrors,
};
