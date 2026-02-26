/**
 * Pool Module - Pool operations
 */

import { ethers } from 'ethers';
import { STATE_VIEW_ABI, LIQUIDITY_MANAGER_ABI, POOL_MANAGER_ABI } from '../abi';
import {
  SQRT_PRICE_1_1,
  FEE_MEDIUM,
  FEE_TICK_SPACING,
} from '../constants';
import type {
  PoolKey,
  PoolInfo,
  PoolInitializeResult,
  StateViewContract,
  LiquidityManagerContract,
  PoolManagerContract,
} from '../types';

export class PoolModule {
  private provider: ethers.JsonRpcProvider;
  private stateView: StateViewContract | null = null;
  private liquidityManager: LiquidityManagerContract | null = null;
  private poolManager: PoolManagerContract | null = null;

  constructor(provider: ethers.JsonRpcProvider) {
    this.provider = provider;
  }

  /**
   * Initialize pool module with contract addresses
   */
  initialize(
    stateViewAddress: string,
    liquidityManagerAddress: string,
    poolManagerAddress?: string
  ): void {
    this.stateView = new ethers.Contract(stateViewAddress, STATE_VIEW_ABI, this.provider);
    this.liquidityManager = new ethers.Contract(
      liquidityManagerAddress,
      LIQUIDITY_MANAGER_ABI,
      this.provider
    );
    if (poolManagerAddress) {
      this.poolManager = new ethers.Contract(
        poolManagerAddress,
        POOL_MANAGER_ABI,
        this.provider
      );
    }
  }

  /**
   * Sort token addresses (lower address first)
   */
  sortTokens(token0: string, token1: string): [string, string] {
    return token0.toLowerCase() < token1.toLowerCase()
      ? [token0, token1]
      : [token1, token0];
  }

  /**
   * Get tick spacing for a fee tier
   */
  getTickSpacing(fee: number): number {
    return FEE_TICK_SPACING[fee] || 60;
  }

  /**
   * Create a pool key
   */
  createPoolKey(token0: string, token1: string, fee: number = FEE_MEDIUM): PoolKey {
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
   * Calculate pool ID from pool key
   */
  calculatePoolId(poolKey: PoolKey): string {
    return ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint24', 'int24', 'address'],
        [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
      )
    );
  }

  /**
   * Convert price ratio to sqrtPriceX96
   */
  priceToSqrtPriceX96(price: number): string {
    const Q96 = BigInt(2) ** BigInt(96);
    const sqrtPrice = Math.sqrt(price);
    const sqrtPriceScaled = BigInt(Math.floor(sqrtPrice * 1e18));
    return ((sqrtPriceScaled * Q96) / BigInt(1e18)).toString();
  }

  /**
   * Convert sqrtPriceX96 to price
   */
  sqrtPriceX96ToPrice(sqrtPriceX96: bigint): number {
    const Q96 = BigInt(2) ** BigInt(96);
    const priceX192 = sqrtPriceX96 * sqrtPriceX96;
    return Number(priceX192) / Number(Q96 * Q96);
  }

  /**
   * Get pool information
   */
  async getInfo(token0: string, token1: string, fee: number = FEE_MEDIUM): Promise<PoolInfo> {
    if (!this.stateView) {
      throw new Error('Pool module not initialized. Call initialize() first.');
    }

    const poolKey = this.createPoolKey(token0, token1, fee);
    const poolId = this.calculatePoolId(poolKey);

    const [slot0, liquidity] = await Promise.all([
      this.stateView.getSlot0(poolId),
      this.stateView.getLiquidity(poolId),
    ]);

    const sqrtPriceX96 = BigInt(slot0[0]);
    const price = this.sqrtPriceX96ToPrice(sqrtPriceX96);

    return {
      poolKey,
      poolId,
      sqrtPriceX96: slot0[0].toString(),
      tick: slot0[1].toString(),
      protocolFee: slot0[2].toString(),
      lpFee: slot0[3].toString(),
      liquidity: liquidity.toString(),
      price,
    };
  }

