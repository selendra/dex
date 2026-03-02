/**
 * Liquidity Module - Liquidity provision operations
 */

import { ethers } from 'ethers';
import { ERC20_ABI, STATE_VIEW_ABI, LIQUIDITY_MANAGER_ABI } from '../abi';
import { MIN_TICK, MAX_TICK, FEE_MEDIUM, FEE_TICK_SPACING } from '../constants';
import type {
  PoolKey,
  AddLiquidityResult,
  RemoveLiquidityResult,
  PositionInfo,
  CollectFeesResult,
  StateViewContract,
  LiquidityManagerContract,
} from '../types';

export class LiquidityModule {
  private provider: ethers.JsonRpcProvider;
  private stateView: StateViewContract | null = null;
  private liquidityManager: LiquidityManagerContract | null = null;
  private liquidityManagerAddress: string = '';

  constructor(provider: ethers.JsonRpcProvider) {
    this.provider = provider;
  }

  /**
   * Initialize liquidity module
   */
  initialize(stateViewAddress: string, liquidityManagerAddress: string): void {
    this.stateView = new ethers.Contract(stateViewAddress, STATE_VIEW_ABI, this.provider);
    this.liquidityManager = new ethers.Contract(
      liquidityManagerAddress,
      LIQUIDITY_MANAGER_ABI,
      this.provider
    );
    this.liquidityManagerAddress = liquidityManagerAddress;
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
   * Add liquidity to a pool
   */
  async addLiquidity(
    wallet: ethers.Wallet,
    token0: string,
    token1: string,
    amount0: number | string,
    amount1: number | string,
    tickLower: number | null = null,
    tickUpper: number | null = null
  ): Promise<AddLiquidityResult> {
    if (!this.liquidityManager) {
      throw new Error('Liquidity module not initialized. Call initialize() first.');
    }

    const poolKey = this.createPoolKey(token0, token1);
    const lmAddr = this.liquidityManagerAddress;

    // Determine which token matches currency0/currency1 after sorting
    const [sortedToken0] = this.sortTokens(token0, token1);

    // Map user-provided amounts to sorted token order
    let sortedAmount0: number | string;
    let sortedAmount1: number | string;
    if (token0.toLowerCase() === sortedToken0.toLowerCase()) {
      sortedAmount0 = amount0;
      sortedAmount1 = amount1;
    } else {
      sortedAmount0 = amount1;
      sortedAmount1 = amount0;
    }

    // Connect tokens to wallet
    const tokenContract0 = new ethers.Contract(poolKey.currency0, ERC20_ABI, wallet);
    const tokenContract1 = new ethers.Contract(poolKey.currency1, ERC20_ABI, wallet);

    // Parse amounts
    const amount0Wei = ethers.parseEther(sortedAmount0.toString());
    const amount1Wei = ethers.parseEther(sortedAmount1.toString());

    // Check balances
    const balance0 = await tokenContract0.balanceOf(wallet.address);
    const balance1 = await tokenContract1.balanceOf(wallet.address);

    if (balance0 < amount0Wei) {
      throw new Error(
        `Insufficient token0 balance. Have: ${ethers.formatEther(balance0)}, Need: ${sortedAmount0}`
      );
    }
    if (balance1 < amount1Wei) {
      throw new Error(
        `Insufficient token1 balance. Have: ${ethers.formatEther(balance1)}, Need: ${sortedAmount1}`
      );
    }

    // Get nonce
    let nonce = await this.provider.getTransactionCount(wallet.address, 'pending');

    // Transfer tokens to liquidity manager
    const tx0 = await tokenContract0.transfer(lmAddr, amount0Wei, { nonce: nonce++ });
    await tx0.wait();

    const tx1 = await tokenContract1.transfer(lmAddr, amount1Wei, { nonce: nonce++ });
    await tx1.wait();

    // Calculate liquidity delta
    const amount0Num = parseFloat(sortedAmount0.toString());
    const amount1Num = parseFloat(sortedAmount1.toString());
    const liquidityAmount = Math.min(amount0Num, amount1Num);
    const liquidityDelta = ethers.parseEther(liquidityAmount.toString());

    // Add liquidity
    const liquidityManagerWithSigner = this.liquidityManager.connect(wallet) as LiquidityManagerContract;
    const tx = await liquidityManagerWithSigner.addLiquidity(
      poolKey,
      tickLower ?? MIN_TICK,
      tickUpper ?? MAX_TICK,
      liquidityDelta
    );
    await tx.wait();

    return {
      poolKey,
      txHash: tx.hash,
      liquidityDelta: liquidityDelta.toString(),
      amount0Deposited: sortedAmount0.toString(),
      amount1Deposited: sortedAmount1.toString(),
      fromWallet: wallet.address,
    };
  }

  /**
   * Remove liquidity from a pool
   */
  async removeLiquidity(
    wallet: ethers.Wallet,
    token0: string,
    token1: string,
    liquidityAmount: number | string,
    tickLower: number | null = null,
    tickUpper: number | null = null
  ): Promise<RemoveLiquidityResult> {
    if (!this.liquidityManager) {
      throw new Error('Liquidity module not initialized. Call initialize() first.');
    }

    const poolKey = this.createPoolKey(token0, token1);
    const liquidityDelta = ethers.parseEther(liquidityAmount.toString());

    const liquidityManagerWithSigner = this.liquidityManager.connect(wallet) as LiquidityManagerContract;
    const tx = await liquidityManagerWithSigner.removeLiquidity(
      poolKey,
      tickLower ?? MIN_TICK,
      tickUpper ?? MAX_TICK,
      liquidityDelta
    );
    const receipt = await tx.wait();

    return {
      poolKey,
      txHash: tx.hash,
      liquidityRemoved: liquidityAmount.toString(),
      liquidityDelta: liquidityDelta.toString(),
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Get position info from contract
   */
  async getPosition(
    userAddress: string,
    token0: string,
    token1: string,
    fee: number = FEE_MEDIUM,
    tickLower: number | null = null,
    tickUpper: number | null = null
  ): Promise<{ liquidity: string; tickLower: number; tickUpper: number }> {
    if (!this.liquidityManager) {
      throw new Error('Liquidity module not initialized. Call initialize() first.');
    }

    const poolKey = this.createPoolKey(token0, token1, fee);
    const lower = tickLower ?? MIN_TICK;
    const upper = tickUpper ?? MAX_TICK;

    const position = await this.liquidityManager.getPosition(userAddress, poolKey, lower, upper);

    return {
      liquidity: position.liquidity.toString(),
      tickLower: Number(position.tickLowerRet),
      tickUpper: Number(position.tickUpperRet),
    };
  }

  /**
   * Get LP position info with uncollected fees
   */
  async getPositionInfo(
    token0: string,
    token1: string,
    fee: number = FEE_MEDIUM,
    tickLower: number | null = null,
    tickUpper: number | null = null
  ): Promise<PositionInfo> {
    if (!this.stateView || !this.liquidityManager) {
      throw new Error('Liquidity module not initialized. Call initialize() first.');
    }

    const poolKey = this.createPoolKey(token0, token1, fee);
    const poolId = this.calculatePoolId(poolKey);
    const lower = tickLower ?? MIN_TICK;
    const upper = tickUpper ?? MAX_TICK;

    // Get position info from StateView
    const [liquidity, feeGrowthInside0LastX128, feeGrowthInside1LastX128] =
      await this.stateView.getPositionInfo(
        poolId,
        this.liquidityManagerAddress,
        lower,
        upper,
        ethers.ZeroHash
      );

    // Get current fee growth values
    const [feeGrowthInside0X128, feeGrowthInside1X128] = await this.stateView.getFeeGrowthInside(
      poolId,
      lower,
      upper
    );

    // Calculate uncollected fees
    const Q128 = BigInt(2) ** BigInt(128);
    const feeGrowth0Delta = BigInt(feeGrowthInside0X128) - BigInt(feeGrowthInside0LastX128);
    const feeGrowth1Delta = BigInt(feeGrowthInside1X128) - BigInt(feeGrowthInside1LastX128);

    const fees0Owed = (BigInt(liquidity) * feeGrowth0Delta) / Q128;
    const fees1Owed = (BigInt(liquidity) * feeGrowth1Delta) / Q128;

    const [sortedToken0, sortedToken1] = this.sortTokens(token0, token1);

    return {
      token0: sortedToken0,
      token1: sortedToken1,
      fee,
      tickLower: lower,
      tickUpper: upper,
      poolId,
      positionOwner: this.liquidityManagerAddress,
      liquidity: liquidity.toString(),
      liquidityFormatted: ethers.formatEther(liquidity),
      feeGrowthInside0LastX128: feeGrowthInside0LastX128.toString(),
      feeGrowthInside1LastX128: feeGrowthInside1LastX128.toString(),
      currentFeeGrowth0X128: feeGrowthInside0X128.toString(),
      currentFeeGrowth1X128: feeGrowthInside1X128.toString(),
      fees0Owed: fees0Owed.toString(),
      fees1Owed: fees1Owed.toString(),
      fees0OwedFormatted: ethers.formatEther(fees0Owed),
      fees1OwedFormatted: ethers.formatEther(fees1Owed),
    };
  }

  /**
   * Collect LP fees
   */
  async collectFees(
    wallet: ethers.Wallet,
    token0: string,
    token1: string,
    fee: number = FEE_MEDIUM,
    tickLower: number | null = null,
    tickUpper: number | null = null
  ): Promise<CollectFeesResult> {
    if (!this.liquidityManager) {
      throw new Error('Liquidity module not initialized. Call initialize() first.');
    }

    const poolKey = this.createPoolKey(token0, token1, fee);
    const lower = tickLower ?? MIN_TICK;
    const upper = tickUpper ?? MAX_TICK;

    const liquidityManagerWithSigner = this.liquidityManager.connect(wallet) as LiquidityManagerContract;
    const tx = await liquidityManagerWithSigner.collectFees(poolKey, lower, upper);
    const receipt = await tx.wait();

    // Parse fees from logs
    let fees0Collected = '0';
    let fees1Collected = '0';

    for (const log of receipt.logs) {
      try {
        const parsed = this.liquidityManager.interface.parseLog(log);
        if (parsed && parsed.name === 'FeesCollected') {
          fees0Collected = ethers.formatEther(parsed.args.amount0);
          fees1Collected = ethers.formatEther(parsed.args.amount1);
          break;
        }
      } catch {
        // Skip logs that don't match
      }
    }

    return {
      txHash: tx.hash,
      poolKey,
      tickLower: lower,
      tickUpper: upper,
      fees0Collected,
      fees1Collected,
      gasUsed: receipt.gasUsed.toString(),
      collector: wallet.address,
    };
  }
}
