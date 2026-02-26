/**
 * Oracle Module - Price oracle operations
 */

import { ethers } from 'ethers';
import { PRICE_ORACLE_ABI } from '../abi';
import type {
  PriceInfo,
  PoolPrice,
  ExternalPrice,
  TWAPInfo,
  FeedPriceResult,
  OracleConfig,
  PriceOracleContract,
} from '../types';

export class OracleModule {
  private provider: ethers.JsonRpcProvider;
  private priceOracle: PriceOracleContract | null = null;

  constructor(provider: ethers.JsonRpcProvider) {
    this.provider = provider;
  }

  /**
   * Initialize oracle module
   */
  initialize(priceOracleAddress: string): void {
    this.priceOracle = new ethers.Contract(
      priceOracleAddress,
      PRICE_ORACLE_ABI,
      this.provider
    );
  }

  /**
   * Check if oracle is initialized
   */
  private ensureInitialized(): void {
    if (!this.priceOracle) {
      throw new Error('Oracle module not initialized. Call initialize() first.');
    }
  }

  /**
   * Get price for a token pair (from pool or external feed)
   */
  async getPrice(token0: string, token1: string): Promise<PriceInfo> {
    this.ensureInitialized();

    const priceInfo = await this.priceOracle!.getPrice(token0, token1);

    return {
      price: ethers.formatUnits(priceInfo[0], 18),
      twap: ethers.formatUnits(priceInfo[1], 18),
      lastUpdate: priceInfo[2].toString(),
      fromPool: priceInfo[3],
      isStale: priceInfo[4],
    };
  }

  /**
   * Get price from on-chain pool only
   */
  async getPoolPrice(token0: string, token1: string): Promise<PoolPrice> {
    this.ensureInitialized();

    const [price, sqrtPriceX96] = await this.priceOracle!.getPoolPrice(token0, token1);

    return {
      price: ethers.formatUnits(price, 18),
      sqrtPriceX96: sqrtPriceX96.toString(),
    };
  }

  /**
   * Get external price feed only
   */
  async getExternalPrice(token0: string, token1: string): Promise<ExternalPrice> {
    this.ensureInitialized();

    const priceData = await this.priceOracle!.getExternalPrice(token0, token1);

    return {
      price: ethers.formatUnits(priceData[0], 18),
      timestamp: priceData[1].toString(),
      isValid: priceData[2],
    };
  }

  /**
   * Get TWAP for a token pair
   */
  async getTWAP(token0: string, token1: string): Promise<TWAPInfo> {
    this.ensureInitialized();

    const twap = await this.priceOracle!.getTWAP(token0, token1);

    return {
      twap: ethers.formatUnits(twap, 18),
    };
  }

