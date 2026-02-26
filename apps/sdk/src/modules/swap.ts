/**
 * Swap Module - Token swap operations
 */

import { ethers } from 'ethers';
import { ERC20_ABI, STATE_VIEW_ABI, SWAP_ROUTER_ABI } from '../abi';
import {
  FEE_MEDIUM,
  FEE_TICK_SPACING,
  MIN_PRICE_LIMIT,
  MAX_PRICE_LIMIT,
} from '../constants';
import type {
  PoolKey,
  SwapQuote,
  SwapResult,
  StateViewContract,
  SwapRouterContract,
} from '../types';

export class SwapModule {
  private provider: ethers.JsonRpcProvider;
  private stateView: StateViewContract | null = null;
  private swapRouter: SwapRouterContract | null = null;
  private swapRouterAddress: string = '';

  constructor(provider: ethers.JsonRpcProvider) {
    this.provider = provider;
  }

  /**
   * Initialize swap module
   */
  initialize(stateViewAddress: string, swapRouterAddress: string): void {
    this.stateView = new ethers.Contract(stateViewAddress, STATE_VIEW_ABI, this.provider);
    this.swapRouter = new ethers.Contract(swapRouterAddress, SWAP_ROUTER_ABI, this.provider);
    this.swapRouterAddress = swapRouterAddress;
  }

  /**
   * Sort tokens
   */
  private sortTokens(token0: string, token1: string): [string, string] {
    return token0.toLowerCase() < token1.toLowerCase()
      ? [token0, token1]
      : [token1, token0];
  }

  /**
   * Get tick spacing for fee
   */
  private getTickSpacing(fee: number): number {
    return FEE_TICK_SPACING[fee] || 60;
  }

  /**
   * Create pool key
   */
  private createPoolKey(token0: string, token1: string, fee: number = FEE_MEDIUM): PoolKey {
    const [c0, c1] = this.sortTokens(token0, token1);
    return {
      currency0: c0,
      currency1: c1,
      fee,
      tickSpacing: this.getTickSpacing(fee),
      hooks: ethers.ZeroAddress,
    };
  }

