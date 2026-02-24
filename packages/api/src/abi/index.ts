/**
 * Custom ABI exports for DEX API
 * These are standalone ABIs that don't require the contracts package
 */

import PoolManagerABI from './PoolManager.json';
import StateViewABI from './StateView.json';
import LiquidityManagerABI from './LiquidityManager.json';
import SwapRouterABI from './SwapRouter.json';
import PriceOracleABI from './PriceOracle.json';

// ERC20 Token ABI - commonly used functions
export const ERC20ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  // TestToken specific functions (optional)
  'function mint(address to, uint256 amount)',
  'function burn(uint256 amount)',
  'function burnFrom(address account, uint256 amount)'
];

export {
  PoolManagerABI,
  StateViewABI,
  LiquidityManagerABI,
  SwapRouterABI,
  PriceOracleABI
};