  /**
   * Get multiple pools info
   */
  async getAllPoolsInfo(tokenAddresses: string[]): Promise<PoolInfo[]> {
    const pools: PoolInfo[] = [];

    for (let i = 0; i < tokenAddresses.length; i++) {
      for (let j = i + 1; j < tokenAddresses.length; j++) {
        try {
          const info = await this.getInfo(tokenAddresses[i], tokenAddresses[j]);
          if (BigInt(info.liquidity) > 0n) {
            pools.push(info);
          }
        } catch {
          // Pool doesn't exist or has no liquidity
          continue;
        }
      }
    }

    return pools;
  }

  /**
   * Initialize a new pool
   */
  async initializePool(
    wallet: ethers.Wallet,
    token0: string,
    token1: string,
    priceRatio: number = 1
  ): Promise<PoolInitializeResult> {
    if (!this.liquidityManager) {
      throw new Error('Pool module not initialized. Call initialize() first.');
    }

    const poolKey = this.createPoolKey(token0, token1);
    const sqrtPriceX96 = priceRatio === 1 ? SQRT_PRICE_1_1 : this.priceToSqrtPriceX96(priceRatio);

    const liquidityManagerWithSigner = this.liquidityManager.connect(wallet) as LiquidityManagerContract;

    try {
      const tx = await liquidityManagerWithSigner.initializePool(poolKey, sqrtPriceX96);
      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error('Pool initialization transaction reverted');
      }

      return {
        poolKey,
        txHash: tx.hash,
        priceRatio,
        sqrtPriceX96,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error: any) {
      if (
        error.message.includes('PoolAlreadyInitialized') ||
        error.message.includes('already initialized') ||
        error.message.includes('ALREADY_INITIALIZED')
      ) {
        throw new Error('Pool has already been initialized. Each pool can only be initialized once.');
      }

      if (error.message.includes('NotAuthorized') || error.message.includes('NotAdmin')) {
        throw new Error(
          'Not authorized to initialize pools. Only admin or authorized addresses can initialize pools.'
        );
      }

      throw error;
    }
  }

  /**
   * Check if address is authorized to initialize pools
   */
  async isAuthorizedInitializer(account: string): Promise<boolean> {
    if (!this.liquidityManager) {
      throw new Error('Pool module not initialized. Call initialize() first.');
    }
    return this.liquidityManager.authorizedInitializers(account);
  }

  /**
   * Get pool admin address
   */
  async getAdmin(): Promise<string> {
    if (!this.liquidityManager) {
      throw new Error('Pool module not initialized. Call initialize() first.');
    }
    return this.liquidityManager.admin();
  }

  /**
   * Set authorized initializer (admin only)
   */
  async setAuthorizedInitializer(
    adminWallet: ethers.Wallet,
    account: string,
    authorized: boolean
  ): Promise<{ txHash: string; gasUsed: string }> {
    if (!this.liquidityManager) {
      throw new Error('Pool module not initialized. Call initialize() first.');
    }

    const liquidityManagerWithSigner = this.liquidityManager.connect(adminWallet) as LiquidityManagerContract;
    const tx = await liquidityManagerWithSigner.setAuthorizedInitializer(account, authorized);
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Transfer admin role (admin only)
   */
  async transferAdmin(
    adminWallet: ethers.Wallet,
    newAdmin: string
  ): Promise<{ txHash: string; oldAdmin: string; newAdmin: string; gasUsed: string }> {
    if (!this.liquidityManager) {
      throw new Error('Pool module not initialized. Call initialize() first.');
    }

    const oldAdmin = await this.liquidityManager.admin();
    const liquidityManagerWithSigner = this.liquidityManager.connect(adminWallet) as LiquidityManagerContract;
    const tx = await liquidityManagerWithSigner.setAdmin(newAdmin);
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      oldAdmin,
      newAdmin,
      gasUsed: receipt.gasUsed.toString(),
    };
  }
}