  /**
   * Feed price for a token pair (authorized feeder only)
   */
  async feedPrice(
    feederWallet: ethers.Wallet,
    token0: string,
    token1: string,
    price: number | string
  ): Promise<FeedPriceResult> {
    this.ensureInitialized();

    // Convert price to 18 decimals
    let priceWei: bigint;
    const priceStr = price.toString();
    if (priceStr.includes('.')) {
      priceWei = ethers.parseUnits(priceStr, 18);
    } else {
      priceWei = BigInt(priceStr);
    }

    const oracleWithSigner = this.priceOracle!.connect(feederWallet) as PriceOracleContract;
    const tx = await oracleWithSigner.feedPrice(token0, token1, priceWei);
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      token0,
      token1,
      price: priceWei.toString(),
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Feed multiple prices at once (authorized feeder only)
   */
  async feedPricesBatch(
    feederWallet: ethers.Wallet,
    pairs: Array<{ token0: string; token1: string; price: number | string }>
  ): Promise<{ txHash: string; pairsUpdated: number; gasUsed: string }> {
    this.ensureInitialized();

    const token0s = pairs.map((p) => p.token0);
    const token1s = pairs.map((p) => p.token1);
    const prices = pairs.map((p) => {
      const priceStr = p.price.toString();
      if (priceStr.includes('.')) {
        return ethers.parseUnits(priceStr, 18);
      }
      return BigInt(priceStr);
    });

    const oracleWithSigner = this.priceOracle!.connect(feederWallet) as PriceOracleContract;
    const tx = await oracleWithSigner.feedPricesBatch(token0s, token1s, prices);
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      pairsUpdated: pairs.length,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Observe current pool price (updates TWAP)
   */
  async observePoolPrice(
    wallet: ethers.Wallet,
    token0: string,
    token1: string
  ): Promise<{ txHash: string; gasUsed: string }> {
    this.ensureInitialized();

    const oracleWithSigner = this.priceOracle!.connect(wallet) as PriceOracleContract;
    const tx = await oracleWithSigner.observePoolPrice(token0, token1);
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Get observation count for a pair
   */
  async getObservationCount(token0: string, token1: string): Promise<number> {
    this.ensureInitialized();

    const count = await this.priceOracle!.getObservationCount(token0, token1);
    return Number(count);
  }

  /**
   * Check if an address is an authorized price feeder
   */
  async isAuthorizedFeeder(account: string): Promise<boolean> {
    this.ensureInitialized();
    return this.priceOracle!.authorizedFeeders(account);
  }

  /**
   * Set authorized price feeder (admin only)
   */
  async setAuthorizedFeeder(
    adminWallet: ethers.Wallet,
    account: string,
    authorized: boolean
  ): Promise<{ txHash: string; gasUsed: string }> {
    this.ensureInitialized();

    const oracleWithSigner = this.priceOracle!.connect(adminWallet) as PriceOracleContract;
    const tx = await oracleWithSigner.setAuthorizedFeeder(account, authorized);
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Get oracle admin address
   */
  async getAdmin(): Promise<string> {
    this.ensureInitialized();
    return this.priceOracle!.admin();
  }

  /**
   * Transfer oracle admin role
   */
  async transferAdmin(
    adminWallet: ethers.Wallet,
    newAdmin: string
  ): Promise<{ txHash: string; oldAdmin: string; newAdmin: string; gasUsed: string }> {
    this.ensureInitialized();

    const oldAdmin = await this.priceOracle!.admin();
    const oracleWithSigner = this.priceOracle!.connect(adminWallet) as PriceOracleContract;
    const tx = await oracleWithSigner.setAdmin(newAdmin);
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      oldAdmin,
      newAdmin,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Get oracle configuration
   */
  async getConfig(): Promise<OracleConfig> {
    this.ensureInitialized();

    const [defaultFee, defaultTickSpacing, maxPriceAge, twapWindow, admin] = await Promise.all([
      this.priceOracle!.defaultFee(),
      this.priceOracle!.defaultTickSpacing(),
      this.priceOracle!.MAX_PRICE_AGE(),
      this.priceOracle!.TWAP_WINDOW(),
      this.priceOracle!.admin(),
    ]);

    return {
      defaultFee: defaultFee.toString(),
      defaultTickSpacing: defaultTickSpacing.toString(),
      maxPriceAge: maxPriceAge.toString(),
      twapWindow: twapWindow.toString(),
      admin,
    };
  }

  /**
   * Set default fee for pool lookups (admin only)
   */
  async setDefaultFee(
    adminWallet: ethers.Wallet,
    fee: number
  ): Promise<{ txHash: string; gasUsed: string }> {
    this.ensureInitialized();

    const oracleWithSigner = this.priceOracle!.connect(adminWallet) as PriceOracleContract;
    const tx = await oracleWithSigner.setDefaultFee(fee);
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Set default tick spacing for pool lookups (admin only)
   */
  async setDefaultTickSpacing(
    adminWallet: ethers.Wallet,
    tickSpacing: number
  ): Promise<{ txHash: string; gasUsed: string }> {
    this.ensureInitialized();

    const oracleWithSigner = this.priceOracle!.connect(adminWallet) as PriceOracleContract;
    const tx = await oracleWithSigner.setDefaultTickSpacing(tickSpacing);
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Invalidate external price feed (admin/authorized only)
   */
  async invalidatePrice(
    feederWallet: ethers.Wallet,
    token0: string,
    token1: string
  ): Promise<{ txHash: string; gasUsed: string }> {
    this.ensureInitialized();

    const oracleWithSigner = this.priceOracle!.connect(feederWallet) as PriceOracleContract;
    const tx = await oracleWithSigner.invalidatePrice(token0, token1);
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      gasUsed: receipt.gasUsed.toString(),
    };
  }
}