  /**
   * Calculate pool ID
   */
  private calculatePoolId(poolKey: PoolKey): string {
    return ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint24', 'int24', 'address'],
        [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
      )
    );
  }

  /**
   * Get swap quote (without executing)
   */
  async getQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: number | string,
    fee: number = FEE_MEDIUM
  ): Promise<SwapQuote> {
    if (!this.stateView) {
      throw new Error('Swap module not initialized. Call initialize() first.');
    }

    const poolKey = this.createPoolKey(tokenIn, tokenOut, fee);
    const poolId = this.calculatePoolId(poolKey);

    const [slot0, liquidity] = await Promise.all([
      this.stateView.getSlot0(poolId),
      this.stateView.getLiquidity(poolId),
    ]);

    const sqrtPriceX96 = BigInt(slot0[0]);
    const liquidityBN = BigInt(liquidity);

    if (liquidityBN === 0n) {
      throw new Error('Pool has no liquidity');
    }

    // Calculate price from sqrtPriceX96
    const Q96 = BigInt(2) ** BigInt(96);
    const priceX192 = sqrtPriceX96 * sqrtPriceX96;
    const price = Number(priceX192) / Number(Q96 * Q96);

    // Determine swap direction
    const zeroForOne = tokenIn.toLowerCase() === poolKey.currency0.toLowerCase();

    const amountInNum = parseFloat(amountIn.toString());
    let estimatedAmountOut: number;

    if (zeroForOne) {
      estimatedAmountOut = amountInNum * price;
    } else {
      estimatedAmountOut = amountInNum / price;
    }

    // Apply fee
    const feePercent = poolKey.fee / 1000000;
    estimatedAmountOut = estimatedAmountOut * (1 - feePercent);

    // Calculate price impact
    const liquidityNum = Number(ethers.formatEther(liquidity));
    const priceImpact = (amountInNum / liquidityNum) * 100;

    return {
      tokenIn,
      tokenOut,
      amountIn: amountIn.toString(),
      estimatedAmountOut: estimatedAmountOut.toFixed(18),
      price: zeroForOne ? price : 1 / price,
      priceImpact: priceImpact.toFixed(4) + '%',
      fee: (feePercent * 100).toFixed(2) + '%',
      poolLiquidity: ethers.formatEther(liquidity),
    };
  }

  /**
   * Execute a swap
   */
  async swap(
    wallet: ethers.Wallet,
    tokenIn: string,
    tokenOut: string,
    amountIn: number | string,
    minAmountOut: number | string = 0,
    fee: number = FEE_MEDIUM
  ): Promise<SwapResult> {
    if (!this.swapRouter) {
      throw new Error('Swap module not initialized. Call initialize() first.');
    }

    const poolKey = this.createPoolKey(tokenIn, tokenOut, fee);

    // Load tokens
    const tokenInContract = new ethers.Contract(tokenIn, ERC20_ABI, wallet);
    const tokenOutContract = new ethers.Contract(tokenOut, ERC20_ABI, wallet);

    // Approve swap router
    const amount = ethers.parseEther(amountIn.toString());
    const approveTx = await tokenInContract.approve(this.swapRouterAddress, amount);
    await approveTx.wait();

    // Determine swap direction
    const zeroForOne = tokenIn.toLowerCase() === poolKey.currency0.toLowerCase();

    // Prepare swap params
    const swapParams = {
      zeroForOne,
      amountSpecified: -amount, // Negative = exact input
      sqrtPriceLimitX96: zeroForOne ? MIN_PRICE_LIMIT : MAX_PRICE_LIMIT,
    };

    // Get balance before
    const balanceBefore = await tokenOutContract.balanceOf(wallet.address);

    // Get fresh nonce
    const nonceHex = await this.provider.send('eth_getTransactionCount', [
      wallet.address,
      'latest',
    ]);
    const swapNonce = parseInt(nonceHex, 16);

    // Execute swap
    const swapRouterWithSigner = this.swapRouter.connect(wallet) as SwapRouterContract;
    const tx = await swapRouterWithSigner.swap(poolKey, swapParams, { nonce: swapNonce });
    const receipt = await tx.wait();

    // Get balance after
    const balanceAfter = await tokenOutContract.balanceOf(wallet.address);
    const actualAmountOut = balanceAfter - balanceBefore;
    const actualAmountOutFormatted = ethers.formatEther(actualAmountOut);

    // Check slippage
    const minOut = parseFloat(minAmountOut.toString());
    if (minOut > 0 && parseFloat(actualAmountOutFormatted) < minOut) {
      throw new Error(
        `Slippage exceeded: got ${actualAmountOutFormatted}, expected minimum ${minAmountOut}`
      );
    }

    return {
      txHash: tx.hash,
      poolKey,
      amountIn: amountIn.toString(),
      amountOut: actualAmountOutFormatted,
      minAmountOut: minAmountOut.toString(),
      zeroForOne,
      gasUsed: receipt.gasUsed.toString(),
      userAddress: wallet.address,
    };
  }

  /**
   * Check if swaps are paused
   */
  async isPaused(): Promise<boolean> {
    if (!this.swapRouter) {
      throw new Error('Swap module not initialized. Call initialize() first.');
    }
    return this.swapRouter.paused();
  }

  /**
   * Pause swaps (admin only)
   */
  async pause(adminWallet: ethers.Wallet): Promise<{ txHash: string; gasUsed: string }> {
    if (!this.swapRouter) {
      throw new Error('Swap module not initialized. Call initialize() first.');
    }

    const swapRouterWithSigner = this.swapRouter.connect(adminWallet) as SwapRouterContract;
    const tx = await swapRouterWithSigner.pause();
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Unpause swaps (admin only)
   */
  async unpause(adminWallet: ethers.Wallet): Promise<{ txHash: string; gasUsed: string }> {
    if (!this.swapRouter) {
      throw new Error('Swap module not initialized. Call initialize() first.');
    }

    const swapRouterWithSigner = this.swapRouter.connect(adminWallet) as SwapRouterContract;
    const tx = await swapRouterWithSigner.unpause();
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Get swap router admin
   */
  async getAdmin(): Promise<string> {
    if (!this.swapRouter) {
      throw new Error('Swap module not initialized. Call initialize() first.');
    }
    return this.swapRouter.admin();
  }

  /**
   * Transfer swap router admin (admin only)
   */
  async transferAdmin(
    adminWallet: ethers.Wallet,
    newAdmin: string
  ): Promise<{ txHash: string; oldAdmin: string; newAdmin: string; gasUsed: string }> {
    if (!this.swapRouter) {
      throw new Error('Swap module not initialized. Call initialize() first.');
    }

    const oldAdmin = await this.swapRouter.admin();
    const swapRouterWithSigner = this.swapRouter.connect(adminWallet) as SwapRouterContract;
    const tx = await swapRouterWithSigner.setAdmin(newAdmin);
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      oldAdmin,
      newAdmin,
      gasUsed: receipt.gasUsed.toString(),
    };
  }
}
