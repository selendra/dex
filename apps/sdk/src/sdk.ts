/**
 * DEX SDK - Main SDK class
 *
 * A comprehensive SDK for interacting with the Selendra DEX (Uniswap V4-based)
 */

import { ethers } from 'ethers';
import {
  TokenModule,
  PoolModule,
  LiquidityModule,
  SwapModule,
  OracleModule,
  ProtocolFeesModule,
} from './modules';
import { DEFAULT_RPC_URL, DEFAULT_CHAIN_ID } from './constants';
import type { SDKConfig, UnsignedTransaction, TransactionResult } from './types';

export class DexSDK {
  // Provider and network
  public readonly provider: ethers.JsonRpcProvider;
  public readonly chainId: number;
  private signer: ethers.Wallet | null = null;

  // Modules
  public readonly token: TokenModule;
  public readonly pool: PoolModule;
  public readonly liquidity: LiquidityModule;
  public readonly swap: SwapModule;
  public readonly oracle: OracleModule;
  public readonly protocolFees: ProtocolFeesModule;

  // Contract addresses
  private config: SDKConfig;
  private initialized = false;

  constructor(config: SDKConfig = {}) {
    this.config = config;

    // Setup provider
    const rpcUrl = config.rpcUrl || process.env.SELENDRA_RPC_URL || DEFAULT_RPC_URL;
    this.chainId = config.chainId || parseInt(process.env.SELENDRA_CHAIN_ID || String(DEFAULT_CHAIN_ID));
    this.provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
      staticNetwork: true,
      batchMaxCount: 1,
    });

    // Setup signer if private key provided
    if (config.privateKey) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
    } else if (process.env.PRIVATE_KEY) {
      this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    }

    // Initialize modules
    this.token = new TokenModule(this.provider, this.signer || undefined);
    this.pool = new PoolModule(this.provider);
    this.liquidity = new LiquidityModule(this.provider);
    this.swap = new SwapModule(this.provider);
    this.oracle = new OracleModule(this.provider);
    this.protocolFees = new ProtocolFeesModule(this.provider);
  }

  /**
   * Initialize SDK with contract addresses
   */
  async initialize(): Promise<void> {
    const poolManagerAddr =
      this.config.poolManagerAddress || process.env.SELENDRA_POOL_MANAGER_ADDRESS;
    const stateViewAddr =
      this.config.stateViewAddress || process.env.SELENDRA_STATE_VIEW_ADDRESS;
    const liquidityManagerAddr =
      this.config.liquidityManagerAddress || process.env.SELENDRA_LIQUIDITY_MANAGER_ADDRESS;
    const swapRouterAddr =
      this.config.swapRouterAddress || process.env.SELENDRA_SWAP_ROUTER_ADDRESS;
    const priceOracleAddr =
      this.config.priceOracleAddress || process.env.SELENDRA_PRICE_ORACLE_ADDRESS;

    if (!poolManagerAddr || !stateViewAddr || !liquidityManagerAddr || !swapRouterAddr) {
      throw new Error(
        'Missing required contract addresses. Provide via config or environment variables.'
      );
    }

    // Initialize modules
    this.pool.initialize(stateViewAddr, liquidityManagerAddr, poolManagerAddr);
    this.liquidity.initialize(stateViewAddr, liquidityManagerAddr);
    this.swap.initialize(stateViewAddr, swapRouterAddr);
    this.protocolFees.initialize(poolManagerAddr, stateViewAddr);

    if (priceOracleAddr) {
      this.oracle.initialize(priceOracleAddr);
    }

    this.initialized = true;
  }

  /**
   * Check if SDK is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Create a wallet from private key
   */
  createWallet(privateKey: string): ethers.Wallet {
    const pk = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    return new ethers.Wallet(pk, this.provider);
  }

  /**
   * Get address from private key
   */
  getAddressFromPrivateKey(privateKey: string): string {
    return this.createWallet(privateKey).address;
  }

  /**
   * Get native balance
   */
  async getNativeBalance(address: string): Promise<string> {
    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  /**
   * Get contract addresses
   */
  getContractAddresses(): {
    poolManager?: string;
    stateView?: string;
    liquidityManager?: string;
    swapRouter?: string;
    priceOracle?: string;
  } {
    return {
      poolManager:
        this.config.poolManagerAddress || process.env.SELENDRA_POOL_MANAGER_ADDRESS,
      stateView:
        this.config.stateViewAddress || process.env.SELENDRA_STATE_VIEW_ADDRESS,
      liquidityManager:
        this.config.liquidityManagerAddress || process.env.SELENDRA_LIQUIDITY_MANAGER_ADDRESS,
      swapRouter:
        this.config.swapRouterAddress || process.env.SELENDRA_SWAP_ROUTER_ADDRESS,
      priceOracle:
        this.config.priceOracleAddress || process.env.SELENDRA_PRICE_ORACLE_ADDRESS,
    };
  }

  /**
   * Send signed transaction
   */
  async sendSignedTransaction(signedTx: string): Promise<TransactionResult> {
    const tx = await this.provider.broadcastTransaction(signedTx);
    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error('Transaction failed');
    }

    return {
      hash: receipt.hash,
      block: receipt.blockNumber,
    };
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(
    from: string,
    to: string,
    value: string,
    data: string = '0x'
  ): Promise<string> {
    const gasLimit = await this.provider.estimateGas({
      from,
      to,
      value: ethers.parseEther(value),
      data,
    });
    return gasLimit.toString();
  }

  /**
   * Create unsigned native transfer transaction
   */
  async createNativeTransferTx(
    from: string,
    to: string,
    amount: string
  ): Promise<UnsignedTransaction> {
    const [nonce, feeData, gasLimit] = await Promise.all([
      this.provider.getTransactionCount(from),
      this.provider.getFeeData(),
      this.estimateGas(from, to, amount),
    ]);

    return {
      to,
      value: ethers.parseEther(amount).toString(),
      nonce,
      gasLimit,
      gasPrice: feeData.gasPrice?.toString() || '0',
      chainId: this.chainId,
      data: '0x',
    };
  }

  /**
   * Verify message signature
   */
  verifySignature(message: string, signature: string): string {
    return ethers.verifyMessage(message, signature);
  }

  /**
   * Hash message for signing
   */
  hashMessage(message: string): string {
    return ethers.hashMessage(message);
  }
}

// Export singleton for convenience
let defaultInstance: DexSDK | null = null;

export function getDefaultSDK(): DexSDK {
  if (!defaultInstance) {
    defaultInstance = new DexSDK();
  }
  return defaultInstance;
}

export function createSDK(config: SDKConfig): DexSDK {
  return new DexSDK(config);
}
