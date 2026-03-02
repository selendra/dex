/**
 * Protocol Fees Module - Protocol fee management
 */

import { ethers } from 'ethers';
import { POOL_MANAGER_ABI, STATE_VIEW_ABI } from '../abi';
import { FEE_MEDIUM, FEE_TICK_SPACING } from '../constants';
import type {
  PoolKey,
  ProtocolFeeInfo,
  ProtocolFeesAccrued,
  CollectProtocolFeesResult,
  PoolManagerContract,
  StateViewContract,
} from '../types';

export class ProtocolFeesModule {
  private provider: ethers.JsonRpcProvider;
  private poolManager: PoolManagerContract | null = null;
  private stateView: StateViewContract | null = null;

  constructor(provider: ethers.JsonRpcProvider) {
    this.provider = provider;
  }

  /**
   * Initialize protocol fees module
   */
  initialize(poolManagerAddress: string, stateViewAddress: string): void {
    this.poolManager = new ethers.Contract(
      poolManagerAddress,
      POOL_MANAGER_ABI,
      this.provider
    );
    this.stateView = new ethers.Contract(stateViewAddress, STATE_VIEW_ABI, this.provider);
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
   * Check if module is initialized
   */
  private ensureInitialized(): void {
    if (!this.poolManager || !this.stateView) {
      throw new Error('Protocol fees module not initialized. Call initialize() first.');
    }
  }

  /**
   * Get protocol fee controller address
   */
  async getController(): Promise<{ protocolFeeController: string; poolManagerOwner: string }> {
    this.ensureInitialized();

    const [controller, owner] = await Promise.all([
      this.poolManager!.protocolFeeController(),
      this.poolManager!.owner(),
    ]);

    return {
      protocolFeeController: controller,
      poolManagerOwner: owner,
    };
  }

  /**
   * Get accrued protocol fees for a token
   */
  async getFeesAccrued(tokenAddress: string): Promise<ProtocolFeesAccrued> {
    this.ensureInitialized();

    const fees = await this.poolManager!.protocolFeesAccrued(tokenAddress);

    return {
      tokenAddress,
      feesAccrued: fees.toString(),
      feesFormatted: ethers.formatUnits(fees, 18),
    };
  }

  /**
   * Get protocol fee info for a pool
   */
  async getPoolProtocolFee(
    token0: string,
    token1: string,
    fee: number = FEE_MEDIUM
  ): Promise<ProtocolFeeInfo> {
    this.ensureInitialized();

    const poolKey = this.createPoolKey(token0, token1, fee);
    const poolId = this.calculatePoolId(poolKey);
    const [sortedToken0, sortedToken1] = this.sortTokens(token0, token1);

    const [sqrtPriceX96, tick, protocolFee, lpFee] = await this.stateView!.getSlot0(poolId);

    return {
      token0: sortedToken0,
      token1: sortedToken1,
      fee,
      tickSpacing: poolKey.tickSpacing,
      poolId,
      sqrtPriceX96: sqrtPriceX96.toString(),
      tick: tick.toString(),
      protocolFee: protocolFee.toString(),
      lpFee: lpFee.toString(),
      protocolFeeZeroForOne: (Number(protocolFee) & 0xfff).toString(),
      protocolFeeOneForZero: ((Number(protocolFee) >> 12) & 0xfff).toString(),
      lpFeePercent: (Number(lpFee) / 10000).toFixed(4) + '%',
    };
  }

  /**
   * Set protocol fee controller (only PoolManager owner)
   */
  async setController(
    ownerWallet: ethers.Wallet,
    controllerAddress: string
  ): Promise<{ txHash: string; newController: string; gasUsed: string }> {
    this.ensureInitialized();

    const poolManagerWithSigner = this.poolManager!.connect(ownerWallet) as PoolManagerContract;
    const tx = await poolManagerWithSigner.setProtocolFeeController(controllerAddress);
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      newController: controllerAddress,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Set protocol fee for a specific pool (only protocol fee controller)
   */
  async setProtocolFee(
    controllerWallet: ethers.Wallet,
    token0: string,
    token1: string,
    fee: number,
    protocolFee: number | { zeroForOne: number; oneForZero: number }
  ): Promise<{
    txHash: string;
    poolKey: PoolKey;
    zeroForOneFee: number;
    oneForZeroFee: number;
    gasUsed: string;
  }> {
    this.ensureInitialized();

    const poolKey = this.createPoolKey(token0, token1, fee);

    // Encode protocol fee
    let encodedFee: number;
    if (typeof protocolFee === 'object') {
      const zeroForOneFee = Math.min(protocolFee.zeroForOne || 0, 1000);
      const oneForZeroFee = Math.min(protocolFee.oneForZero || 0, 1000);
      encodedFee = zeroForOneFee | (oneForZeroFee << 12);
    } else {
      const feeValue = Math.min(protocolFee, 1000);
      encodedFee = feeValue | (feeValue << 12);
    }

    const poolManagerWithSigner = this.poolManager!.connect(controllerWallet) as PoolManagerContract;
    const tx = await poolManagerWithSigner.setProtocolFee(poolKey, encodedFee);
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      poolKey,
      zeroForOneFee: encodedFee & 0xfff,
      oneForZeroFee: (encodedFee >> 12) & 0xfff,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Collect accrued protocol fees (only protocol fee controller)
   */
  async collectFees(
    controllerWallet: ethers.Wallet,
    recipient: string,
    tokenAddress: string,
    amount: string = '0'
  ): Promise<CollectProtocolFeesResult> {
    this.ensureInitialized();

    const accruedBefore = await this.poolManager!.protocolFeesAccrued(tokenAddress);
    const amountToCollect = amount === '0' ? 0 : ethers.parseUnits(amount, 18);

    const poolManagerWithSigner = this.poolManager!.connect(controllerWallet) as PoolManagerContract;
    const tx = await poolManagerWithSigner.collectProtocolFees(
      recipient,
      tokenAddress,
      amountToCollect
    );
    const receipt = await tx.wait();

    const accruedAfter = await this.poolManager!.protocolFeesAccrued(tokenAddress);

    return {
      txHash: tx.hash,
      recipient,
      tokenAddress,
      amountCollected: ethers.formatUnits(BigInt(accruedBefore) - BigInt(accruedAfter), 18),
      remainingFees: ethers.formatUnits(accruedAfter, 18),
      gasUsed: receipt.gasUsed.toString(),
    };
  }
}
