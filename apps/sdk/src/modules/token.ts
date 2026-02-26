/**
 * Token Module - ERC20 token operations
 */

import { ethers } from 'ethers';
import { ERC20_ABI } from '../abi';
import type {
  TokenInfo,
  TokenBalances,
  TransferResult,
  ApproveResult,
  AllowanceResult,
  ERC20Contract,
} from '../types';

export class TokenModule {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet | null = null;
  private tokenCache: Map<string, ERC20Contract> = new Map();

  constructor(provider: ethers.JsonRpcProvider, signer?: ethers.Wallet) {
    this.provider = provider;
    this.signer = signer || null;
  }

  /**
   * Set signer for write operations
   */
  setSigner(signer: ethers.Wallet): void {
    this.signer = signer;
  }

  /**
   * Get token contract instance
   */
  getContract(tokenAddress: string): ERC20Contract {
    if (!this.tokenCache.has(tokenAddress)) {
      const contract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        this.signer || this.provider
      );
      this.tokenCache.set(tokenAddress, contract);
    }
    return this.tokenCache.get(tokenAddress)!;
  }

  /**
   * Get token contract with specific wallet
   */
  getContractWithWallet(tokenAddress: string, wallet: ethers.Wallet): ERC20Contract {
    return new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
  }

  /**
   * Get token metadata
   */
  async getInfo(tokenAddress: string): Promise<TokenInfo> {
    const token = this.getContract(tokenAddress);
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply(),
    ]);

    return {
      address: tokenAddress,
      name,
      symbol,
      decimals: Number(decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
    };
  }

  /**
   * Get token balance for an address
   */
  async getBalance(tokenAddress: string, accountAddress: string): Promise<string> {
    const token = this.getContract(tokenAddress);
    const decimals = await token.decimals();
    const balance = await token.balanceOf(accountAddress);
    return ethers.formatUnits(balance, decimals);
  }

  /**
   * Get native token balance
   */
  async getNativeBalance(accountAddress: string): Promise<string> {
    const balance = await this.provider.getBalance(accountAddress);
    return ethers.formatEther(balance);
  }

  /**
   * Get multiple token balances for an address
   */
  async getUserBalances(accountAddress: string, tokenAddresses: string[]): Promise<TokenBalances> {
    const native = await this.getNativeBalance(accountAddress);
    const tokens: Record<string, string> = {};

    for (const tokenAddr of tokenAddresses) {
      try {
        tokens[tokenAddr] = await this.getBalance(tokenAddr, accountAddress);
      } catch {
        tokens[tokenAddr] = '0';
      }
    }

    return { native, tokens };
  }

  /**
   * Get allowance for a spender
   */
  async getAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string
  ): Promise<AllowanceResult> {
    const token = this.getContract(tokenAddress);
    const decimals = await token.decimals();
    const allowance = await token.allowance(ownerAddress, spenderAddress);

    return {
      tokenAddress,
      owner: ownerAddress,
      spender: spenderAddress,
      allowance: ethers.formatUnits(allowance, decimals),
    };
  }

  /**
   * Transfer tokens
   */
  async transfer(
    wallet: ethers.Wallet,
    tokenAddress: string,
    toAddress: string,
    amount: number | string
  ): Promise<TransferResult> {
    const token = this.getContractWithWallet(tokenAddress, wallet);
    const decimals = await token.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);

    const tx = await token.transfer(toAddress, amountWei);
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      from: wallet.address,
      to: toAddress,
      amount: amount.toString(),
      tokenAddress,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Approve spender to spend tokens
   */
  async approve(
    wallet: ethers.Wallet,
    tokenAddress: string,
    spenderAddress: string,
    amount: number | string
  ): Promise<ApproveResult> {
    const token = this.getContractWithWallet(tokenAddress, wallet);
    const decimals = await token.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);

    const tx = await token.approve(spenderAddress, amountWei);
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      owner: wallet.address,
      spender: spenderAddress,
      amount: amount.toString(),
      tokenAddress,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Transfer tokens from another address (requires allowance)
   */
  async transferFrom(
    wallet: ethers.Wallet,
    tokenAddress: string,
    fromAddress: string,
    toAddress: string,
    amount: number | string
  ): Promise<TransferResult> {
    const token = this.getContractWithWallet(tokenAddress, wallet);
    const decimals = await token.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);

    const tx = await token.transferFrom(fromAddress, toAddress, amountWei);
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      from: fromAddress,
      to: toAddress,
      amount: amount.toString(),
      tokenAddress,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Mint tokens (TestToken specific)
   */
  async mint(
    wallet: ethers.Wallet,
    tokenAddress: string,
    toAddress: string,
    amount: number | string
  ): Promise<TransferResult> {
    const token = this.getContractWithWallet(tokenAddress, wallet);
    const decimals = await token.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);

    const tx = await token.mint(toAddress, amountWei);
    const receipt = await tx.wait();

    const newBalance = await token.balanceOf(toAddress);

    return {
      txHash: tx.hash,
      from: wallet.address,
      to: toAddress,
      amount: amount.toString(),
      tokenAddress,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Burn tokens
   */
  async burn(
    wallet: ethers.Wallet,
    tokenAddress: string,
    amount: number | string
  ): Promise<TransferResult> {
    const token = this.getContractWithWallet(tokenAddress, wallet);
    const decimals = await token.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);

    const tx = await token.burn(amountWei);
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      from: wallet.address,
      to: ethers.ZeroAddress,
      amount: amount.toString(),
      tokenAddress,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Burn tokens from another address (requires allowance)
   */
  async burnFrom(
    wallet: ethers.Wallet,
    tokenAddress: string,
    fromAddress: string,
    amount: number | string
  ): Promise<TransferResult> {
    const token = this.getContractWithWallet(tokenAddress, wallet);
    const decimals = await token.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);

    const tx = await token.burnFrom(fromAddress, amountWei);
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      from: fromAddress,
      to: ethers.ZeroAddress,
      amount: amount.toString(),
      tokenAddress,
      gasUsed: receipt.gasUsed.toString(),
    };
  }
}
